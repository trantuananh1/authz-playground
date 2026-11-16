import { ChevronRight, CircleCheck, CircleX, FlaskConical, Plus, TriangleAlert } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Combo, FieldLabel, KindBadge, SectionTitle, Sentence, useRefOptions } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Engine, splitRef, type Attributes, type CheckResult } from "@/lib/policy"
import type { ConditionCheck } from "@/lib/policy/conditions"
import { OP_SYMBOL } from "@/lib/policy/conditions"
import { cn } from "@/lib/utils"
import { useStore } from "@/store"

function parseContext(text: string): { value?: { user?: Attributes; resource?: Attributes }; error?: string } {
  if (!text.trim()) return {}
  try {
    const v = JSON.parse(text)
    if (typeof v !== "object" || v === null || Array.isArray(v)) return { error: "Context must be a JSON object" }
    return { value: v }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export function ChecksTable({ checks }: { checks: ConditionCheck[] }) {
  if (!checks.length) return null
  return (
    <div className="mt-2 overflow-hidden rounded-md border">
      <table className="w-full font-mono text-[11.5px]">
        <tbody>
          {checks.map((c, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="w-6 py-1 pl-2">
                {c.ok ? <CircleCheck className="size-3.5 text-allow" /> : <CircleX className="size-3.5 text-deny" />}
              </td>
              <td className="py-1 pr-2">
                {c.attribute} <span className="text-muted-foreground">{OP_SYMBOL[c.op]}</span>{" "}
                {typeof c.expected === "string" && c.expected.includes("(") ? c.expected : JSON.stringify(c.expected)}
              </td>
              <td className="py-1 pr-2 text-right text-muted-foreground">got {JSON.stringify(c.actual) ?? "undefined"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Verdict({ result }: { result: CheckResult }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border px-4 py-3",
        result.allowed ? "border-allow/30 bg-allow/8" : "border-deny/30 bg-deny/8",
      )}
    >
      {result.allowed ? <CircleCheck className="size-6 text-allow" /> : <CircleX className="size-6 text-deny" />}
      <div>
        <div className={cn("text-lg leading-tight font-semibold", result.allowed ? "text-allow" : "text-deny")}>
          {result.allowed ? "Allowed" : "Denied"}
        </div>
        <div className="text-[12px] text-muted-foreground">
          {result.allowed
            ? `${result.grants.length} path${result.grants.length > 1 ? "s" : ""} grant access`
            : "No role, relationship or attribute rule grants access"}
          {" · tenant "}
          <span className="font-mono">{result.tenant}</span>
        </div>
      </div>
      <div className="ml-auto font-mono text-[11px] text-muted-foreground tabular-nums">
        {result.ms < 0.1 ? "< 0.1" : result.ms.toFixed(1)} ms
      </div>
    </div>
  )
}

export function CheckPanel() {
  const file = useStore((s) => s.file)
  const form = useStore((s) => s.check)
  const setCheck = useStore((s) => s.setCheck)
  const mutate = useStore((s) => s.mutate)
  const opts = useRefOptions(file)
  const [showContext, setShowContext] = useState(!!form.context)
  const [showMisses, setShowMisses] = useState(false)

  const [type] = splitRef(form.resource)
  const actions = Object.keys(file.schema.resources.find((r) => r.key === type)?.actions ?? {})
  const ctx = useMemo(() => parseContext(form.context), [form.context])

  const result = useMemo(() => {
    if (!form.user || !form.action || !form.resource || ctx.error) return null
    return new Engine(file).check({
      user: form.user,
      action: form.action,
      resource: form.resource,
      tenant: form.tenant || undefined,
      context: ctx.value,
    })
  }, [file, form.user, form.action, form.resource, form.tenant, ctx.value, ctx.error])

  const saveTest = () => {
    if (!result) return
    const ok = mutate({
      op: "addTest",
      test: {
        user: form.user,
        action: form.action,
        resource: form.resource,
        ...(form.tenant ? { tenant: form.tenant } : {}),
        expected: result.allowed,
        ...(ctx.value ? { context: ctx.value } : {}),
      },
    })
    if (ok) toast.success("Test added to the policy file")
  }

  return (
    <div className="space-y-5 p-4">
      <section>
        <SectionTitle>Query</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel htmlFor="q-user">User</FieldLabel>
            <Combo id="q-user" value={form.user} onChange={(user) => setCheck({ user })} options={opts.users} placeholder="anne" />
          </div>
          <div>
            <FieldLabel htmlFor="q-action">Action</FieldLabel>
            <Combo
              id="q-action"
              value={form.action}
              onChange={(action) => setCheck({ action })}
              options={actions.map((a) => ({ value: a, hint: type }))}
              placeholder="read"
            />
          </div>
          <div>
            <FieldLabel htmlFor="q-resource">Resource</FieldLabel>
            <Combo
              id="q-resource"
              value={form.resource}
              onChange={(resource) => {
                const [t] = splitRef(resource)
                const acts = Object.keys(file.schema.resources.find((r) => r.key === t)?.actions ?? {})
                setCheck({ resource, ...(acts.length && !acts.includes(form.action) ? { action: acts[0] } : {}) })
              }}
              options={opts.resources}
              placeholder="document:doc1"
            />
          </div>
          <div>
            <FieldLabel htmlFor="q-tenant">Tenant</FieldLabel>
            <Combo
              id="q-tenant"
              value={form.tenant}
              onChange={(tenant) => setCheck({ tenant })}
              options={opts.tenants}
              placeholder="from the instance"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowContext((v) => !v)}
          className="mt-3 inline-flex items-center gap-1 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronRight className={cn("size-3.5 transition-transform", showContext && "rotate-90")} />
          Context attributes
          {form.context && !showContext && <span className="text-brand">· set</span>}
        </button>
        {showContext && (
          <div className="mt-2">
            <textarea
              value={form.context}
              onChange={(e) => setCheck({ context: e.target.value })}
              spellCheck={false}
              rows={4}
              placeholder={'{ "user": { "on_shift": true }, "resource": { "stage": "beta" } }'}
              className="w-full resize-y rounded-md border border-input bg-transparent px-2.5 py-2 font-mono text-[12px] outline-none placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 dark:bg-input/20"
            />
            <p className={cn("mt-1 text-[11.5px]", ctx.error ? "text-deny" : "text-muted-foreground")}>
              {ctx.error ?? "Merged over the stored attributes for this check only."}
            </p>
          </div>
        )}
      </section>

      {result && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Sentence user={form.user} action={form.action} resource={form.resource} />
            <span className="font-mono text-[12.5px] text-muted-foreground">?</span>
            <Button variant="outline" size="sm" className="ml-auto h-7 gap-1.5 text-[12px]" onClick={saveTest}>
              <Plus className="size-3.5" /> Save as test
            </Button>
          </div>

          <Verdict result={result} />

          {result.errors.map((e) => (
            <div key={e} className="flex items-start gap-2 rounded-md border border-warn/30 bg-warn/8 px-3 py-2 text-[12.5px]">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warn" /> {e}
            </div>
          ))}

          {result.grants.length > 0 && (
            <div>
              <SectionTitle>Granted by</SectionTitle>
              <ol className="space-y-2">
                {result.grants.map((g, i) => (
                  <li key={i} className="rounded-md border bg-card p-3">
                    <div className="flex items-center gap-2 text-[12.5px] font-medium">
                      <KindBadge kind={g.kind} />
                      {g.summary}
                    </div>
                    <ol className="mt-2 ml-2 border-l pl-3">
                      {g.steps.map((s, j) => (
                        <li key={j} className="relative py-0.5 font-mono text-[11.5px] text-muted-foreground">
                          <span className="absolute top-[9px] -left-[16.5px] size-1.5 rounded-full bg-border" />
                          {s}
                        </li>
                      ))}
                    </ol>
                    {g.checks && <ChecksTable checks={g.checks} />}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {result.misses.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowMisses((v) => !v)}
                className="flex w-full items-center gap-1 pb-2 text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
              >
                <ChevronRight className={cn("size-3.5 transition-transform", (showMisses || !result.allowed) && "rotate-90")} />
                {result.allowed ? `Other paths checked (${result.misses.length})` : "Why not"}
              </button>
              {(showMisses || !result.allowed) && (
                <ul className="space-y-2">
                  {result.misses.map((m, i) => (
                    <li key={i} className="rounded-md border border-dashed p-3">
                      <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                        <KindBadge kind={m.kind} className="opacity-70" />
                        {m.summary}
                      </div>
                      {m.checks && <ChecksTable checks={m.checks} />}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      )}

      {!result && (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed py-10 text-center text-[12.5px] text-muted-foreground">
          <FlaskConical className="size-5" />
          Fill in a user, an action and a resource to check access.
        </div>
      )}
    </div>
  )
}
