import { CircleCheck, CircleX, Plus, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"
import { Combo, FieldLabel, KindBadge, ModEnterHint, Sentence, submitOnModEnter, useRefOptions } from "@/components/common"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Engine, splitRef } from "@/lib/policy"
import { cn } from "@/lib/utils"
import { useStore } from "@/store"

export function useTestResults() {
  const file = useStore((s) => s.file)
  return useMemo(() => {
    const engine = new Engine(file)
    return file.tests.map((t) => {
      const r = engine.check(t)
      return { test: t, result: r, pass: r.allowed === t.expected && !r.errors.some((e) => e.startsWith("Unknown")) }
    })
  }, [file])
}

function AddTest() {
  const file = useStore((s) => s.file)
  const mutate = useStore((s) => s.mutate)
  const opts = useRefOptions(file)
  const [user, setUser] = useState("")
  const [action, setAction] = useState("")
  const [resource, setResource] = useState("")
  const [expected, setExpected] = useState("can")
  const [type] = splitRef(resource)
  const actions = Object.keys(file.schema.resources.find((r) => r.key === type)?.actions ?? {})

  const add = () => {
    if (!user || !action || !resource) return
    if (mutate({ op: "addTest", test: { user, action, resource, expected: expected === "can" } })) {
      setAction("")
      setResource("")
    }
  }

  return (
    <form
      className="grid grid-cols-[1fr_auto_1fr_1.3fr_auto] items-end gap-2 border-b p-4"
      onKeyDownCapture={submitOnModEnter}
      onSubmit={(e) => {
        e.preventDefault()
        add()
      }}
    >
      <div>
        <FieldLabel htmlFor="t-user">User</FieldLabel>
        <Combo id="t-user" value={user} onChange={setUser} options={opts.users} placeholder="user" />
      </div>
      <div>
        <FieldLabel>Expect</FieldLabel>
        <ToggleGroup type="single" variant="outline" size="sm" value={expected} onValueChange={(v) => v && setExpected(v)} className="h-8">
          <ToggleGroupItem value="can" className="h-8 px-2.5 text-[12px] data-[state=on]:text-allow">
            can
          </ToggleGroupItem>
          <ToggleGroupItem value="cannot" className="h-8 px-2.5 text-[12px] data-[state=on]:text-deny">
            cannot
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div>
        <FieldLabel htmlFor="t-action">Action</FieldLabel>
        <Combo id="t-action" value={action} onChange={setAction} options={actions.map((a) => ({ value: a }))} placeholder="action" />
      </div>
      <div>
        <FieldLabel htmlFor="t-res">Resource</FieldLabel>
        <Combo id="t-res" value={resource} onChange={setResource} options={opts.resources} placeholder="type:key" />
      </div>
      <Button type="submit" size="sm" className="h-8 gap-1" disabled={!user || !action || !resource}>
        <Plus className="size-3.5" /> Add
        <ModEnterHint />
      </Button>
    </form>
  )
}

export function TestsPanel() {
  const results = useTestResults()
  const mutate = useStore((s) => s.mutate)
  const runCheck = useStore((s) => s.runCheck)
  const passed = results.filter((r) => r.pass).length
  const pct = results.length ? (passed / results.length) * 100 : 0

  return (
    <div>
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <div className="text-[13px] font-medium">
          {results.length ? (
            <>
              <span className={passed === results.length ? "text-allow" : "text-deny"}>{passed}</span>
              <span className="text-muted-foreground"> of {results.length} tests pass</span>
            </>
          ) : (
            <span className="text-muted-foreground">No tests yet</span>
          )}
        </div>
        <div className="ml-auto h-1.5 w-32 overflow-hidden rounded-full bg-deny/25">
          <div className="h-full rounded-full bg-allow transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <AddTest />
      <ul>
        {results.map(({ test, result, pass }, i) => (
          <li key={i} className="group border-b last:border-0">
            <div className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/50">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                onClick={() => runCheck(test)}
                title="Open in Check"
              >
                {pass ? <CircleCheck className="size-4 shrink-0 text-allow" /> : <CircleX className="size-4 shrink-0 text-deny" />}
                <Sentence user={test.user} action={test.action} resource={test.resource} can={test.expected} className="truncate" />
                {test.tenant && <span className="font-mono text-[11.5px] text-muted-foreground">@{test.tenant}</span>}
                {test.context && (
                  <span className="rounded-sm bg-muted px-1.5 font-mono text-[10.5px] text-muted-foreground">with context</span>
                )}
              </button>
              <div className="flex shrink-0 items-center gap-1.5">
                {[...new Set(result.grants.map((g) => g.kind))].map((k) => (
                  <KindBadge key={k} kind={k} />
                ))}
                {!pass && (
                  <span className="text-[11.5px] text-deny">
                    got {result.errors.some((e) => e.startsWith("Unknown")) ? "error" : result.allowed ? "allow" : "deny"}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("size-7 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100")}
                  aria-label="Delete test"
                  onClick={() => mutate({ op: "removeTest", index: i })}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
