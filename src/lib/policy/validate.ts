import { attributesOf } from "./conditions"
import type { PolicyFile } from "./types"

export interface Issue {
  message: string
  severity: "error" | "warning"
  /** SourceMap key of the DSL entity this issue belongs to */
  dslKey?: string
  /** a string to search for in JSON text */
  jsonNeedle?: string
  scope: "schema" | "data" | "tests"
}

const BUILTIN_RESOURCE_ATTRS = new Set(["key", "type", "tenant"])

export function validate(file: PolicyFile): Issue[] {
  const issues: Issue[] = []
  const { schema, data, tests } = file
  const add = (scope: Issue["scope"], severity: Issue["severity"], message: string, dslKey?: string, jsonNeedle?: string) =>
    issues.push({ scope, severity, message, dslKey, jsonNeedle })

  const resources = new Map(schema.resources.map((r) => [r.key, r]))
  const roles = new Map(schema.roles.map((r) => [r.key, r]))
  const sets = new Map(schema.condition_sets.map((s) => [s.key, s]))
  const tenants = new Set(schema.tenants.map((t) => t.key))
  const instances = new Set(data.resource_instances.map((i) => `${i.resource}:${i.key}`))

  const dupes = (keys: string[], what: string, prefix: string) => {
    const seen = new Set<string>()
    for (const k of keys) {
      if (seen.has(k)) add("schema", "error", `Duplicate ${what} '${k}'`, `${prefix}:${k}`, k)
      seen.add(k)
    }
  }
  dupes(
    schema.resources.map((r) => r.key),
    "resource",
    "resource",
  )
  dupes(
    schema.roles.map((r) => r.key),
    "role",
    "role",
  )
  dupes(
    schema.condition_sets.map((s) => s.key),
    "condition set",
    "set",
  )

  for (const r of schema.resources) {
    const rk = `resource:${r.key}`
    if (!Object.keys(r.actions).length) add("schema", "warning", `Resource '${r.key}' has no actions`, rk, r.key)
    for (const [rel, target] of Object.entries(r.relations ?? {}))
      if (!resources.has(target))
        add("schema", "error", `Relation '${r.key}.${rel}' points to unknown resource '${target}'`, `${rk}/relation:${rel}`, rel)
    for (const [roleKey, role] of Object.entries(r.roles ?? {})) {
      const key = `${rk}/role:${roleKey}`
      if (roles.has(roleKey))
        add("schema", "warning", `Resource role '${r.key}#${roleKey}' shares its name with a top-level role`, key, roleKey)
      for (const p of role.permissions)
        if (p !== "*" && !(p in r.actions)) add("schema", "error", `Role '${r.key}#${roleKey}' grants unknown action '${p}'`, key, roleKey)
      for (const e of role.extends ?? [])
        if (!r.roles?.[e]) add("schema", "error", `Role '${r.key}#${roleKey}' extends unknown role '${e}'`, key, roleKey)
      for (const d of role.granted_to?.users_with_role ?? []) {
        const dk = `${rk}/derive:${roleKey}<-${d.on_resource}#${d.role}`
        const src = resources.get(d.on_resource)
        if (!src) {
          add("schema", "error", `Derivation of '${r.key}#${roleKey}' uses unknown resource '${d.on_resource}'`, dk, d.on_resource)
          continue
        }
        if (!src.roles?.[d.role]) add("schema", "error", `Resource '${d.on_resource}' has no role '${d.role}'`, dk, d.role)
        const rel = r.relations?.[d.linked_by_relation]
        if (!rel) add("schema", "error", `Resource '${r.key}' has no relation '${d.linked_by_relation}'`, dk, d.linked_by_relation)
        else if (rel !== d.on_resource)
          add(
            "schema",
            "error",
            `Relation '${r.key}.${d.linked_by_relation}' links to '${rel}', not '${d.on_resource}'`,
            dk,
            d.linked_by_relation,
          )
      }
    }
  }

  for (const role of schema.roles) {
    const key = `role:${role.key}`
    for (const p of role.permissions) {
      const [res, action] = p.split(":")
      const r = resources.get(res)
      if (!r) add("schema", "error", `Role '${role.key}' grants '${p}' on unknown resource '${res}'`, key, p)
      else if (action !== "*" && !(action in r.actions)) add("schema", "error", `Role '${role.key}' grants unknown action '${p}'`, key, p)
    }
  }

  for (const s of schema.condition_sets) {
    const key = `set:${s.key}`
    const res = s.type === "resourceset" ? resources.get(s.resource_type) : undefined
    if (s.type === "resourceset" && !res)
      add("schema", "error", `Resource set '${s.key}' targets unknown resource '${s.resource_type}'`, key, s.key)
    for (const path of attributesOf(s.conditions)) {
      const [scope, attr] = path.split(".")
      if (scope === "resource" && s.type === "userset")
        add("schema", "error", `User set '${s.key}' cannot read '${path}'; user sets only see user attributes`, key, path)
      if (scope === "resource" && res && !BUILTIN_RESOURCE_ATTRS.has(attr) && !res.attributes?.[attr])
        add("schema", "warning", `Resource '${res.key}' does not declare attribute '${attr}'`, key, path)
    }
  }

  schema.condition_set_rules.forEach((rule, i) => {
    const key = `rule:${i}`
    const us = sets.get(rule.user_set)
    if (!us) add("schema", "error", `Rule uses unknown user set '${rule.user_set}'`, key, rule.user_set)
    else if (us.type !== "userset") add("schema", "error", `'${rule.user_set}' is a resource set, not a user set`, key, rule.user_set)
    const rs = sets.get(rule.resource_set)
    const [res, action] = rule.permission.split(":")
    if (rs && rs.type !== "resourceset")
      add("schema", "error", `'${rule.resource_set}' is a user set, not a resource set`, key, rule.resource_set)
    if (!rs && !resources.has(rule.resource_set))
      add("schema", "error", `Rule targets unknown resource set or resource '${rule.resource_set}'`, key, rule.resource_set)
    const r = resources.get(res)
    if (r && action !== "*" && !(action in r.actions))
      add("schema", "error", `Rule grants unknown action '${rule.permission}'`, key, rule.permission)
  })

  for (const u of data.users) {
    for (const [i, a] of (u.roles ?? []).entries()) {
      const key = `assign:${u.key}:${i}`
      if (a.resource_instance) {
        const [type] = a.resource_instance.split(":")
        const r = resources.get(type)
        if (!r) add("data", "error", `User '${u.key}': unknown resource in '${a.resource_instance}'`, key, a.resource_instance)
        else if (!r.roles?.[a.role]) add("data", "error", `User '${u.key}': resource '${type}' has no role '${a.role}'`, key, a.role)
        if (!instances.has(a.resource_instance))
          add("data", "warning", `User '${u.key}': instance '${a.resource_instance}' is not declared`, key, a.resource_instance)
      } else {
        if (!roles.has(a.role)) add("data", "error", `User '${u.key}': unknown top-level role '${a.role}'`, key, a.role)
        if (a.tenant && tenants.size && !tenants.has(a.tenant))
          add("data", "warning", `User '${u.key}': unknown tenant '${a.tenant}'`, key, a.tenant)
      }
    }
  }
  for (const i of data.resource_instances) {
    const key = `instance:${i.resource}:${i.key}`
    if (!resources.has(i.resource)) add("data", "error", `Instance '${i.resource}:${i.key}' uses unknown resource`, key, i.key)
    if (i.tenant && tenants.size && !tenants.has(i.tenant))
      add("data", "warning", `Instance '${i.resource}:${i.key}' uses unknown tenant '${i.tenant}'`, key, i.tenant)
  }
  data.relationship_tuples.forEach((t, i) => {
    const key = `tuple:${i}`
    const [st] = t.subject.split(":")
    const [ot] = t.object.split(":")
    const obj = resources.get(ot)
    if (!obj) return add("data", "error", `Relationship object '${t.object}' uses unknown resource`, key, t.object)
    const rel = obj.relations?.[t.relation]
    if (!rel) add("data", "error", `Resource '${ot}' has no relation '${t.relation}'`, key, t.relation)
    else if (rel !== st) add("data", "error", `Relation '${ot}.${t.relation}' expects a '${rel}' subject, got '${st}'`, key, t.subject)
  })

  tests.forEach((t, i) => {
    const key = `test:${i}`
    const [type] = t.resource.split(":")
    const r = resources.get(type)
    if (!r) add("tests", "error", `Test ${i + 1}: unknown resource '${type}'`, key, t.resource)
    else if (!(t.action in r.actions)) add("tests", "error", `Test ${i + 1}: resource '${type}' has no action '${t.action}'`, key, t.action)
    if (!data.users.some((u) => u.key === t.user)) add("tests", "warning", `Test ${i + 1}: user '${t.user}' is not declared`, key, t.user)
  })

  return issues
}
