import { autocompletion, type Completion, type CompletionContext } from "@codemirror/autocomplete"
import { HighlightStyle, StreamLanguage, syntaxHighlighting, type StreamParser } from "@codemirror/language"
import { EditorView } from "@codemirror/view"
import { tags as t } from "@lezer/highlight"
import type { PolicyFile } from "@/lib/policy"

const STATEMENTS = ["tenant", "resource", "role", "userset", "resourceset", "permit", "user", "instance", "assign", "relate", "assert"]
const RESOURCE_ITEMS = ["actions", "attributes", "relations", "role", "derive"]
const WORDS = ["extends", "from", "via", "where", "on", "to", "with", "can", "cannot"]
const OPERATORS = ["and", "or", "not", "in", "contains"]
const TYPES = ["string", "number", "bool", "array", "json", "time"]
const ATOMS = ["true", "false", "null"]

const statementSet = new Set(STATEMENTS)
const wordSet = new Set([...WORDS, "actions", "attributes", "relations", "derive"])
const opSet = new Set(OPERATORS)
const typeSet = new Set(TYPES)
const atomSet = new Set(ATOMS)

interface LexState {
  /** the next identifier names the thing a statement declares */
  declaring: boolean
  depth: number
}

const dslParser: StreamParser<LexState> = {
  name: "permit-dsl",
  startState: () => ({ declaring: false, depth: 0 }),
  token(stream, state) {
    if (stream.eatSpace()) return null
    if (stream.match("//")) {
      stream.skipToEnd()
      return "comment"
    }
    if (stream.match(/^"(?:[^"\\]|\\.)*"?/)) return "string"
    if (stream.match(/^-?\d+(\.\d+)?/)) return "number"
    if (stream.match(/^(==|!=|>=|<=|[<>])/)) return "operator"
    if (stream.match(/^[{}]/)) {
      state.depth += stream.current() === "{" ? 1 : -1
      return "brace"
    }
    if (stream.match(/^[#@]/)) return "operator"
    if (stream.match(/^[()[\],:.*]/)) return "punctuation"
    if (stream.match(/^[A-Za-z0-9_-]+/)) {
      const word = stream.current()
      if (state.declaring) {
        state.declaring = false
        return "labelName"
      }
      if ((statementSet.has(word) && state.depth === 0) || (word === "role" && state.depth > 0)) {
        state.declaring = !["permit", "assign", "relate", "assert", "instance"].includes(word)
        return "keyword"
      }
      if (wordSet.has(word)) return "keyword"
      if (opSet.has(word)) return "operator"
      if (typeSet.has(word)) return "typeName"
      if (atomSet.has(word)) return "atom"
      if (word === "user" || word === "resource") return "variableName.special"
      if (stream.peek() === ":" && /[A-Za-z0-9_*"-]/.test(stream.string.charAt(stream.pos + 1))) return "className"
      return "variableName"
    }
    stream.next()
    return null
  },
  languageData: { commentTokens: { line: "//" } },
}

export const permitDsl = StreamLanguage.define(dslParser)

export const highlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: t.keyword, color: "var(--hl-keyword)", fontWeight: "500" },
    { tag: t.labelName, color: "var(--hl-def)", fontWeight: "600" },
    { tag: t.comment, color: "var(--hl-comment)", fontStyle: "italic" },
    { tag: t.string, color: "var(--hl-string)" },
    { tag: [t.number, t.atom, t.bool, t.null], color: "var(--hl-number)" },
    { tag: t.operator, color: "var(--hl-operator)" },
    { tag: t.typeName, color: "var(--hl-type)" },
    { tag: t.className, color: "var(--hl-type)" },
    { tag: t.special(t.variableName), color: "var(--hl-special)" },
    { tag: t.propertyName, color: "var(--hl-property)" },
    { tag: [t.punctuation, t.brace, t.squareBracket, t.separator], color: "var(--hl-punct)" },
  ]),
)

export const editorTheme = EditorView.theme({
  "&": { backgroundColor: "var(--code)", color: "var(--foreground)" },
  ".cm-content": { caretColor: "var(--brand)", padding: "12px 0" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--brand)", borderLeftWidth: "2px" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
    backgroundColor: "color-mix(in oklch, var(--brand) 24%, transparent) !important",
  },
  ".cm-gutters": { backgroundColor: "var(--code)", color: "var(--hl-gutter)", border: "none", paddingLeft: "6px" },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--foreground)" },
  ".cm-activeLine": { backgroundColor: "color-mix(in oklch, var(--foreground) 4%, transparent)" },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 10px 0 4px", minWidth: "28px" },
  ".cm-foldGutter .cm-gutterElement": { padding: "0 4px" },
  ".cm-matchingBracket": { backgroundColor: "color-mix(in oklch, var(--brand) 20%, transparent)", outline: "none" },
  ".cm-tooltip": {
    backgroundColor: "var(--popover)",
    color: "var(--popover-foreground)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    fontFamily: "var(--font-sans)",
    fontSize: "12.5px",
    overflow: "hidden",
  },
  ".cm-tooltip-autocomplete > ul > li[aria-selected]": { backgroundColor: "var(--accent)", color: "var(--accent-foreground)" },
  ".cm-tooltip-autocomplete > ul": { fontFamily: "var(--font-mono)" },
  ".cm-completionDetail": { color: "var(--muted-foreground)", fontStyle: "normal", marginLeft: "8px" },
  ".cm-diagnostic": { padding: "6px 10px", borderLeftWidth: "3px" },
  ".cm-diagnostic-error": { borderLeftColor: "var(--deny)" },
  ".cm-diagnostic-warning": { borderLeftColor: "var(--warn)" },
  ".cm-lintRange-error": {
    backgroundImage: "none",
    textDecoration: "underline wavy var(--deny)",
    textUnderlineOffset: "3px",
  },
  ".cm-lintRange-warning": {
    backgroundImage: "none",
    textDecoration: "underline wavy var(--warn)",
    textUnderlineOffset: "3px",
  },
  ".cm-gutter-lint": { width: "12px" },
  ".cm-lint-marker": { width: "8px", height: "8px", borderRadius: "999px", content: "none" },
  ".cm-lint-marker-error": { backgroundColor: "var(--deny)" },
  ".cm-lint-marker-warning": { backgroundColor: "var(--warn)" },
  ".cm-panels": { backgroundColor: "var(--panel)", color: "var(--foreground)", borderColor: "var(--border)" },
  ".cm-panels.cm-panels-bottom": { borderTop: "1px solid var(--border)" },
  ".cm-panel.cm-search": { padding: "8px 12px", fontFamily: "var(--font-sans)", fontSize: "12px" },
  ".cm-panel.cm-search label": {
    color: "var(--muted-foreground)",
    fontSize: "12px",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
  },
  ".cm-panel.cm-search [name=close]": { color: "var(--muted-foreground)", fontSize: "16px", right: "8px", top: "6px" },
  ".cm-textfield": {
    backgroundColor: "var(--code)",
    color: "var(--foreground)",
    border: "1px solid var(--input)",
    borderRadius: "var(--radius)",
    padding: "3px 8px",
    fontFamily: "var(--font-mono)",
    fontSize: "12px",
    outline: "none",
  },
  ".cm-textfield::placeholder": { color: "var(--muted-foreground)", opacity: "0.7" },
  ".cm-textfield:focus": { borderColor: "var(--ring)", boxShadow: "0 0 0 3px color-mix(in oklch, var(--ring) 30%, transparent)" },
  ".cm-button": {
    backgroundImage: "none",
    backgroundColor: "var(--secondary)",
    color: "var(--secondary-foreground)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "3px 10px",
    fontFamily: "var(--font-sans)",
    fontSize: "12px",
    cursor: "pointer",
  },
  ".cm-button:hover": { backgroundColor: "var(--accent)" },
  ".cm-button:active": { backgroundImage: "none", backgroundColor: "var(--accent)" },
  ".cm-panel.cm-search input[type=checkbox]": { accentColor: "var(--brand)", margin: "0" },
  ".cm-searchMatch": { backgroundColor: "color-mix(in oklch, var(--brand) 25%, transparent)" },
})

/** Completions drawn from the keywords and from the names the policy already declares. */
export function policyCompletions(getFile: () => PolicyFile, isDsl: () => boolean) {
  return autocompletion({
    override: [
      (ctx: CompletionContext) => {
        if (!isDsl()) return null
        const word = ctx.matchBefore(/[A-Za-z0-9_.-]*/)
        if (!word || (word.from === word.to && !ctx.explicit)) return null
        const file = getFile()
        const opts: Completion[] = []
        const push = (label: string, type: string, detail: string) => opts.push({ label, type, detail })
        STATEMENTS.forEach((w) => push(w, "keyword", "statement"))
        RESOURCE_ITEMS.forEach((w) => push(w, "keyword", "in resource"))
        ;[...WORDS, ...OPERATORS].forEach((w) => push(w, "keyword", ""))
        TYPES.forEach((w) => push(w, "type", "attribute type"))
        for (const r of file.schema.resources) {
          push(r.key, "class", "resource")
          for (const a of Object.keys(r.actions)) push(a, "function", `${r.key} action`)
          for (const role of Object.keys(r.roles ?? {})) push(role, "variable", `${r.key} role`)
          for (const attr of Object.keys(r.attributes ?? {})) push(`resource.${attr}`, "property", r.key)
        }
        for (const r of file.schema.roles) push(r.key, "variable", "role")
        for (const s of file.schema.condition_sets) push(s.key, "variable", s.type)
        const userAttrs = new Set(file.data.users.flatMap((u) => Object.keys(u.attributes ?? {})))
        for (const a of ["key", "email", ...userAttrs]) push(`user.${a}`, "property", "user attribute")
        for (const u of file.data.users) push(u.key, "text", "user")
        for (const i of file.data.resource_instances) push(`${i.resource}:${i.key}`, "text", "instance")
        const seen = new Set<string>()
        return {
          from: word.from,
          options: opts.filter((o) => (seen.has(o.label + o.detail) ? false : (seen.add(o.label + o.detail), true))),
          validFor: /^[A-Za-z0-9_.-]*$/,
        }
      },
    ],
  })
}
