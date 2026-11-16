import { evaluate, type ConditionCheck, type EvalContext } from "./conditions"
import type { Attributes, PolicyFile, Resource, ResourceInstance, Role, User } from "./types"

export interface CheckInput {
  user: string
  action: string
  /** `type:key` for an instance, or `type` for a type-level check */
  resource: string
  tenant?: string
  context?: { user?: Attributes; resource?: Attributes }
}

export type GrantKind = "rbac" | "rebac" | "abac"

export interface Grant {
  kind: GrantKind
  summary: string
  steps: string[]
  checks?: ConditionCheck[]
}

export interface Miss {
  kind: GrantKind
  summary: string
  checks?: ConditionCheck[]
}

export interface CheckResult {
  allowed: boolean
  grants: Grant[]
  misses: Miss[]
  tenant: string
  errors: string[]
  ms: number
}

const DEFAULT_TENANT = "default"

export class Engine {
  private file: PolicyFile
  private resources: Map<string, Resource>
  private users: Map<string, User>
  private instances: Map<string, ResourceInstance>
  private topRoles: Map<string, Role>
  /** `object \0 relation` -> subjects */
  private tuplesTo = new Map<string, string[]>()
  /** `user \0 instance` -> roles assigned directly on it */
  private directRoles = new Map<string, string[]>()
  /** `user \0 instance` -> roles held, once fully worked out */
  private roleMemo = new Map<string, Map<string, string[]>>()
  /** instances on the current derivation path, to stop at cycles */
  private onPath = new Set<string>()

  constructor(file: PolicyFile) {
    this.file = file
    this.resources = new Map(file.schema.resources.map((r) => [r.key, r]))
    this.users = new Map(file.data.users.map((u) => [u.key, u]))
    this.instances = new Map(file.data.resource_instances.map((i) => [`${i.resource}:${i.key}`, i]))
    this.topRoles = new Map(file.schema.roles.map((r) => [r.key, r]))
    for (const t of file.data.relationship_tuples) {
      const k = `${t.object}\u0000${t.relation}`
      this.tuplesTo.set(k, [...(this.tuplesTo.get(k) ?? []), t.subject])
    }
    for (const u of file.data.users)
      for (const a of u.roles ?? [])
        if (a.resource_instance) {
          const k = `${u.key}\u0000${a.resource_instance}`
          this.directRoles.set(k, [...(this.directRoles.get(k) ?? []), a.role])
        }
  }

  private resourceRoleClosure(res: Resource, start: string): Map<string, string[]> {
    const out = new Map<string, string[]>()
    const walk = (key: string, chain: string[]) => {
      if (out.has(key)) return
      out.set(key, chain)
      for (const e of res.roles?.[key]?.extends ?? []) walk(e, [...chain, `${res.key}#${key} extends ${res.key}#${e}`])
    }
    walk(start, [])
    return out
  }

  /**
   * Roles a user holds on one resource instance: direct assignments plus roles
   * derived through relationship tuples (Permit "role derivation").
   */
  rolesOnInstance(userKey: string, ref: string): Map<string, string[]> {
    return this.rolesOn(userKey, ref).roles
  }

  /**
   * Memoised per (user, instance). A result that stopped at a cycle may miss roles
   * reachable another way, so it is returned but not remembered.
   */
  private rolesOn(userKey: string, ref: string): { roles: Map<string, string[]>; complete: boolean } {
    const key = `${userKey}\u0000${ref}`
    const known = this.roleMemo.get(key)
    if (known) return { roles: known, complete: true }
    if (this.onPath.has(key)) return { roles: new Map(), complete: false }
    this.onPath.add(key)

    const out = new Map<string, string[]>()
    let complete = true
    const [type] = ref.split(":")
    for (const role of this.directRoles.get(key) ?? [])
      if (!out.has(role)) out.set(role, [`${userKey} is assigned ${type}#${role} on ${ref}`])

    const res = this.resources.get(type)
    for (const [roleKey, role] of Object.entries(res?.roles ?? {})) {
      if (out.has(roleKey)) continue
      for (const d of role.granted_to?.users_with_role ?? []) {
        for (const subject of this.tuplesTo.get(`${ref}\u0000${d.linked_by_relation}`) ?? []) {
          if (!subject.startsWith(`${d.on_resource}:`)) continue
          const sub = this.rolesOn(userKey, subject)
          complete &&= sub.complete
          const via = sub.roles.get(d.role)
          if (via) {
            out.set(roleKey, [...via, `${subject} is ${d.linked_by_relation} of ${ref}`, `${d.on_resource}#${d.role} derives ${type}#${roleKey}`])
            break
          }
        }
        if (out.has(roleKey)) break
      }
    }

    this.onPath.delete(key)
    if (complete) this.roleMemo.set(key, out)
    return { roles: out, complete }
  }

  check(input: CheckInput): CheckResult {
    const t0 = performance.now()
    const grants: Grant[] = []
    const misses: Miss[] = []
    const errors: string[] = []
    const [type, instanceKey] = splitRef(input.resource)
    const res = this.resources.get(type)
    const instance = instanceKey ? this.instances.get(`${type}:${instanceKey}`) : undefined
    const tenant = input.tenant || instance?.tenant || DEFAULT_TENANT
    const user = this.users.get(input.user)
    const permission = `${type}:${input.action}`

    const done = (): CheckResult => ({ allowed: grants.length > 0, grants, misses, tenant, errors, ms: performance.now() - t0 })

    if (!res) {
      errors.push(`Unknown resource '${type}'`)
      return done()
    }
    if (!(input.action in res.actions)) {
      errors.push(`Resource '${type}' has no action '${input.action}'`)
      return done()
    }
    if (!user) errors.push(`User '${input.user}' is not in the data; only ABAC rules on context attributes can match`)
    if (instanceKey && !instance) errors.push(`Instance '${type}:${instanceKey}' is not in the data; it has no attributes or tenant`)

    // RBAC: top-level roles assigned in the resource's tenant
    const tenantRoles = (user?.roles ?? []).filter((a) => !a.resource_instance && (a.tenant ?? DEFAULT_TENANT) === tenant)
    for (const a of tenantRoles) {
      const role = this.topRoles.get(a.role)
      const hit = role?.permissions.find((p) => p === permission || p === `${type}:*`)
      if (hit)
        grants.push({
          kind: "rbac",
          summary: `Role '${a.role}' in tenant '${tenant}' grants ${permission}`,
          steps: [`${input.user} is assigned ${a.role} @${tenant}`, `${a.role} has ${hit}`],
        })
    }
    if (!grants.some((g) => g.kind === "rbac")) {
      const held = tenantRoles.map((a) => a.role)
      misses.push({
        kind: "rbac",
        summary: held.length
          ? `Top-level roles in '${tenant}' (${held.join(", ")}) do not grant ${permission}`
          : `${input.user} has no top-level role in tenant '${tenant}'`,
      })
    }

    // ReBAC: instance roles, direct or derived
    if (instanceKey) {
      const ref = `${type}:${instanceKey}`
      const held = this.rolesOnInstance(input.user, ref)
      let any = false
      for (const [roleKey, path] of held) {
        for (const [r2, chain] of this.resourceRoleClosure(res, roleKey)) {
          const perms = res.roles?.[r2]?.permissions ?? []
          if (perms.includes(input.action) || perms.includes("*")) {
            any = true
            grants.push({
              kind: "rebac",
              summary: `Instance role ${type}#${roleKey} on ${ref} grants ${input.action}`,
              steps: [...path, ...chain, `${type}#${r2} allows ${perms.includes("*") ? "*" : input.action}`],
            })
            break
          }
        }
      }
      if (!any)
        misses.push({
          kind: "rebac",
          summary: held.size
            ? `Roles on ${ref} (${[...held.keys()].join(", ")}) do not allow ${input.action}`
            : `${input.user} holds no role on ${ref}, directly or through relationships`,
        })
    }

    // ABAC: user set x resource set rules
    const ctx: EvalContext = {
      user: { key: input.user, email: user?.email, first_name: user?.first_name, ...user?.attributes, ...input.context?.user },
      resource: { key: instanceKey, type, tenant, ...instance?.attributes, ...input.context?.resource },
    }
    const rules = this.file.schema.condition_set_rules.filter((r) => r.permission === permission || r.permission === `${type}:*`)
    for (const rule of rules) {
      const us = this.file.schema.condition_sets.find((s) => s.key === rule.user_set)
      const rs = this.file.schema.condition_sets.find((s) => s.key === rule.resource_set)
      if (!us || us.type !== "userset") continue
      const checks: ConditionCheck[] = []
      const inUserSet = evaluate(us.conditions, ctx, checks)
      let inResourceSet = rule.resource_set === type
      if (rs?.type === "resourceset") inResourceSet = rs.resource_type === type && evaluate(rs.conditions, ctx, checks)
      const label = `${us.name ?? us.key} → ${rs ? (rs.name ?? rs.key) : `all ${type}`}`
      if (inUserSet && inResourceSet)
        grants.push({
          kind: "abac",
          summary: `ABAC rule ${label} grants ${rule.permission}`,
          steps: [
            `${input.user} is in user set '${us.key}'`,
            rs ? `${input.resource} is in resource set '${rs.key}'` : `rule covers every ${type}`,
          ],
          checks,
        })
      else misses.push({ kind: "abac", summary: `ABAC rule ${label} does not match`, checks })
    }
    if (!rules.length) misses.push({ kind: "abac", summary: `No ABAC rule grants ${permission}` })

    return done()
  }

  /** Every action of `resource` the user may perform, for the permission matrix. */
  allowedActions(userKey: string, resource: string, tenant?: string): Record<string, GrantKind[]> {
    const [type] = splitRef(resource)
    const res = this.resources.get(type)
    const out: Record<string, GrantKind[]> = {}
    for (const action of Object.keys(res?.actions ?? {})) {
      const r = this.check({ user: userKey, action, resource, tenant })
      out[action] = [...new Set(r.grants.map((g) => g.kind))]
    }
    return out
  }
}

export function splitRef(ref: string): [string, string | undefined] {
  const i = ref.indexOf(":")
  return i < 0 ? [ref, undefined] : [ref.slice(0, i), ref.slice(i + 1)]
}
