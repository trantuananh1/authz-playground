import { create } from "zustand"
import { toast } from "sonner"
import {
  compile,
  detectFormat,
  parsePolicy,
  printPolicy,
  type CheckInput,
  type Compiled,
  type PolicyFile,
  type PolicyFormat,
} from "@/lib/policy"
import { applyMutation, describeMutation, type Mutation } from "@/lib/policy/edits"
import { sharedFromHash } from "@/lib/share"
import { DEFAULT_SAMPLE, SAMPLES } from "@/samples"

export type PanelTab = "check" | "tests" | "data" | "matrix" | "problems"
export type GraphTab = "policy" | "data"
export type EditorView = "text" | "matrix"
export type MatrixLayout = "resource" | "overview"
export type Page = "playground" | "docs"
export type Theme = "dark" | "light"

export interface CheckForm {
  user: string
  action: string
  resource: string
  tenant: string
  context: string
}

interface State {
  sampleId: string | null
  fileName: string
  format: PolicyFormat
  text: string
  compiled: Compiled
  /** last text that parsed, so panels stay usable while the editor has a syntax error */
  file: PolicyFile
  panelTab: PanelTab
  graphTab: GraphTab
  editorView: EditorView
  matrixLayout: MatrixLayout
  page: Page
  check: CheckForm
  theme: Theme
  focus: { from: number; to: number; nonce: number } | null

  setText: (text: string) => void
  loadSample: (id: string) => void
  loadText: (text: string, fileName: string, format?: PolicyFormat) => void
  convert: (format: PolicyFormat) => void
  mutate: (m: Mutation) => boolean
  /** edits made through panels and the matrix; typing in the editor has its own undo */
  past: Snapshot[]
  future: Snapshot[]
  undo: () => void
  redo: () => void
  setPanelTab: (t: PanelTab) => void
  setGraphTab: (t: GraphTab) => void
  setEditorView: (v: EditorView) => void
  setMatrixLayout: (l: MatrixLayout) => void
  setPage: (p: Page) => void
  setCheck: (c: Partial<CheckForm>) => void
  runCheck: (c: CheckInput) => void
  toggleTheme: () => void
  focusRange: (from: number, to: number) => void
}

export interface Snapshot {
  label: string
  /** text before and after the edit, so an undo only applies while the text is unchanged since */
  before: string
  after: string
  format: PolicyFormat
}

const HISTORY_LIMIT = 50
const REMOVALS = new Set<Mutation["op"]>(["removeUser", "removeInstance", "removeAssignment", "removeTuple", "removeTest"])

const STORAGE_KEY = "vauthz-playground:v1"
const empty: PolicyFile = {
  schema: { tenants: [], resources: [], roles: [], condition_sets: [], condition_set_rules: [] },
  data: { users: [], resource_instances: [], relationship_tuples: [] },
  tests: [],
}

const sampleFileName = (id: string, format: PolicyFormat) => `${id}.${format === "json" ? "json" : "dsl"}`

function initial(): Pick<State, "sampleId" | "fileName" | "format" | "text"> {
  const params = new URLSearchParams(location.search)
  const shared = sharedFromHash()
  if (shared) return { sampleId: null, fileName: shared.n?.replace(/\.permit$/i, ".dsl") ?? "shared.dsl", format: shared.f, text: shared.t }
  const storeId = params.get("store")
  const sample = SAMPLES.find((s) => s.id === storeId)
  if (sample) return { sampleId: sample.id, fileName: sampleFileName(sample.id, sample.format), format: sample.format, text: sample.source }
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")
    // files saved before the switch to .dsl
    if (saved?.text) return { ...saved, fileName: String(saved.fileName ?? "policy.dsl").replace(/\.permit$/i, ".dsl") }
  } catch {
    /* ignore corrupt storage */
  }
  const def = SAMPLES.find((s) => s.id === DEFAULT_SAMPLE)!
  return { sampleId: def.id, fileName: sampleFileName(def.id, def.format), format: def.format, text: def.source }
}

function withCompiled(text: string, format: PolicyFormat, prev: PolicyFile) {
  const compiled = compile(text, format)
  return { text, format, compiled, file: compiled.file ?? prev }
}

function defaultCheck(file: PolicyFile): CheckForm {
  const t = file.tests[0]
  if (t) return { user: t.user, action: t.action, resource: t.resource, tenant: t.tenant ?? "", context: "" }
  const res = file.schema.resources[0]
  const inst = file.data.resource_instances.find((i) => i.resource === res?.key)
  return {
    user: file.data.users[0]?.key ?? "",
    action: Object.keys(res?.actions ?? {})[0] ?? "",
    resource: inst ? `${inst.resource}:${inst.key}` : (res?.key ?? ""),
    tenant: "",
    context: "",
  }
}

function syncUrl(sampleId: string | null) {
  const url = new URL(location.href)
  url.hash = ""
  if (sampleId) url.searchParams.set("store", sampleId)
  else url.searchParams.delete("store")
  history.replaceState(null, "", url)
}

const init = initial()
const initCompiled = withCompiled(init.text, init.format, empty)

export const useStore = create<State>((set, get) => ({
  ...init,
  ...initCompiled,
  panelTab: "check",
  graphTab: "policy",
  editorView: "text",
  matrixLayout: "resource",
  page: new URLSearchParams(location.search).get("page") === "docs" ? "docs" : "playground",
  check: defaultCheck(initCompiled.file),
  theme: (localStorage.getItem(`${STORAGE_KEY}:theme`) as Theme) || "dark",
  focus: null,

  setText: (text) => set((s) => ({ ...withCompiled(text, s.format, s.file) })),

  loadSample: (id) => {
    const sample = SAMPLES.find((s) => s.id === id)
    if (!sample) return
    const next = withCompiled(sample.source, sample.format, empty)
    set({
      sampleId: id,
      fileName: sampleFileName(id, sample.format),
      ...next,
      past: [],
      future: [],
      check: defaultCheck(next.file),
    })
    syncUrl(id)
  },

  loadText: (text, fileName, format) => {
    const f = format ?? detectFormat(text, fileName)
    const next = withCompiled(text, f, empty)
    set({ sampleId: null, fileName, ...next, check: defaultCheck(next.file), past: [], future: [] })
    syncUrl(null)
    const errors = next.compiled.diagnostics.filter((d) => d.severity === "error").length
    if (errors) toast.error(`Loaded ${fileName} with ${errors} error${errors > 1 ? "s" : ""}`)
    else toast.success(`Loaded ${fileName} as ${f.toUpperCase()}`)
  },

  convert: (format) => {
    const s = get()
    if (format === s.format) return
    let file: PolicyFile
    try {
      file = parsePolicy(s.text, s.format)
    } catch {
      toast.error("Fix the syntax errors before converting")
      return
    }
    const text = printPolicy(file, format)
    const fileName = s.fileName.replace(/\.(json|permit|dsl|txt)$/i, "") + (format === "json" ? ".json" : ".dsl")
    set({ fileName, ...withCompiled(text, format, s.file), past: [], future: [] })
    if (s.format === "dsl" && /\/\//.test(s.text))
      toast.message("Converted to JSON", { description: "JSON has no comments, so DSL comments were dropped." })
  },

  mutate: (m) => {
    const s = get()
    let text: string
    try {
      text = applyMutation(s.text, s.format, m)
    } catch {
      toast.error("Fix the syntax errors in the editor first")
      return false
    }
    if (text === s.text) return true
    const label = describeMutation(m)
    set({
      ...withCompiled(text, s.format, s.file),
      past: [...s.past, { label, before: s.text, after: text, format: s.format }].slice(-HISTORY_LIMIT),
      future: [],
    })
    // a deletion is the easiest thing to regret, so offer the undo right where it happened
    if (REMOVALS.has(m.op)) toast(label, { action: { label: "Undo", onClick: () => get().undo() } })
    return true
  },

  past: [],
  future: [],

  undo: () => {
    const s = get()
    const last = s.past.at(-1)
    if (!last) return
    if (last.after !== s.text || last.format !== s.format) {
      toast.error("The policy changed since that edit, so it can't be undone here", { description: "Use undo inside the editor instead." })
      set({ past: [], future: [] })
      return
    }
    set({ ...withCompiled(last.before, s.format, s.file), past: s.past.slice(0, -1), future: [...s.future, last] })
    toast.success(`Undone: ${last.label}`)
  },

  redo: () => {
    const s = get()
    const next = s.future.at(-1)
    if (!next) return
    if (next.before !== s.text || next.format !== s.format) {
      set({ future: [] })
      return
    }
    set({ ...withCompiled(next.after, s.format, s.file), future: s.future.slice(0, -1), past: [...s.past, next] })
    toast.success(`Redone: ${next.label}`)
  },

  setPanelTab: (panelTab) => set({ panelTab }),
  setGraphTab: (graphTab) => set({ graphTab }),
  setEditorView: (editorView) => set({ editorView }),
  setMatrixLayout: (matrixLayout) => set({ matrixLayout }),
  setPage: (page) => {
    const url = new URL(location.href)
    if (page === "docs") url.searchParams.set("page", "docs")
    else url.searchParams.delete("page")
    history.replaceState(null, "", url)
    set({ page })
  },
  setCheck: (c) => set((s) => ({ check: { ...s.check, ...c } })),
  runCheck: (c) =>
    set(() => ({
      panelTab: "check",
      check: {
        user: c.user,
        action: c.action,
        resource: c.resource,
        tenant: c.tenant ?? "",
        context: c.context && Object.keys(c.context).length ? JSON.stringify(c.context, null, 2) : "",
      },
    })),
  toggleTheme: () =>
    set((s) => {
      const theme = s.theme === "dark" ? "light" : "dark"
      localStorage.setItem(`${STORAGE_KEY}:theme`, theme)
      return { theme }
    }),
  focusRange: (from, to) => set((s) => ({ focus: { from, to, nonce: (s.focus?.nonce ?? 0) + 1 } })),
}))

// persist the working copy
useStore.subscribe((s, prev) => {
  if (s.text === prev.text && s.format === prev.format && s.fileName === prev.fileName) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ sampleId: s.sampleId, fileName: s.fileName, format: s.format, text: s.text }))
})
