import { parseDsl, stmt, type SourceMap } from "./dsl"
import { parseJson, printJson } from "./json"
import type { PolicyFile, PolicyFormat, RelationshipTuple, ResourceInstance, RoleAssignment, Test, User } from "./types"

export type Mutation =
  | { op: "addUser"; user: User }
  | { op: "updateUser"; user: User }
  | { op: "removeUser"; key: string }
  | { op: "addInstance"; instance: ResourceInstance }
  | { op: "updateInstance"; instance: ResourceInstance }
  | { op: "removeInstance"; ref: string }
  | { op: "addAssignment"; user: string; assignment: RoleAssignment }
  | { op: "removeAssignment"; user: string; index: number }
  | { op: "addTuple"; tuple: RelationshipTuple }
  | { op: "removeTuple"; index: number }
  | { op: "addTest"; test: Test }
  | { op: "removeTest"; index: number }
  // schema edits from the matrix policy editor
  | { op: "setRolePermissions"; role: string; permissions: string[] }
  | { op: "setResourceRolePermissions"; resource: string; role: string; permissions: string[] }
  | { op: "setRuleActions"; userSet: string; target: string; resource: string; actions: string[] }
  | { op: "addRole"; key: string }
  | { op: "addResourceRole"; resource: string; key: string }

/** Short past-tense label for undo buttons and toasts. */
export function describeMutation(m: Mutation): string {
  switch (m.op) {
    case "addUser":
      return `Added user ${m.user.key}`
    case "updateUser":
      return `Updated user ${m.user.key}`
    case "removeUser":
      return `Removed user ${m.key}`
    case "addInstance":
      return `Added ${m.instance.resource}:${m.instance.key}`
    case "updateInstance":
      return `Updated ${m.instance.resource}:${m.instance.key}`
    case "removeInstance":
      return `Removed ${m.ref}`
    case "addAssignment":
      return `Gave ${m.user} ${m.assignment.role}`
    case "removeAssignment":
      return `Removed a role from ${m.user}`
    case "addTuple":
      return `Added ${m.tuple.subject} ${m.tuple.relation} ${m.tuple.object}`
    case "removeTuple":
      return "Removed a relationship"
    case "addTest":
      return "Added a test"
    case "removeTest":
      return "Removed a test"
    case "setRolePermissions":
      return `Changed role ${m.role}`
    case "setResourceRolePermissions":
      return `Changed ${m.resource}#${m.role}`
    case "setRuleActions":
      return `Changed rule ${m.userSet} → ${m.target}`
    case "addRole":
      return `Added role ${m.key}`
    case "addResourceRole":
      return `Added ${m.resource}#${m.key}`
  }
}

function mutateFile(file: PolicyFile, m: Mutation) {
  const d = file.data
  switch (m.op) {
    case "addUser":
      d.users.push(m.user)
      break
    case "updateUser": {
      const i = d.users.findIndex((u) => u.key === m.user.key)
      if (i >= 0) d.users[i] = { ...d.users[i], ...m.user, roles: d.users[i].roles }
      break
    }
    case "removeUser":
      d.users = d.users.filter((u) => u.key !== m.key)
      break
    case "addInstance":
      d.resource_instances.push(m.instance)
      break
    case "updateInstance": {
      const i = d.resource_instances.findIndex((x) => x.resource === m.instance.resource && x.key === m.instance.key)
      if (i >= 0) d.resource_instances[i] = m.instance
      break
    }
    case "removeInstance":
      d.resource_instances = d.resource_instances.filter((x) => `${x.resource}:${x.key}` !== m.ref)
      break
    case "addAssignment": {
      let u = d.users.find((x) => x.key === m.user)
      if (!u) d.users.push((u = { key: m.user }))
      ;(u.roles ??= []).push(m.assignment)
      break
    }
    case "removeAssignment": {
      const u = d.users.find((x) => x.key === m.user)
      u?.roles?.splice(m.index, 1)
      break
    }
    case "addTuple":
      d.relationship_tuples.push(m.tuple)
      break
    case "removeTuple":
      d.relationship_tuples.splice(m.index, 1)
      break
    case "addTest":
      file.tests.push(m.test)
      break
    case "removeTest":
      file.tests.splice(m.index, 1)
      break
    case "setRolePermissions": {
      const r = file.schema.roles.find((x) => x.key === m.role)
      if (r) r.permissions = m.permissions
      break
    }
    case "setResourceRolePermissions": {
      const role = file.schema.resources.find((x) => x.key === m.resource)?.roles?.[m.role]
      if (role) role.permissions = m.permissions
      break
    }
    case "setRuleActions": {
      const rules = file.schema.condition_set_rules
      const same = (r: (typeof rules)[number]) => r.user_set === m.userSet && r.resource_set === m.target
      const at = rules.findIndex(same)
      const kept = rules.filter((r) => !same(r))
      const fresh = m.actions.map((a) => ({ user_set: m.userSet, permission: `${m.resource}:${a}`, resource_set: m.target }))
      kept.splice(at < 0 ? kept.length : at, 0, ...fresh)
      file.schema.condition_set_rules = kept
      break
    }
    case "addRole":
      file.schema.roles.push({ key: m.key, permissions: [] })
      break
    case "addResourceRole": {
      const res = file.schema.resources.find((x) => x.key === m.resource)
      if (res) res.roles = { ...res.roles, [m.key]: { permissions: [] } }
      break
    }
  }
}

interface TextEdit {
  from: number
  to: number
  insert: string
}

/** Widens a span to whole lines when nothing else shares them, so deletes leave no blank gap. */
function lineSpan(text: string, from: number, to: number) {
  const ls = text.lastIndexOf("\n", from - 1) + 1
  let le = text.indexOf("\n", to)
  if (le < 0) le = text.length
  const alone = !text.slice(ls, from).trim() && !text.slice(to, le).trim()
  return alone ? { from: ls, to: Math.min(le + 1, text.length) } : { from, to }
}

/** Where to insert a new statement: after the last statement of the same kind, else after related kinds, else at the end. */
function insertionPoint(text: string, map: SourceMap, prefixes: string[]): number | undefined {
  for (const prefix of prefixes) {
    const spans = Object.entries(map)
      .filter(([key]) => key.startsWith(prefix))
      .map(([, s]) => s)
    if (spans.length) {
      const end = Math.max(...spans.map((s) => s.to))
      const le = text.indexOf("\n", end)
      return le < 0 ? text.length : le + 1
    }
  }
  return undefined
}

function dslEdits(text: string, m: Mutation): TextEdit[] {
  const { file, sourceMap } = parseDsl(text)
  const del = (key: string): TextEdit[] => {
    const s = sourceMap[key]
    return s ? [{ ...lineSpan(text, s.from, s.to), insert: "" }] : []
  }
  const add = (line: string, prefixes: string[]): TextEdit[] => {
    const at = insertionPoint(text, sourceMap, prefixes)
    if (at === undefined) {
      const sep = text.endsWith("\n") ? "\n" : "\n\n"
      return [{ from: text.length, to: text.length, insert: `${sep}${line}\n` }]
    }
    const needsNl = at === text.length && !text.endsWith("\n")
    return [{ from: at, to: at, insert: `${needsNl ? "\n" : ""}${line}\n` }]
  }
  const replace = (key: string, line: string): TextEdit[] => {
    const s = sourceMap[key]
    return s ? [{ from: s.from, to: s.to, insert: line }] : []
  }

  switch (m.op) {
    case "addUser":
      return add(stmt.user(m.user), ["user:", "tenant:", "rule:", "set:", "role:", "resource:"])
    case "updateUser": {
      const existing = file.data.users.find((u) => u.key === m.user.key)
      const line = stmt.user({ ...existing, ...m.user })
      return sourceMap[`user:${m.user.key}`] ? replace(`user:${m.user.key}`, line) : add(line, ["user:"])
    }
    case "removeUser": {
      const keys = Object.keys(sourceMap).filter((k) => k === `user:${m.key}` || k.startsWith(`assign:${m.key}:`))
      return keys.flatMap(del)
    }
    case "addInstance":
      return add(stmt.instance(m.instance), ["instance:", "user:", "rule:", "set:", "role:", "resource:"])
    case "updateInstance":
      return replace(`instance:${m.instance.resource}:${m.instance.key}`, stmt.instance(m.instance))
    case "removeInstance":
      return del(`instance:${m.ref}`)
    case "addAssignment":
      return add(stmt.assign(m.user, m.assignment), ["assign:", "instance:", "user:"])
    case "removeAssignment":
      return del(`assign:${m.user}:${m.index}`)
    case "addTuple":
      return add(stmt.tuple(m.tuple), ["tuple:", "assign:", "instance:", "user:"])
    case "removeTuple":
      return del(`tuple:${m.index}`)
    case "addTest":
      return add(stmt.test(m.test), ["test:", "tuple:", "assign:", "instance:", "user:"])
    case "removeTest":
      return del(`test:${m.index}`)
    case "setRolePermissions": {
      const role = file.schema.roles.find((r) => r.key === m.role)
      return role ? replace(`role:${m.role}`, stmt.topRole({ ...role, permissions: m.permissions })) : []
    }
    case "setResourceRolePermissions": {
      const role = file.schema.resources.find((r) => r.key === m.resource)?.roles?.[m.role]
      if (!role) return []
      const line = stmt.resourceRole(m.role, { ...role, permissions: m.permissions })
      // a role that only appears in `derive` lines has no statement of its own yet
      return sourceMap[`resource:${m.resource}/role:${m.role}`]
        ? replace(`resource:${m.resource}/role:${m.role}`, line)
        : insertInResource(text, sourceMap, m.resource, line)
    }
    case "setRuleActions": {
      const keys = Object.keys(sourceMap)
        .filter((k) => k.startsWith(`permit:${m.userSet}\u0000${m.target}:`))
        .sort((a, b) => sourceMap[a].from - sourceMap[b].from)
      if (!m.actions.length) return keys.flatMap(del)
      const line = stmt.permit(m.userSet, m.target, m.actions)
      if (!keys.length) return add(line, ["permit:", "set:", "role:", "resource:"])
      return [...replace(keys[0], line), ...keys.slice(1).flatMap(del)]
    }
    case "addRole":
      return add(stmt.topRole({ key: m.key, permissions: [] }), ["role:", "resource:", "tenant:"])
    case "addResourceRole":
      return insertInResource(text, sourceMap, m.resource, stmt.resourceRole(m.key, { permissions: [] }))
  }
}

/** Adds a statement as the last line inside a resource block. */
function insertInResource(text: string, map: SourceMap, resource: string, line: string): TextEdit[] {
  const span = map[`resource:${resource}`]
  if (!span) return []
  const brace = text.lastIndexOf("}", span.to)
  const ls = text.lastIndexOf("\n", brace - 1) + 1
  if (!text.slice(ls, brace).trim()) return [{ from: ls, to: ls, insert: `  ${line}\n` }]
  return [{ from: brace, to: brace, insert: `${/\s/.test(text[brace - 1] ?? "") ? "" : " "}${line} ` }]
}

/** Applies a data/test change to policy text, keeping DSL comments and layout intact. */
export function applyMutation(text: string, format: PolicyFormat, m: Mutation): string {
  if (format === "json") {
    const file = parseJson(text)
    mutateFile(file, m)
    return printJson(file)
  }
  const edits = dslEdits(text, m).sort((a, b) => b.from - a.from)
  let out = text
  for (const e of edits) out = out.slice(0, e.from) + e.insert + out.slice(e.to)
  return out
}
