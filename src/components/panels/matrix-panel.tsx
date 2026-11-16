import { useMemo, useState } from "react"
import { Combo, FieldLabel, KindBadge, Mono } from "@/components/common"
import { Engine, type GrantKind } from "@/lib/policy"
import { cn } from "@/lib/utils"
import { useStore } from "@/store"

const DOT: Record<GrantKind, string> = { rbac: "bg-rbac", rebac: "bg-rebac", abac: "bg-abac" }

export function MatrixPanel() {
  const file = useStore((s) => s.file)
  const runCheck = useStore((s) => s.runCheck)
  const checkUser = useStore((s) => s.check.user)
  const [user, setUser] = useState(checkUser || file.data.users[0]?.key || "")

  const tables = useMemo(() => {
    const engine = new Engine(file)
    return file.schema.resources.map((r) => {
      const refs = [...file.data.resource_instances.filter((i) => i.resource === r.key).map((i) => `${r.key}:${i.key}`)]
      if (!refs.length) refs.push(r.key)
      return {
        resource: r,
        rows: refs.map((ref) => ({ ref, cells: engine.allowedActions(user, ref) })),
      }
    })
  }, [file, user])

  return (
    <div className="space-y-5 p-4">
      <div className="flex items-end gap-4">
        <div className="w-48">
          <FieldLabel htmlFor="m-user">User</FieldLabel>
          <Combo id="m-user" value={user} onChange={setUser} options={file.data.users.map((u) => ({ value: u.key, hint: u.email }))} />
        </div>
        <div className="flex items-center gap-2 pb-1.5 text-[11.5px] text-muted-foreground">
          Granted through <KindBadge kind="rbac" /> <KindBadge kind="rebac" /> <KindBadge kind="abac" />
        </div>
      </div>

      {tables.map(({ resource, rows }) => {
        const actions = Object.keys(resource.actions)
        return (
          <section key={resource.key} className="overflow-hidden rounded-md border">
            <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2">
              <Mono className="font-semibold text-rebac">{resource.key}</Mono>
              {resource.name && <span className="text-[12px] text-muted-foreground">{resource.name}</span>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b">
                    <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Instance</th>
                    {actions.map((a) => (
                      <th key={a} className="px-2 py-1.5 text-center font-mono font-medium text-muted-foreground">
                        {a}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ ref, cells }) => (
                    <tr key={ref} className="border-b last:border-0">
                      <td className="px-3 py-1.5 font-mono whitespace-nowrap">
                        {ref.includes(":") ? (
                          ref.split(":").slice(1).join(":")
                        ) : (
                          <span className="text-muted-foreground">any (type-level)</span>
                        )}
                      </td>
                      {actions.map((a) => {
                        const kinds = cells[a] ?? []
                        return (
                          <td key={a} className="p-0.5 text-center">
                            <button
                              type="button"
                              onClick={() => runCheck({ user, action: a, resource: ref })}
                              title={`${user} ${kinds.length ? "can" : "cannot"} ${a} ${ref}`}
                              className={cn(
                                "inline-flex h-7 w-full min-w-10 items-center justify-center gap-0.5 rounded-sm transition-colors hover:bg-accent",
                                kinds.length ? "bg-allow/8" : "",
                              )}
                            >
                              {kinds.length ? (
                                kinds.map((k) => <span key={k} className={cn("size-2 rounded-full", DOT[k])} />)
                              ) : (
                                <span className="text-muted-foreground/50">–</span>
                              )}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}
    </div>
  )
}
