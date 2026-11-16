import { evaluate, type ConditionCheck, type EvalContext } from "./conditions"
import type { Attributes, PolicyFile, Resource, ResourceInstance, User } from "./types"

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

  constructor(file: PolicyFile) {
    this.file = file
    this.resources = new Map(file.schema.resources.map((r) => [r.key, r]))
    this.users = new Map(file.data.users.map((u) => [u.key, u]))
    this.instances = new Map(file.data.resource_instances.map((i) => [`${i.resource}:${i.key}`, i]))
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
  rolesOnInstance(userKey: string, ref: string, visiting = new Set<string>()): Map<string, string[]> {
    const out = new Map<string, string[]>()
    if (visiting.has(ref)) return out
    const nextVisiting = new Set(visiting).add(ref)
    const [type] = ref.split(":")
    const user = this.users.get(userKey)

    for (const a of user?.roles ?? [])
      if (a.resource_instance === ref && !out.has(a.role)) out.set(a.role, [`${userKey} is assigned ${type}#${a.role} on ${ref}`])

    const res = this.resources.get(type)
    for (const [roleKey, role] of Object.entries(res?.roles ?? {})) {
      if (out.has(roleKey)) continue
      for (const d of role.granted_to?.users_with_role ?? []) {
        const tuples = this.file.data.relationship_tuples.filter(
          (t) => t.object === ref && t.relation === d.linked_by_relation && t.subject.startsWith(`${d.on_resource}:`),
        )
        for (const t of tuples) {
          const via = this.rolesOnInstance(userKey, t.subject, nextVisiting).get(d.role)
          if (via) {
            out.set(roleKey, [...via, `${t.subject} is ${t.relation} of ${ref}`, `${d.on_resource}#${d.role} derives ${type}#${roleKey}`])
            break
          }
        }
        if (out.has(roleKey)) break
      }
    }
    return out
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
      const role = this.file.schema.roles.find((r) => r.key === a.role)
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
