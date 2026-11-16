import { printCondition, type PolicyFile, type Schema } from "@/lib/policy"

export type NodeKind = "resource" | "resource-role" | "role" | "userset" | "resourceset" | "user" | "instance" | "tenant"

export interface GNode {
  id: string
  kind: NodeKind
  r: number
  color: string
  title: string
  subtitle: string
  rows: [string, string][]
  /** SourceMap key of the definition, for jump-to-source */
  locate?: string
  jsonNeedle?: string
}

export interface GEdge {
  id: string
  source: string
  target: string
  label?: string
  color: string
  dashed?: boolean
  arrow?: boolean
  distance?: number
  strength?: number
}

export interface Graph {
  nodes: GNode[]
  edges: GEdge[]
}

export const KIND_LABEL: Record<NodeKind, string> = {
  resource: "Resource",
  "resource-role": "Resource role",
  role: "Top-level role",
  userset: "User set",
  resourceset: "Resource set",
  user: "User",
  instance: "Resource instance",
  tenant: "Tenant",
}

const MUTED = "var(--muted-foreground)"
const fmt = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v))
const list = (xs: string[]) => (xs.length ? xs.join(", ") : "—")

/** Distinct, non-violet hues for instances of each resource type. */
const TYPE_COLORS = [
  "var(--rebac)",
  "var(--abac)",
  "oklch(0.72 0.15 150)",
  "oklch(0.7 0.16 30)",
  "oklch(0.74 0.12 225)",
  "oklch(0.78 0.15 115)",
  "oklch(0.7 0.15 0)",
]

export function typeColor(schema: Schema, type: string) {
  const i = schema.resources.findIndex((r) => r.key === type)
  return TYPE_COLORS[(i < 0 ? schema.resources.length : i) % TYPE_COLORS.length]
}

export function policyGraph(schema: Schema): Graph {
  const nodes: GNode[] = []
  const edges: GEdge[] = []
  const resources = new Set(schema.resources.map((r) => r.key))
  const sets = new Map(schema.condition_sets.map((s) => [s.key, s]))

  for (const r of schema.resources) {
    nodes.push({
      id: `resource:${r.key}`,
      kind: "resource",
      r: 26,
      color: "var(--rebac)",
      title: r.key,
      subtitle: r.name ?? KIND_LABEL.resource,
      rows: [
        ["actions", list(Object.keys(r.actions))],
        ...Object.entries(r.attributes ?? {}).map(([k, a]): [string, string] => [`attr ${k}`, a.type]),
        ...Object.entries(r.relations ?? {}).map(([k, to]): [string, string] => [`rel ${k}`, to + (to === r.key ? " (self)" : "")]),
      ],
      locate: `resource:${r.key}`,
      jsonNeedle: r.key,
    })
    for (const [roleKey, role] of Object.entries(r.roles ?? {})) {
      const id = `rrole:${r.key}:${roleKey}`
      const derived = (role.granted_to?.users_with_role ?? []).map((d) => `${d.on_resource}#${d.role} via ${d.linked_by_relation}`)
      nodes.push({
        id,
        kind: "resource-role",
        r: 13,
        color: "var(--rebac)",
        title: `${r.key}#${roleKey}`,
        subtitle: role.name ?? KIND_LABEL["resource-role"],
        rows: [
          ["permissions", role.permissions.includes("*") ? "* (all actions)" : list(role.permissions)],
          ...(role.extends?.length ? [["extends", role.extends.join(", ")] as [string, string]] : []),
          ...derived.map((d): [string, string] => ["derived from", d]),
        ],
        locate: `resource:${r.key}/role:${roleKey}`,
        jsonNeedle: roleKey,
      })
      edges.push({ id: `has:${id}`, source: `resource:${r.key}`, target: id, color: "var(--rebac)", distance: 50, strength: 1 })
      for (const e of role.extends ?? [])
        if (r.roles?.[e])
          edges.push({
            id: `ext:${id}:${e}`,
            source: `rrole:${r.key}:${e}`,
            target: id,
            label: "extended by",
            color: MUTED,
            dashed: true,
            arrow: true,
            distance: 60,
            strength: 0.05,
          })
      for (const d of role.granted_to?.users_with_role ?? [])
        // a role derived from itself along a self relation (folder#owner via parent) is listed in the tooltip, not drawn
        if (resources.has(d.on_resource) && !(d.on_resource === r.key && d.role === roleKey))
          edges.push({
            id: `derive:${id}:${d.on_resource}:${d.role}:${d.linked_by_relation}`,
            source: `rrole:${d.on_resource}:${d.role}`,
            target: id,
            label: `via ${d.linked_by_relation}`,
            color: "var(--rebac)",
            dashed: true,
            arrow: true,
            distance: 160,
            strength: 0.05,
          })
    }
  }

  for (const r of schema.resources)
    for (const [rel, subject] of Object.entries(r.relations ?? {}))
      if (subject !== r.key && resources.has(subject))
        edges.push({
          id: `rel:${r.key}:${rel}`,
          source: `resource:${subject}`,
          target: `resource:${r.key}`,
          label: rel,
          color: MUTED,
          arrow: true,
          distance: 170,
        })

  for (const role of schema.roles) {
    nodes.push({
      id: `role:${role.key}`,
      kind: "role",
      r: 20,
      color: "var(--rbac)",
      title: role.key,
      subtitle: role.name ?? KIND_LABEL.role,
      rows: [["permissions", list(role.permissions)]],
      locate: `role:${role.key}`,
      jsonNeedle: role.key,
    })
    const byRes = new Map<string, string[]>()
    for (const p of role.permissions) {
      const [res, action] = p.split(":")
      if (resources.has(res)) byRes.set(res, [...(byRes.get(res) ?? []), action])
    }
    for (const [res, actions] of byRes)
      edges.push({
        id: `grant:${role.key}:${res}`,
        source: `role:${role.key}`,
        target: `resource:${res}`,
        label: actions.join(", "),
        color: "var(--rbac)",
        arrow: true,
        distance: 150,
      })
  }

  // ABAC rules, grouped for the set tooltips: "document:read, document:edit on own_unlocked"
  const grouped = (
    pick: (r: (typeof schema.condition_set_rules)[number]) => string,
    other: (r: (typeof schema.condition_set_rules)[number]) => string,
  ) => {
    const out = new Map<string, Map<string, string[]>>()
    for (const r of schema.condition_set_rules) {
      const bySet = out.get(pick(r)) ?? new Map<string, string[]>()
      bySet.set(other(r), [...(bySet.get(other(r)) ?? []), r.permission])
      out.set(pick(r), bySet)
    }
    return out
  }
  const byUserSet = grouped(
    (r) => r.user_set,
    (r) => r.resource_set,
  )
  const byResourceSet = grouped(
    (r) => r.resource_set,
    (r) => r.user_set,
  )
  const ruleRows = (label: string, joiner: string, m?: Map<string, string[]>): [string, string][] =>
    m?.size ? [...m].map(([set, perms], i): [string, string] => [i ? "" : label, `${perms.join(", ")} ${joiner} ${set}`]) : [[label, "—"]]

  for (const s of schema.condition_sets) {
    nodes.push({
      id: `set:${s.key}`,
      kind: s.type,
      r: 20,
      color: "var(--abac)",
      title: s.key,
      subtitle: s.name ?? (s.type === "userset" ? KIND_LABEL.userset : `${KIND_LABEL.resourceset} on ${s.resource_type}`),
      rows: [
        ["where", printCondition(s.conditions)],
        ...(s.type === "userset"
          ? ruleRows("permissions", "on", byUserSet.get(s.key))
          : ruleRows("granted to", "for", byResourceSet.get(s.key))),
      ],
      locate: `set:${s.key}`,
      jsonNeedle: s.key,
    })
    if (s.type === "resourceset" && resources.has(s.resource_type))
      edges.push({
        id: `on:${s.key}`,
        source: `set:${s.key}`,
        target: `resource:${s.resource_type}`,
        label: "filters",
        color: "var(--abac)",
        dashed: true,
        arrow: true,
        distance: 120,
      })
  }

  const rules = new Map<string, string[]>()
  for (const rule of schema.condition_set_rules) {
    const id = `${rule.user_set}\u0000${rule.resource_set}`
    rules.set(id, [...(rules.get(id) ?? []), rule.permission.split(":")[1]])
  }
  for (const [id, actions] of rules) {
    const [us, rs] = id.split("\u0000")
    const target = sets.has(rs) ? `set:${rs}` : resources.has(rs) ? `resource:${rs}` : null
    if (!sets.has(us) || !target) continue
    edges.push({
      id: `rule:${id}`,
      source: `set:${us}`,
      target,
      label: actions.join(", "),
      color: "var(--abac)",
      arrow: true,
      distance: 140,
    })
  }

  return { nodes, edges }
}

export function dataGraph(file: PolicyFile): Graph {
  const nodes: GNode[] = []
  const edges: GEdge[] = []
  const { data, schema } = file
  const ids = new Set<string>()
  const colorOf = (type: string) => typeColor(schema, type)

  const addTenant = (key: string) => {
    const id = `tenant:${key}`
    if (ids.has(id)) return id
    ids.add(id)
    const t = schema.tenants.find((x) => x.key === key)
    nodes.push({
      id,
      kind: "tenant",
      r: 22,
      color: MUTED,
      title: key,
      subtitle: t?.name ?? KIND_LABEL.tenant,
      rows: t ? [] : [["note", "not declared in the schema"]],
      locate: `tenant:${key}`,
      jsonNeedle: key,
    })
    return id
  }

  const addInstance = (ref: string) => {
    const id = `instance:${ref}`
    if (ids.has(id)) return id
    ids.add(id)
    const [type, ...rest] = ref.split(":")
    const key = rest.join(":")
    const inst = data.resource_instances.find((i) => i.resource === type && i.key === key)
    nodes.push({
      id,
      kind: "instance",
      r: 16,
      color: colorOf(type),
      title: ref,
      subtitle: schema.resources.find((r) => r.key === type)?.name ?? type,
      rows: [
        ...(inst?.tenant ? [["tenant", inst.tenant] as [string, string]] : []),
        ...Object.entries(inst?.attributes ?? {}).map(([k, v]): [string, string] => [k, fmt(v)]),
        ...(inst ? [] : [["note", "not declared as an instance"] as [string, string]]),
      ],
      locate: `instance:${type}:${key}`,
      jsonNeedle: key,
    })
    if (inst?.tenant) {
      const t = addTenant(inst.tenant)
      edges.push({ id: `in:${id}`, source: id, target: t, color: MUTED, dashed: true, distance: 130 })
    }
    return id
  }

  for (const u of data.users) {
    const id = `user:${u.key}`
    ids.add(id)
    nodes.push({
      id,
      kind: "user",
      r: 18,
      color: "var(--rbac)",
      title: u.key,
      subtitle: u.email ?? KIND_LABEL.user,
      rows: [
        ...Object.entries(u.attributes ?? {}).map(([k, v]): [string, string] => [k, fmt(v)]),
        ...(u.roles ?? []).map((r): [string, string] => [
          "role",
          r.resource_instance ? `${r.role} on ${r.resource_instance}` : `${r.role} @${r.tenant ?? "default"}`,
        ]),
      ],
      locate: `user:${u.key}`,
      jsonNeedle: u.key,
    })
  }
  for (const i of data.resource_instances) addInstance(`${i.resource}:${i.key}`)

  for (const u of data.users)
    (u.roles ?? []).forEach((r, n) => {
      const target = r.resource_instance ? addInstance(r.resource_instance) : addTenant(r.tenant ?? "default")
      edges.push({
        id: `assign:${u.key}:${n}`,
        source: `user:${u.key}`,
        target,
        label: r.role,
        color: r.resource_instance ? "var(--rebac)" : "var(--rbac)",
        arrow: true,
        distance: 120,
      })
    })

  data.relationship_tuples.forEach((t, n) => {
    edges.push({
      id: `tuple:${n}`,
      source: addInstance(t.subject),
      target: addInstance(t.object),
      label: t.relation,
      color: "var(--foreground)",
      arrow: true,
      distance: 110,
    })
  })

  return { nodes, edges }
}
