import { BookOpen, Check, ChevronDown, Copy, Download, FileUp, FlaskConical, Link2, Moon, Sun } from "lucide-react"
import { useRef } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { parsePolicy, printPolicy, type PolicyFormat } from "@/lib/policy"
import { shareUrl } from "@/lib/share"
import { cn } from "@/lib/utils"
import { SAMPLES } from "@/samples"
import { useStore, type Page } from "@/store"

/** The shield outline, reused at two sizes: the rim and the split core. */
const SHIELD = "M12 1.4c2.5 1.9 5.6 2.9 9.1 3v6.5c0 5.7-3.7 9.6-9.1 11.7C6.6 20.5 2.9 16.6 2.9 10.9V4.4c3.5-.1 6.6-1.1 9.1-3z"
const inset = (k: number) => `translate(12 12.3) scale(${k}) translate(-12 -12.3)`

/**
 * Black-and-white shield: a heavy rim, a white core whose right half is black.
 * Ink and paper follow the theme so the mark stays visible on the dark header.
 */
export function ShieldMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <clipPath id="shield-right-half">
          <rect x="12" y="0" width="12" height="24" />
        </clipPath>
      </defs>
      <path d={SHIELD} className="fill-foreground" />
      <path d={SHIELD} className="fill-panel" transform={inset(0.84)} />
      <path d={SHIELD} className="fill-foreground" transform={inset(0.72)} clipPath="url(#shield-right-half)" />
    </svg>
  )
}

function Logo() {
  return (
    <div className="flex shrink-0 items-center gap-2.5 whitespace-nowrap">
      <ShieldMark className="size-7" />
      <div className="leading-none">
        <div className="text-[15px] font-semibold tracking-tight">vAuthz</div>
        <div className="mt-0.5 hidden text-[11px] text-muted-foreground sm:block">Authorization as a Service</div>
      </div>
    </div>
  )
}

/** Switches between the playground and the user guide. */
function PageNav() {
  const page = useStore((s) => s.page)
  const setPage = useStore((s) => s.setPage)
  const item = (id: Page, label: string, Icon: typeof BookOpen) => (
    <button
      type="button"
      onClick={() => setPage(id)}
      aria-current={page === id ? "page" : undefined}
      className={cn(
        "relative inline-flex h-13 items-center gap-1.5 px-2 text-[12.5px] font-medium transition-colors",
        page === id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-3.5" />
      {label}
      {page === id && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand" />}
    </button>
  )
  return (
    <nav aria-label="Pages" className="ml-3 flex items-center">
      {item("playground", "Playground", FlaskConical)}
      {item("docs", "Docs", BookOpen)}
    </nav>
  )
}

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = Object.assign(document.createElement("a"), { href: url, download: name })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function readPolicyFile(file: File) {
  file.text().then((text) => useStore.getState().loadText(text, file.name))
}

export function Header() {
  const sampleId = useStore((s) => s.sampleId)
  const fileName = useStore((s) => s.fileName)
  const format = useStore((s) => s.format)
  const theme = useStore((s) => s.theme)
  const page = useStore((s) => s.page)
  const loadSample = useStore((s) => s.loadSample)
  const convert = useStore((s) => s.convert)
  const toggleTheme = useStore((s) => s.toggleTheme)
  const inputRef = useRef<HTMLInputElement>(null)
  const sample = SAMPLES.find((s) => s.id === sampleId)

  const exportAs = (f: PolicyFormat) => {
    const { text, format: cur, fileName: name } = useStore.getState()
    try {
      const out = f === cur ? text : printPolicy(parsePolicy(text, cur), f)
      const base = name.replace(/\.(json|permit|dsl|txt)$/i, "")
      download(`${base}.${f === "json" ? "json" : "dsl"}`, out, f === "json" ? "application/json" : "text/plain")
    } catch {
      toast.error("Fix the syntax errors before exporting")
    }
  }

  const copy = async (what: "text" | "link") => {
    const s = useStore.getState()
    const value = what === "text" ? s.text : await shareUrl(s)
    await navigator.clipboard.writeText(value)
    if (what === "link") history.replaceState(null, "", value)
    toast.success(what === "link" ? "Share link copied" : "Policy copied")
  }

  return (
    <header className="flex h-13 shrink-0 items-center gap-3 border-b bg-panel px-4">
      <Logo />
      <PageNav />
      {page === "playground" && (
        <>
          <div className="mx-1 h-6 w-px bg-border" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-2 pr-2 text-[12.5px]">
                <span className="text-muted-foreground">Store</span>
                <span className="font-medium">{sample?.name ?? "Custom file"}</span>
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-80">
              <DropdownMenuLabel className="text-[11px] text-muted-foreground">Sample stores</DropdownMenuLabel>
              {SAMPLES.map((s) => (
                <DropdownMenuItem key={s.id} onSelect={() => loadSample(s.id)} className="items-start gap-2 py-2">
                  <Check className={cn("mt-0.5 size-3.5 shrink-0", s.id === sampleId ? "opacity-100" : "opacity-0")} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium">{s.name}</span>
                      <span className="ml-auto flex gap-1">
                        {s.models.map((m) => (
                          <span
                            key={m}
                            className={cn(
                              "rounded-sm px-1 font-mono text-[10px] font-semibold",
                              m === "RBAC" && "bg-rbac/15 text-rbac",
                              m === "ReBAC" && "bg-rebac/15 text-rebac",
                              m === "ABAC" && "bg-abac/15 text-abac",
                            )}
                          >
                            {m}
                          </span>
                        ))}
                      </span>
                    </div>
                    <div className="text-[11.5px] text-muted-foreground">{s.description}</div>
                  </div>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => inputRef.current?.click()} className="gap-2">
                <FileUp className="size-3.5" /> Open a .dsl or .json file…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="hidden truncate font-mono text-[12px] text-muted-foreground md:inline">{fileName}</span>
        </>
      )}

      <div className="ml-auto flex items-center gap-2">
        {page === "playground" && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    size="sm"
                    value={format}
                    onValueChange={(v) => v && convert(v as PolicyFormat)}
                    aria-label="Policy format"
                  >
                    <ToggleGroupItem
                      value="dsl"
                      className="h-8 px-3 font-mono text-[12px] text-muted-foreground data-[state=on]:bg-accent data-[state=on]:text-foreground"
                    >
                      DSL
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="json"
                      className="h-8 px-3 font-mono text-[12px] text-muted-foreground data-[state=on]:bg-accent data-[state=on]:text-foreground"
                    >
                      JSON
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </TooltipTrigger>
              <TooltipContent>Convert the editor between DSL and JSON</TooltipContent>
            </Tooltip>

            <input
              ref={inputRef}
              type="file"
              accept=".json,.dsl,.txt,application/json,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) readPolicyFile(f)
                e.target.value = ""
              }}
            />
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[12.5px]" onClick={() => inputRef.current?.click()}>
              <FileUp className="size-3.5" /> Import
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[12.5px]">
                  <Download className="size-3.5" /> Export <ChevronDown className="size-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={() => exportAs("dsl")}>Download as DSL (.dsl)</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => exportAs("json")}>Download as JSON (.json)</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => copy("text")} className="gap-2">
                  <Copy className="size-3.5" /> Copy editor text
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="sm" className="h-8 gap-1.5 text-[12.5px]" onClick={() => copy("link")}>
              <Link2 className="size-3.5" /> Share
            </Button>
          </>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" onClick={toggleTheme} aria-label="Toggle colour theme">
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{theme === "dark" ? "Light theme" : "Dark theme"}</TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}
