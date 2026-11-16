import {
  emptyData,
  emptySchema,
  type ConditionSet,
  type Diagnostic,
  type PolicyFile,
  type Resource,
  type ResourceRole,
  type Role,
} from "./types"

export class JsonPolicyError extends Error {
  from: number
  to: number
  constructor(message: string, from = 0, to = 0) {
    super(message)
    this.from = from
    this.to = to
  }
}

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v)

function syntaxErrorOffset(src: string, msg: string): number {
  const pos = /position (\d+)/.exec(msg)
  if (pos) return Number(pos[1])
  const lc = /line (\d+) column (\d+)/.exec(msg)
  if (lc) {
    const lines = src.split("\n")
    let off = 0
    for (let i = 0; i < Number(lc[1]) - 1; i++) off += lines[i].length + 1
    return off + Number(lc[2]) - 1
  }
  return src.length
}

/** Accepts `actions` as a Permit action map or a plain list. */
function normalizeActions(v: unknown): Resource["actions"] {
  if (Array.isArray(v)) return Object.fromEntries(v.map((a) => [String(a), {}]))
  if (isObj(v)) return Object.fromEntries(Object.entries(v).map(([k, a]) => [k, isObj(a) ? (a as { name?: string }) : {}]))
  return {}
}

/** Accepts resource `roles` as a Permit role map or a list of `{ key, ... }`. */
function normalizeResourceRoles(v: unknown): Record<string, ResourceRole> | undefined {
  if (!v) return undefined
  const entries: [string, Obj][] = Array.isArray(v)
    ? v.filter(isObj).map((r) => [String(r.key), r])
    : isObj(v)
      ? Object.entries(v).map(([k, r]) => [k, isObj(r) ? r : {}])
      : []
  return Object.fromEntries(
    entries.map(([key, r]) => {
      const role: ResourceRole = { permissions: Array.isArray(r.permissions) ? r.permissions.map(String) : [] }
      if (typeof r.name === "string") role.name = r.name
      if (Array.isArray(r.extends) && r.extends.length) role.extends = r.extends.map(String)
      const granted = isObj(r.granted_to) ? r.granted_to.users_with_role : undefined
      if (Array.isArray(granted) && granted.length) role.granted_to = { users_with_role: granted as never }
      return [key, role]
    }),
  )
}

/** Accepts `relations` as `{ parent: "folder" }` or Permit's `{ parent: { subject_resource: "folder" } }`. */
function normalizeRelations(v: unknown): Record<string, string> | undefined {
  if (!isObj(v)) return undefined
  return Object.fromEntries(Object.entries(v).map(([k, r]) => [k, isObj(r) ? String(r.subject_resource ?? r.resource ?? "") : String(r)]))
}

function asArray<T>(v: unknown, field: string): T[] {
  if (v === undefined) return []
  if (Array.isArray(v)) return v as T[]
  if (isObj(v)) return Object.entries(v).map(([key, val]) => ({ key, ...(val as Obj) }) as T)
  throw new JsonPolicyError(`"${field}" must be an array`)
}

export function normalizePolicy(raw: unknown): PolicyFile {
  if (!isObj(raw)) throw new JsonPolicyError("Policy JSON must be an object")
  const root: Obj = isObj(raw.schema) ? { ...raw.schema, data: raw.data, tests: raw.tests } : raw

  const schema = emptySchema()
  schema.tenants = asArray<Obj>(root.tenants, "tenants").map((t) => ({
    key: String(t.key),
    ...(t.name ? { name: String(t.name) } : {}),
  }))
  schema.resources = asArray<Obj>(root.resources, "resources").map((r) => {
    const res: Resource = { key: String(r.key), ...(r.name ? { name: String(r.name) } : {}), actions: normalizeActions(r.actions) }
    if (isObj(r.attributes) && Object.keys(r.attributes).length) res.attributes = r.attributes as Resource["attributes"]
    const rel = normalizeRelations(r.relations)
    if (rel && Object.keys(rel).length) res.relations = rel
    const roles = normalizeResourceRoles(r.roles)
    if (roles && Object.keys(roles).length) res.roles = roles
    return res
  })
  schema.roles = asArray<Obj>(root.roles, "roles").map((r) => {
    const role: Role = { key: String(r.key), permissions: Array.isArray(r.permissions) ? r.permissions.map(String) : [] }
    if (r.name) role.name = String(r.name)
    return role
  })
  schema.condition_sets = asArray<Obj>(root.condition_sets, "condition_sets").map((s) => {
    const base = { key: String(s.key), ...(s.name ? { name: String(s.name) } : {}), conditions: (s.conditions ?? { allOf: [] }) as never }
    if (s.type === "resourceset") {
      const rt = s.resource_type ?? (isObj(s.resource) ? s.resource.key : s.resource)
      return { ...base, type: "resourceset", resource_type: String(rt ?? "") } satisfies ConditionSet
    }
    return { ...base, type: "userset" } satisfies ConditionSet
  })
  schema.condition_set_rules = asArray<Obj>(root.condition_set_rules, "condition_set_rules").map((r) => ({
    user_set: String(r.user_set),
    permission: String(r.permission),
    resource_set: String(r.resource_set),
  }))

  const data = emptyData()
  const d = isObj(root.data) ? root.data : {}
  data.users = asArray(d.users, "data.users")
  data.resource_instances = asArray<Obj>(d.resource_instances, "data.resource_instances").map((i) => ({
    ...(i as object),
    key: String(i.key),
    resource: String(i.resource),
  }))
  data.relationship_tuples = asArray(d.relationship_tuples, "data.relationship_tuples")

  return { schema, data, tests: asArray(root.tests, "tests") }
}

/** Top-level roles have no inheritance; only resource roles may carry `extends`. */
function rejectTopLevelExtends(src: string, raw: unknown) {
  if (!isObj(raw)) return
  const root = isObj(raw.schema) ? raw.schema : raw
  const roles = Array.isArray(root.roles)
    ? root.roles
    : isObj(root.roles)
      ? Object.entries(root.roles).map(([key, v]) => ({ key, ...(v as Obj) }))
      : []
  for (const r of roles) {
    if (!isObj(r) || !("extends" in r)) continue
    if (Array.isArray(r.extends) && !r.extends.length) continue
    const keyAt = src.indexOf(JSON.stringify(String(r.key)))
    const at = src.indexOf('"extends"', Math.max(keyAt, 0))
    throw new JsonPolicyError(
      `Top-level role '${r.key}' cannot extend other roles; list its permissions directly. Only resource roles use "extends"`,
      at < 0 ? 0 : at,
      at < 0 ? 0 : at + 9,
    )
  }
}

export function parseJson(src: string): PolicyFile {
  let raw: unknown
  try {
    raw = JSON.parse(src)
  } catch (e) {
    const msg = (e as Error).message
    const at = syntaxErrorOffset(src, msg)
    throw new JsonPolicyError(msg.replace(/^JSON\.parse: /, ""), at, at + 1)
  }
  rejectTopLevelExtends(src, raw)
  return normalizePolicy(raw)
}

export function jsonErrorToDiagnostic(e: unknown): Diagnostic {
  if (e instanceof JsonPolicyError) return { message: e.message, severity: "error", from: e.from, to: e.to }
  return { message: String((e as Error)?.message ?? e), severity: "error", from: 0, to: 0 }
}

/** Canonical JSON layout: Permit-style schema objects at the top level, then `data` and `tests`. */
export function toJsonObject(file: PolicyFile, opts: { schema?: boolean; data?: boolean; tests?: boolean } = {}) {
  const { schema: withSchema = true, data: withData = true, tests: withTests = true } = opts
  const out: Obj = {}
  if (withSchema) Object.assign(out, file.schema)
  if (withData) out.data = file.data
  if (withTests) out.tests = file.tests
  return out
}

export function printJson(file: PolicyFile, opts?: { schema?: boolean; data?: boolean; tests?: boolean }): string {
  return JSON.stringify(toJsonObject(file, opts), null, 2) + "\n"
}

/** Best-effort location of a key inside JSON text, for semantic diagnostics. */
export function locateInJson(src: string, needle: string): { from: number; to: number } | undefined {
  const quoted = JSON.stringify(needle)
  const i = src.indexOf(quoted)
  return i < 0 ? undefined : { from: i, to: i + quoted.length }
}
