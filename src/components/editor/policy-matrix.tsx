import { Asterisk, Check, Plus, Rows3, Table2, TriangleAlert } from "lucide-react"
import { useState } from "react"
import { KindBadge } from "@/components/common"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { printCondition, type GrantKind, type Resource, type ResourceSet, type Schema, type UserSet } from "@/lib/policy"
import type { Mutation } from "@/lib/policy/edits"
import { cn } from "@/lib/utils"
import { useStore, type MatrixLayout } from "@/store"

/* ------------------------------------------------------------ cell model */

type CellState =
  | { kind: "off" }
  | { kind: "on" }
  /** granted by `*` or `resource:*`; unticking expands the wildcard */
  | { kind: "wildcard" }
  /** granted through a resource role's `extends`; edit the parent role instead */
  | { kind: "inherited"; from: string }
  | { kind: "na" }

const KEY_RE = /^[A-Za-z0-9_-]+$/

/** Toggles one action in a permission list, expanding a wildcard when one is present. */
function toggle(list: string[], action: string, all: string[], wildcard: string, qualify: (a: string) => string): string[] {
  if (list.includes(wildcard)) return [...list.filter((p) => p !== wildcard), ...all.filter((a) => a !== action).map(qualify)]
  const p = qualify(action)
  return list.includes(p) ? list.filter((x) => x !== p) : [...list, p]
}

function topRoleCell(schema: Schema, roleKey: string, res: Resource, action: string): CellState {
  const perms = schema.roles.find((r) => r.key === roleKey)?.permissions ?? []
  if (perms.includes(`${res.key}:*`)) return { kind: "wildcard" }
  return perms.includes(`${res.key}:${action}`) ? { kind: "on" } : { kind: "off" }
}

function resourceRoleCell(res: Resource, roleKey: string, action: string): CellState {
  const role = res.roles?.[roleKey]
  if (!role) return { kind: "off" }
  if (role.permissions.includes("*")) return { kind: "wildcard" }
  if (role.permissions.includes(action)) return { kind: "on" }
  // walk `extends` to find a parent that grants it
  const seen = new Set([roleKey])
  const queue = [...(role.extends ?? [])]
  while (queue.length) {
    const k = queue.shift()!
    if (seen.has(k)) continue
    seen.add(k)
    const r = res.roles?.[k]
    if (r?.permissions.includes(action) || r?.permissions.includes("*")) return { kind: "inherited", from: k }
    queue.push(...(r?.extends ?? []))
  }
  return { kind: "off" }
}

function ruleActions(schema: Schema, userSet: string, target: string): string[] {
  return schema.condition_set_rules
    .filter((r) => r.user_set === userSet && r.resource_set === target)
    .map((r) => r.permission.slice(r.permission.lastIndexOf(":") + 1))
}

function ruleCell(schema: Schema, userSet: string, target: string, action: string): CellState {
  const actions = ruleActions(schema, userSet, target)
  if (actions.includes("*")) return { kind: "wildcard" }
  return actions.includes(action) ? { kind: "on" } : { kind: "off" }
}

/* ------------------------------------------------------------------- UI */

const TONE: Record<GrantKind, { text: string; bg: string; border: string }> = {
  rbac: { text: "text-rbac", bg: "bg-rbac/15", border: "border-rbac/60" },
  rebac: { text: "text-rebac", bg: "bg-rebac/15", border: "border-rebac/60" },
  abac: { text: "text-abac", bg: "bg-abac/15", border: "border-abac/60" },
}

function Cell({
  state,
  tone,
  onToggle,
  label,
  disabled,
}: {
  state: CellState
  tone: GrantKind
  onToggle: () => void
  label: string
  disabled: boolean
}) {
  if (state.kind === "na")
    return (
      <td className="px-1 py-1 text-center text-muted-foreground/40" title="Only ABAC rules apply to resource sets">
        –
      </td>
    )
  const t = TONE[tone]
  const checked = state.kind !== "off"
  const title =
    state.kind === "inherited"
      ? `${label}: inherited from ${state.from}; edit ${state.from} or the extends list`
      : state.kind === "wildcard"
        ? `${label}: granted by a wildcard; untick to list the other actions explicitly`
        : `${label}: ${checked ? "granted" : "not granted"}`
  return (
    <td className="px-1 py-1 text-center">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={label}
        title={title}
        disabled={disabled || state.kind === "inherited"}
        onClick={onToggle}
        className={cn(
          "relative inline-grid size-6 place-items-center rounded-sm border transition-[background-color,border-color,transform] duration-100",
          "enabled:hover:-translate-y-px enabled:hover:border-foreground/40 disabled:cursor-not-allowed",
          state.kind === "off" && "border-border bg-transparent",
          (state.kind === "on" || state.kind === "wildcard") && cn(t.bg, t.border, t.text),
          state.kind === "inherited" && cn("border-dashed opacity-60", t.border, t.text),
          disabled && "opacity-50",
        )}
      >
        {checked && <Check className="size-3.5" strokeWidth={2.6} />}
        {state.kind === "wildcard" && <Asterisk className="absolute -top-1 -right-1 size-3 rounded-full bg-panel" strokeWidth={3} />}
      </button>
    </td>
  )
}

function AddKey({ label, existing, onAdd }: { label: string; existing: string[]; onAdd: (key: string) => void }) {
  const [value, setValue] = useState<string | null>(null)
  if (value === null)
    return (
      <Button variant="ghost" size="sm" className="h-6 gap-1 px-1.5 text-[11.5px] text-muted-foreground" onClick={() => setValue("")}>
        <Plus className="size-3" /> {label}
      </Button>
    )
  const error = value && !KEY_RE.test(value) ? "letters, digits, _ or -" : existing.includes(value) ? "already exists" : undefined
  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault()
        if (!value || error) return
        onAdd(value)
        setValue(null)
      }}
    >
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setValue(null)}
        onBlur={() => !value && setValue(null)}
        placeholder="role key"
        aria-label={label}
        className="h-6 w-28 rounded-sm border border-input bg-transparent px-1.5 font-mono text-[11.5px] outline-none focus-visible:border-ring"
      />
      <Button type="submit" size="sm" className="h-6 px-2 text-[11px]" disabled={!value || !!error}>
        Add
      </Button>
      {error && <span className="text-[11px] text-deny">{error}</span>}
    </form>
  )
}

function ColumnHead({ name, tone, locate, className }: { name: string; tone: GrantKind; locate?: string; className?: string }) {
  const open = () => {
    const s = useStore.getState()
    const span = locate ? s.compiled.locate(locate, name) : undefined
    s.setEditorView("text")
    if (span) requestAnimationFrame(() => s.focusRange(span.from, span.from))
  }
  return (
    <th className={cn("px-1 pb-1.5 align-bottom", className)}>
      <button
        type="button"
        onClick={open}
        title="Show in text"
        className={cn(
          "mx-auto block max-w-24 truncate font-mono text-[11px] font-medium transition-opacity hover:opacity-70",
          TONE[tone].text,
        )}
      >
        {name}
      </button>
    </th>
  )
}

/* -------------------------------------------------------- shared pieces */

interface Columns {
  topRoles: string[]
  /** resource roles, each tied to its resource */
  resRoles: { resource: string; role: string }[]
  userSets: string[]
}

/** Builds the edit for one ticked cell. */
function cellMutation(schema: Schema, res: Resource, col: { kind: GrantKind; key: string }, target: string, action: string): Mutation {
  const actions = Object.keys(res.actions)
  if (col.kind === "rbac") {
    const role = schema.roles.find((r) => r.key === col.key)!
    return {
      op: "setRolePermissions",
      role: col.key,
      permissions: toggle(role.permissions, action, actions, `${res.key}:*`, (a) => `${res.key}:${a}`),
    }
  }
  if (col.kind === "rebac") {
    const role = res.roles![col.key]
    return {
      op: "setResourceRolePermissions",
      resource: res.key,
      role: col.key,
      permissions: toggle(role.permissions, action, actions, "*", (a) => a),
    }
  }
  const current = ruleActions(schema, col.key, target)
  return { op: "setRuleActions", userSet: col.key, target, resource: res.key, actions: toggle(current, action, actions, "*", (a) => a) }
}

/**
 * Action rows for one resource (target = the resource) or one of its resource sets.
 * Resource-role columns that belong to another resource stay empty.
 */
function actionRows({
  schema,
  res,
  target,
  isSet,
  cols,
  disabled,
  mutate,
}: {
  schema: Schema
  res: Resource
  target: string
  isSet: boolean
  cols: Columns
  disabled: boolean
  mutate: (m: Mutation) => unknown
}) {
  return Object.keys(res.actions).map((a) => (
    <tr key={`${target}:${a}`} className="border-t border-border/60 transition-colors hover:bg-accent/40">
      <td className="sticky left-0 z-10 bg-panel py-1 pr-3 pl-6 font-mono text-[12px] whitespace-nowrap">{a}</td>
      {cols.topRoles.map((r) => (
        <Cell
          key={`t:${r}`}
          tone="rbac"
          label={`${r} → ${res.key}:${a}`}
          disabled={disabled}
          state={isSet ? { kind: "na" } : topRoleCell(schema, r, res, a)}
          onToggle={() => mutate(cellMutation(schema, res, { kind: "rbac", key: r }, target, a))}
        />
      ))}
      {cols.resRoles.map(({ resource, role }) =>
        resource !== res.key ? (
          <td key={`r:${resource}:${role}`} className="bg-muted/25" aria-hidden />
        ) : (
          <Cell
            key={`r:${resource}:${role}`}
            tone="rebac"
            label={`${res.key}#${role} → ${a}`}
            disabled={disabled}
            state={isSet ? { kind: "na" } : resourceRoleCell(res, role, a)}
            onToggle={() => mutate(cellMutation(schema, res, { kind: "rebac", key: role }, target, a))}
          />
        ),
      )}
      {cols.userSets.map((u) => (
        <Cell
          key={`u:${u}`}
          tone="abac"
          label={`${u} → ${a} on ${target}`}
          disabled={disabled}
          state={ruleCell(schema, u, target, a)}
          onToggle={() => mutate(cellMutation(schema, res, { kind: "abac", key: u }, target, a))}
        />
      ))}
      <td />
    </tr>
  ))
}

function GroupHead({ colSpan, tone, children }: { colSpan: number; tone: GrantKind; children: React.ReactNode }) {
  if (!colSpan) return null
  return (
    <th colSpan={colSpan} className={cn("px-1 pt-2 pb-1 text-[10px] font-semibold tracking-wide uppercase", TONE[tone].text)}>
      <div
        className={cn(
          "border-b pb-1 whitespace-nowrap",
          tone === "rbac" ? "border-rbac/40" : tone === "rebac" ? "border-rebac/40" : "border-abac/40",
        )}
      >
        {children}
      </div>
    </th>
  )
}

function SetGroupRow({ rs, span }: { rs: ResourceSet; span: number }) {
  return (
    <tr className="border-t">
      <td colSpan={span} className="bg-muted/40 py-1 pr-4 pl-6 text-[11px] text-muted-foreground">
        <span className="sticky left-6 inline-flex items-center gap-2">
          <span className="font-mono text-abac">{rs.key}</span>
          <span className="font-mono">where {printCondition(rs.conditions)}</span>
        </span>
      </td>
    </tr>
  )
}

const resourceSetsOf = (schema: Schema, res: Resource) =>
  schema.condition_sets.filter((s): s is ResourceSet => s.type === "resourceset" && s.resource_type === res.key)
const userSetsOf = (schema: Schema) => schema.condition_sets.filter((s): s is UserSet => s.type === "userset").map((u) => u.key)

/* ------------------------------------------------------ by resource view */

function ResourceSection({
  res,
  schema,
  disabled,
  mutate,
}: {
  res: Resource
  schema: Schema
  disabled: boolean
  mutate: (m: Mutation) => unknown
}) {
  const cols: Columns = {
    topRoles: schema.roles.map((r) => r.key),
    resRoles: Object.keys(res.roles ?? {}).map((role) => ({ resource: res.key, role })),
    userSets: userSetsOf(schema),
  }
  const resourceSets = resourceSetsOf(schema, res)
  const count = cols.topRoles.length + cols.resRoles.length + cols.userSets.length
  const rowProps = { schema, res, cols, disabled, mutate }

  return (
    <section className="overflow-hidden rounded-md border bg-panel">
      <header className="flex items-center gap-2 border-b px-4 py-2">
        <span className="font-mono text-[13px] font-semibold text-rebac">{res.key}</span>
        {res.name && <span className="text-[12px] text-muted-foreground">{res.name}</span>}
        <div className="ml-auto">
          <AddKey
            label="Resource role"
            existing={cols.resRoles.map((r) => r.role)}
            onAdd={(key) => mutate({ op: "addResourceRole", resource: res.key, key })}
          />
        </div>
      </header>
      {count === 0 ? (
        <p className="px-4 py-4 text-[12px] text-muted-foreground">
          No roles or user sets yet. Add a resource role, or a top-level role above.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-panel" />
                <GroupHead colSpan={cols.topRoles.length} tone="rbac">
                  Top-level roles
                </GroupHead>
                <GroupHead colSpan={cols.resRoles.length} tone="rebac">
                  Resource roles
                </GroupHead>
                <GroupHead colSpan={cols.userSets.length} tone="abac">
                  User sets
                </GroupHead>
                <th className="w-full" />
              </tr>
              <tr>
                <th className="sticky left-0 z-10 bg-panel pb-1.5 pl-6 text-left text-[11px] font-medium text-muted-foreground">Action</th>
                {cols.topRoles.map((r) => (
                  <ColumnHead key={r} name={r} tone="rbac" locate={`role:${r}`} />
                ))}
                {cols.resRoles.map(({ role }) => (
                  <ColumnHead key={role} name={role} tone="rebac" locate={`resource:${res.key}/role:${role}`} />
                ))}
                {cols.userSets.map((u) => (
                  <ColumnHead key={u} name={u} tone="abac" locate={`set:${u}`} />
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {actionRows({ ...rowProps, target: res.key, isSet: false })}
              {resourceSets.map((rs) => [
                <SetGroupRow key={`set:${rs.key}`} rs={rs} span={count + 2} />,
                ...actionRows({ ...rowProps, target: rs.key, isSet: true }),
              ])}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

/* --------------------------------------------------------- overview view */

/** Every resource, action and role in one matrix; headers and the action column stay put while scrolling. */
function OverviewMatrix({ schema, disabled, mutate }: { schema: Schema; disabled: boolean; mutate: (m: Mutation) => unknown }) {
  const cols: Columns = {
    topRoles: schema.roles.map((r) => r.key),
    resRoles: schema.resources.flatMap((res) => Object.keys(res.roles ?? {}).map((role) => ({ resource: res.key, role }))),
    userSets: userSetsOf(schema),
  }
  const count = cols.topRoles.length + cols.resRoles.length + cols.userSets.length
  const withRoles = schema.resources.filter((r) => Object.keys(r.roles ?? {}).length)
  const stickyHead = "sticky bg-panel"

  if (!count)
    return (
      <p className="rounded-md border border-dashed px-4 py-8 text-center text-[12.5px] text-muted-foreground">
        No roles or user sets yet.
      </p>
    )

  return (
    <table className="border-separate border-spacing-0 rounded-md border bg-panel">
      <thead className="sticky top-0 z-20 bg-panel">
        <tr>
          <th className={cn(stickyHead, "left-0 z-30")} />
          <GroupHead colSpan={cols.topRoles.length} tone="rbac">
            Top-level roles
          </GroupHead>
          {withRoles.map((res) => (
            <GroupHead key={res.key} colSpan={Object.keys(res.roles!).length} tone="rebac">
              {res.key} roles
            </GroupHead>
          ))}
          <GroupHead colSpan={cols.userSets.length} tone="abac">
            User sets
          </GroupHead>
          <th className="w-full" />
        </tr>
        <tr>
          <th className={cn(stickyHead, "left-0 z-30 border-b pb-1.5 pl-3 text-left text-[11px] font-medium text-muted-foreground")}>
            Resource · action
          </th>
          {cols.topRoles.map((r) => (
            <ColumnHead key={`t:${r}`} name={r} tone="rbac" locate={`role:${r}`} className="border-b" />
          ))}
          {cols.resRoles.map(({ resource, role }) => (
            <ColumnHead
              key={`r:${resource}:${role}`}
              name={role}
              tone="rebac"
              locate={`resource:${resource}/role:${role}`}
              className="border-b"
            />
          ))}
          {cols.userSets.map((u) => (
            <ColumnHead key={`u:${u}`} name={u} tone="abac" locate={`set:${u}`} className="border-b" />
          ))}
          <th className="border-b" />
        </tr>
      </thead>
      <tbody>
        {schema.resources.map((res) => {
          const rowProps = { schema, res, cols, disabled, mutate }
          return [
            <tr key={`res:${res.key}`}>
              <td colSpan={count + 2} className="border-t bg-muted/50 px-3 py-1.5">
                <span className="sticky left-3 inline-flex items-center gap-2">
                  <span className="font-mono text-[12.5px] font-semibold text-rebac">{res.key}</span>
                  {res.name && <span className="text-[11.5px] text-muted-foreground">{res.name}</span>}
                </span>
              </td>
            </tr>,
            ...actionRows({ ...rowProps, target: res.key, isSet: false }),
            ...resourceSetsOf(schema, res).flatMap((rs) => [
              <SetGroupRow key={`set:${rs.key}`} rs={rs} span={count + 2} />,
              ...actionRows({ ...rowProps, target: rs.key, isSet: true }),
            ]),
          ]
        })}
      </tbody>
    </table>
  )
}

/* ------------------------------------------------------------------ root */

export function PolicyMatrix() {
  const schema = useStore((s) => s.file.schema)
  const broken = useStore((s) => !s.compiled.file)
  const layout = useStore((s) => s.matrixLayout)
  const setLayout = useStore((s) => s.setMatrixLayout)
  // the store reports a failed edit itself
  const mutate = useStore((s) => s.mutate)

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2">
        <ToggleGroup
          type="single"
          size="sm"
          value={layout}
          onValueChange={(v) => v && setLayout(v as MatrixLayout)}
          aria-label="Matrix layout"
          className="rounded-md border p-0.5"
        >
          <ToggleGroupItem value="resource" className="h-6 gap-1 px-2 text-[11.5px] data-[state=on]:bg-accent">
            <Rows3 className="size-3.5" /> By resource
          </ToggleGroupItem>
          <ToggleGroupItem value="overview" className="h-6 gap-1 px-2 text-[11.5px] data-[state=on]:bg-accent">
            <Table2 className="size-3.5" /> Overview
          </ToggleGroupItem>
        </ToggleGroup>
        <span className="hidden text-[11.5px] text-muted-foreground xl:inline">Tick a cell to grant an action; the file updates.</span>
        <span className="ml-auto flex items-center gap-1.5">
          <KindBadge kind="rbac" />
          <KindBadge kind="rebac" />
          <KindBadge kind="abac" />
        </span>
        <AddKey label="Top-level role" existing={schema.roles.map((r) => r.key)} onAdd={(key) => mutate({ op: "addRole", key })} />
      </div>

      {/* one scroller for both layouts, so the overview's sticky headers and action column work */}
      <div className="min-h-0 flex-1 overflow-auto">
        <div className={cn("space-y-3 p-3", layout === "overview" && "w-max min-w-full")}>
          {broken && (
            <div className="flex items-center gap-2 rounded-md border border-deny/30 bg-deny/8 px-3 py-2 text-[12px]">
              <TriangleAlert className="size-3.5 text-deny" /> The text has syntax errors. The matrix shows the last valid policy and is
              read-only until they are fixed.
            </div>
          )}
          {schema.resources.length === 0 ? (
            <p className="rounded-md border border-dashed px-4 py-8 text-center text-[12.5px] text-muted-foreground">
              Declare a resource in the text view to start a matrix.
            </p>
          ) : layout === "overview" ? (
            <OverviewMatrix schema={schema} disabled={broken} mutate={mutate} />
          ) : (
            schema.resources.map((res) => <ResourceSection key={res.key} res={res} schema={schema} disabled={broken} mutate={mutate} />)
          )}
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="relative inline-grid size-4 place-items-center rounded-sm border border-rbac/60 bg-rbac/15 text-rbac">
                <Check className="size-3" strokeWidth={2.6} />
                <Asterisk className="absolute -top-1 -right-1 size-2.5 rounded-full bg-background" strokeWidth={3} />
              </span>
              from a wildcard
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-grid size-4 place-items-center rounded-sm border border-dashed border-rebac/60 text-rebac opacity-60">
                <Check className="size-3" strokeWidth={2.6} />
              </span>
              inherited through extends
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="font-mono">–</span> resource sets take ABAC rules only
            </span>
            <span>Click a column name to open it in the text.</span>
          </p>
        </div>
      </div>
    </div>
  )
}
