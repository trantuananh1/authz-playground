import { AlertCircle, CircleCheck, FileCode2, FileUp, Grid3x3, TriangleAlert } from "lucide-react"
import { lazy, Suspense, useEffect, useState } from "react"
import { PolicyEditor } from "@/components/editor/policy-editor"
import { PolicyMatrix } from "@/components/editor/policy-matrix"

// the guide and its screenshots load only when someone opens it
const DocsPage = lazy(() => import("@/components/docs/docs-page").then((m) => ({ default: m.DocsPage })))
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { GraphPanel } from "@/components/graph/graph-panel"
import { Header, readPolicyFile } from "@/components/header"
import { CheckPanel } from "@/components/panels/check-panel"
import { DataPanel } from "@/components/panels/data-panel"
import { MatrixPanel } from "@/components/panels/matrix-panel"
import { ProblemsPanel } from "@/components/panels/problems-panel"
import { TestsPanel, useTestResults } from "@/components/panels/tests-panel"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Toaster } from "@/components/ui/sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useStore, type EditorView, type PanelTab } from "@/store"

const tabList = "h-10 w-full shrink-0 justify-start gap-4 rounded-none border-b bg-panel px-4"
const tabTrigger = "flex-none px-0 text-[12.5px]"

function Count({ n, tone }: { n: number; tone?: "deny" | "warn" | "allow" }) {
  return (
    <span
      className={cn(
        "rounded-sm px-1 font-mono text-[10.5px] tabular-nums",
        tone === "deny" && "bg-deny/15 text-deny",
        tone === "warn" && "bg-warn/15 text-warn",
        tone === "allow" && "bg-allow/15 text-allow",
        !tone && "text-muted-foreground",
      )}
    >
      {n}
    </span>
  )
}

function EditorHeader() {
  const fileName = useStore((s) => s.fileName)
  const format = useStore((s) => s.format)
  const diagnostics = useStore((s) => s.compiled.diagnostics)
  const view = useStore((s) => s.editorView)
  const setView = useStore((s) => s.setEditorView)
  const errors = diagnostics.filter((d) => d.severity === "error").length
  const warnings = diagnostics.length - errors
  return (
    <div className="flex h-10 shrink-0 items-center gap-2 border-b bg-panel px-4">
      <span className="mr-1 text-[12.5px] font-medium">Policy</span>
      <ToggleGroup
        type="single"
        size="sm"
        value={view}
        onValueChange={(v) => v && setView(v as EditorView)}
        aria-label="Policy view"
        className="mr-1 h-8 rounded-md border p-0.5"
      >
        <ToggleGroupItem value="text" className="h-6 gap-1 px-2 text-[11.5px] data-[state=on]:bg-accent">
          <FileCode2 className="size-3.5" /> Text
        </ToggleGroupItem>
        <ToggleGroupItem value="matrix" className="h-6 gap-1 px-2 text-[11.5px] data-[state=on]:bg-accent">
          <Grid3x3 className="size-3.5" /> Matrix
        </ToggleGroupItem>
      </ToggleGroup>
      <span className="font-mono text-[11.5px] text-muted-foreground">{fileName}</span>
      <span className="rounded-sm bg-muted px-1.5 font-mono text-[10.5px] text-muted-foreground uppercase">{format}</span>
      <div className="ml-auto flex items-center gap-1.5 text-[12px]">
        {errors > 0 ? (
          <span className="flex items-center gap-1 text-deny">
            <AlertCircle className="size-3.5" /> {errors} error{errors > 1 ? "s" : ""}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-allow">
            <CircleCheck className="size-3.5" /> Valid
          </span>
        )}
        {warnings > 0 && (
          <span className="flex items-center gap-1 text-warn">
            <TriangleAlert className="size-3.5" /> {warnings}
          </span>
        )}
      </div>
    </div>
  )
}

function Panels() {
  const tab = useStore((s) => s.panelTab)
  const setTab = useStore((s) => s.setPanelTab)
  const data = useStore((s) => s.file.data)
  const diagnostics = useStore((s) => s.compiled.diagnostics)
  const errors = diagnostics.filter((d) => d.severity === "error").length
  const results = useTestResults()
  const failed = results.filter((r) => !r.pass).length
  const dataCount = data.users.length + data.resource_instances.length + data.relationship_tuples.length
  const panels = [
    ["check", <CheckPanel key="check" />],
    ["tests", <TestsPanel key="tests" />],
    ["data", <DataPanel key="data" />],
    ["matrix", <MatrixPanel key="matrix" />],
    ["problems", <ProblemsPanel key="problems" />],
  ] as const
  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as PanelTab)} className="h-full gap-0 bg-panel" data-tour="panels">
      <TabsList variant="line" className={tabList}>
        <TabsTrigger value="check" className={tabTrigger}>
          Check
        </TabsTrigger>
        <TabsTrigger value="tests" className={tabTrigger}>
          Tests {results.length > 0 && <Count n={failed || results.length} tone={failed ? "deny" : "allow"} />}
        </TabsTrigger>
        <TabsTrigger value="data" className={tabTrigger}>
          Data <Count n={dataCount} />
        </TabsTrigger>
        <TabsTrigger value="matrix" className={tabTrigger}>
          Matrix
        </TabsTrigger>
        <TabsTrigger value="problems" className={tabTrigger}>
          Problems {diagnostics.length > 0 && <Count n={diagnostics.length} tone={errors ? "deny" : "warn"} />}
        </TabsTrigger>
      </TabsList>
      {panels.map(([id, el]) => (
        <TabsContent key={id} value={id} className="min-h-0 flex-1">
          <ScrollArea className="h-full">{el}</ScrollArea>
        </TabsContent>
      ))}
    </Tabs>
  )
}

function StatusBar() {
  const schema = useStore((s) => s.file.schema)
  const data = useStore((s) => s.file.data)
  const item = (n: number, label: string) => (
    <span>
      <span className="font-mono text-foreground tabular-nums">{n}</span> {label}
    </span>
  )
  const roleCount = schema.roles.length + schema.resources.reduce((n, r) => n + Object.keys(r.roles ?? {}).length, 0)
  return (
    <footer className="flex h-7 shrink-0 items-center gap-4 border-t bg-panel px-4 text-[11.5px] text-muted-foreground">
      {item(schema.tenants.length, "tenants")}
      {item(schema.resources.length, "resources")}
      {item(roleCount, "roles")}
      {item(schema.condition_sets.length, "condition sets")}
      {item(data.users.length, "users")}
      {item(data.relationship_tuples.length, "relationships")}
      <span className="ml-auto">Evaluated in your browser. Nothing leaves this page.</span>
    </footer>
  )
}

function DropZone() {
  const [over, setOver] = useState(false)
  useEffect(() => {
    let depth = 0
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes("Files")
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth++
      setOver(true)
    }
    const leave = () => {
      depth = Math.max(0, depth - 1)
      if (!depth) setOver(false)
    }
    const overFn = (e: DragEvent) => hasFiles(e) && e.preventDefault()
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      setOver(false)
      const f = e.dataTransfer?.files[0]
      if (f) readPolicyFile(f)
    }
    window.addEventListener("dragenter", enter)
    window.addEventListener("dragleave", leave)
    window.addEventListener("dragover", overFn)
    window.addEventListener("drop", drop)
    return () => {
      window.removeEventListener("dragenter", enter)
      window.removeEventListener("dragleave", leave)
      window.removeEventListener("dragover", overFn)
      window.removeEventListener("drop", drop)
    }
  }, [])
  if (!over) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-brand px-12 py-10 text-center">
        <FileUp className="size-7 text-brand" />
        <div className="text-[15px] font-medium">Drop a policy file</div>
        <div className="text-[12.5px] text-muted-foreground">.dsl or .txt as DSL, .json as JSON</div>
      </div>
    </div>
  )
}

export function App() {
  const theme = useStore((s) => s.theme)
  const editorView = useStore((s) => s.editorView)
  const page = useStore((s) => s.page)
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    document.documentElement.style.colorScheme = theme
  }, [theme])

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full flex-col">
        <Header />
        {page === "docs" ? (
          <Suspense fallback={<div className="flex-1" />}>
            <DocsPage />
          </Suspense>
        ) : (
          <>
            <main className="min-h-0 flex-1">
              <ResizablePanelGroup orientation="horizontal">
                <ResizablePanel defaultSize="50" minSize="30">
                  <ResizablePanelGroup orientation="vertical">
                    <ResizablePanel defaultSize="55" minSize="20" className="flex flex-col" data-tour="editor">
                      <EditorHeader />
                      {/* the text editor stays mounted so its undo history survives a trip to the matrix */}
                      <div className={cn("min-h-0 flex-1", editorView !== "text" && "hidden")}>
                        <PolicyEditor />
                      </div>
                      {editorView === "matrix" && (
                        <div className="min-h-0 flex-1">
                          <PolicyMatrix />
                        </div>
                      )}
                    </ResizablePanel>
                    <ResizableHandle />
                    <ResizablePanel defaultSize="45" minSize="20">
                      <Panels />
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </ResizablePanel>
                <ResizableHandle />
                <ResizablePanel defaultSize="50" minSize="25">
                  <GraphPanel />
                </ResizablePanel>
              </ResizablePanelGroup>
            </main>
            <StatusBar />
          </>
        )}
      </div>
      <DropZone />
      <Toaster position="bottom-right" />
    </TooltipProvider>
  )
}
