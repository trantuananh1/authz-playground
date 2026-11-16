import { CircleCheck, CircleX, TriangleAlert } from "lucide-react"
import { useStore } from "@/store"

function lineCol(text: string, offset: number) {
  const before = text.slice(0, offset)
  const line = before.split("\n").length
  return { line, col: offset - before.lastIndexOf("\n") }
}

export function ProblemsPanel() {
  const diagnostics = useStore((s) => s.compiled.diagnostics)
  const text = useStore((s) => s.text)
  const focusRange = useStore((s) => s.focusRange)

  if (!diagnostics.length)
    return (
      <div className="flex h-full items-center justify-center gap-2 text-[12.5px] text-muted-foreground">
        <CircleCheck className="size-4 text-allow" /> No problems. The policy parses and every reference resolves.
      </div>
    )

  return (
    <ul className="py-1">
      {diagnostics.map((d, i) => {
        const { line, col } = lineCol(text, d.from)
        return (
          <li key={i}>
            <button
              type="button"
              onClick={() => focusRange(d.from, d.to)}
              className="flex w-full items-start gap-2.5 px-4 py-1.5 text-left text-[12.5px] transition-colors hover:bg-accent/50"
            >
              {d.severity === "error" ? (
                <CircleX className="mt-0.5 size-3.5 shrink-0 text-deny" />
              ) : (
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warn" />
              )}
              <span className="flex-1">{d.message}</span>
              <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
                {line}:{col}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
