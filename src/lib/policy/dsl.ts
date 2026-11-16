import { OP_SYMBOL, printCondition } from "./conditions"
import {
  emptyData,
  emptySchema,
  type AttrValue,
  type AttributeType,
  type Attributes,
  type Condition,
  type ConditionValue,
  type Diagnostic,
  type Operator,
  type PolicyFile,
  type RelationshipTuple,
  type Resource,
  type ResourceInstance,
  type ResourceRole,
  type Role,
  type RoleAssignment,
  type Test,
  type User,
} from "./types"

/* ------------------------------------------------------------------ lexer */

type TokKind = "ident" | "string" | "number" | "punct" | "eof"
interface Token {
  kind: TokKind
  value: string
  from: number
  to: number
}

const PUNCT2 = ["==", "!=", ">=", "<="]
const PUNCT1 = "{}()[],:#@.*<>"
const IDENT = /[A-Za-z0-9_-]/

export class DslError extends Error {
  from: number
  to: number
  constructor(message: string, from: number, to: number) {
    super(message)
    this.from = from
    this.to = to
  }
}

function lex(src: string): Token[] {
  const out: Token[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (/\s/.test(c)) {
      i++
      continue
    }
    if (c === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i++
      continue
    }
    if (c === '"') {
      const start = i++
      let s = ""
      while (i < src.length && src[i] !== '"') {
        if (src[i] === "\n") throw new DslError("Unterminated string", start, i)
        if (src[i] === "\\" && i + 1 < src.length) {
          const n = src[++i]
          s += n === "n" ? "\n" : n === "t" ? "\t" : n
        } else s += src[i]
        i++
      }
      if (i >= src.length) throw new DslError("Unterminated string", start, i)
      i++
      out.push({ kind: "string", value: s, from: start, to: i })
      continue
    }
    const two = src.slice(i, i + 2)
    if (PUNCT2.includes(two)) {
      out.push({ kind: "punct", value: two, from: i, to: i + 2 })
      i += 2
      continue
    }
    if (/[0-9]/.test(c) || (c === "-" && /[0-9]/.test(src[i + 1] ?? ""))) {
      const m = /^-?[0-9]+(\.[0-9]+)?(?![A-Za-z_-])/.exec(src.slice(i))
      if (m) {
        out.push({ kind: "number", value: m[0], from: i, to: i + m[0].length })
        i += m[0].length
        continue
      }
    }
    if (PUNCT1.includes(c)) {
      out.push({ kind: "punct", value: c, from: i, to: i + 1 })
      i++
      continue
    }
    if (IDENT.test(c)) {
      const start = i
      while (i < src.length && IDENT.test(src[i])) i++
      out.push({ kind: "ident", value: src.slice(start, i), from: start, to: i })
      continue
    }
    throw new DslError(`Unexpected character '${c}'`, i, i + 1)
  }
  out.push({ kind: "eof", value: "", from: src.length, to: src.length })
  return out
}

/* ----------------------------------------------------------------- parser */

/** Span of each named entity, keyed like `resource:document/role:owner`. */
export type SourceMap = Record<string, { from: number; to: number }>

export interface ParseResult {
  file: PolicyFile
  sourceMap: SourceMap
}

const ATTR_TYPES: AttributeType[] = ["string", "number", "bool", "array", "json", "time"]

class Parser {
  private toks: Token[]
  private pos = 0
  readonly file: PolicyFile = { schema: emptySchema(), data: emptyData(), tests: [] }
  readonly sourceMap: SourceMap = {}

  constructor(src: string) {
    this.toks = lex(src)
  }

  private get t() {
    return this.toks[this.pos]
  }
  private peek(n = 1) {
    return this.toks[Math.min(this.pos + n, this.toks.length - 1)]
  }
  private next() {
    return this.toks[this.pos++]
  }
  private is(value: string, kind?: TokKind) {
    return this.t.value === value && (kind ? this.t.kind === kind : this.t.kind === "punct" || this.t.kind === "ident")
  }
  private accept(value: string) {
    if (this.is(value)) return this.next()
    return undefined
  }
  private expect(value: string, what = `'${value}'`) {
    if (!this.is(value)) this.fail(`Expected ${what}, found ${this.describe(this.t)}`)
    return this.next()
  }
  private fail(msg: string, tok = this.t): never {
    throw new DslError(msg, tok.from, Math.max(tok.to, tok.from + 1))
  }
  private describe(t: Token) {
    return t.kind === "eof" ? "end of file" : `'${t.value}'`
  }
  private key(what = "a name"): Token {
    if (this.t.kind === "ident" || this.t.kind === "string" || this.t.kind === "number") return this.next()
    this.fail(`Expected ${what}, found ${this.describe(this.t)}`)
  }
  private optString() {
    return this.t.kind === "string" ? this.next().value : undefined
  }
  private keyList(what: string): string[] {
    const out = [this.key(what).value]
    while (this.accept(",")) out.push(this.key(what).value)
    return out
  }
  private mark(id: string, from: number) {
    this.sourceMap[id] = { from, to: this.toks[this.pos - 1]?.to ?? from }
  }

  parse(): ParseResult {
    while (this.t.kind !== "eof") this.statement()
    return { file: this.file, sourceMap: this.sourceMap }
  }

  private statement() {
    const t = this.t
    if (t.kind !== "ident") this.fail(`Expected a statement, found ${this.describe(t)}`)
    switch (t.value) {
      case "tenant":
        return this.tenant()
      case "resource":
        return this.resource()
      case "role":
        return this.topRole()
      case "userset":
        return this.userset()
      case "resourceset":
        return this.resourceset()
      case "permit":
        return this.permit()
      case "user":
        return this.user()
      case "instance":
        return this.instance()
      case "assign":
        return this.assign()
      case "relate":
        return this.relate()
      case "assert":
        return this.assertion()
      default:
        this.fail(
          `Unknown statement '${t.value}'. Expected tenant, resource, role, userset, resourceset, permit, user, instance, assign, relate or assert`,
        )
    }
  }

  private tenant() {
    const start = this.next().from
    const key = this.key("a tenant key").value
    const name = this.optString()
    this.file.schema.tenants.push(name ? { key, name } : { key })
    this.mark(`tenant:${key}`, start)
  }

  private resource() {
    const start = this.next().from
    const key = this.key("a resource key").value
    const name = this.optString()
    const res: Resource = name ? { key, name, actions: {} } : { key, actions: {} }
    this.expect("{")
    while (!this.is("}")) {
      if (this.t.kind === "eof") this.fail("Missing '}' to close resource block")
      this.resourceItem(res)
    }
    this.next()
    this.file.schema.resources.push(res)
    this.mark(`resource:${key}`, start)
  }

  private resourceItem(res: Resource) {
    const t = this.t
    const start = t.from
    switch (t.value) {
      case "actions": {
        this.next()
        this.accept(":")
        for (const a of this.keyList("an action")) res.actions[a] = {}
        return
      }
      case "attributes": {
        this.next()
        this.accept(":")
        this.expect("{")
        res.attributes ??= {}
        while (!this.is("}")) {
          const name = this.key("an attribute name").value
          this.expect(":")
          const typeTok = this.key("an attribute type")
          if (!ATTR_TYPES.includes(typeTok.value as AttributeType))
            this.fail(`Unknown attribute type '${typeTok.value}'. Use ${ATTR_TYPES.join(", ")}`, typeTok)
          res.attributes[name] = { type: typeTok.value as AttributeType }
          this.accept(",")
        }
        this.next()
        return
      }
      case "relations": {
        this.next()
        this.accept(":")
        this.expect("{")
        res.relations ??= {}
        while (!this.is("}")) {
          const rel = this.key("a relation name")
          this.expect(":")
          res.relations[rel.value] = this.key("a resource key").value
          this.mark(`resource:${res.key}/relation:${rel.value}`, rel.from)
          this.accept(",")
        }
        this.next()
        return
      }
      case "role": {
        this.next()
        const key = this.key("a role name").value
        const role: ResourceRole = res.roles?.[key] ?? { permissions: [] }
        const name = this.optString()
        if (name) role.name = name
        if (this.accept("extends")) role.extends = [...(role.extends ?? []), ...this.keyList("a role name")]
        if (this.accept(":")) {
          if (this.accept("*")) role.permissions.push("*")
          else role.permissions.push(...this.keyList("an action"))
        }
        res.roles = { ...res.roles, [key]: role }
        this.mark(`resource:${res.key}/role:${key}`, start)
        return
      }
      case "derive": {
        this.next()
        const role = this.key("a role name").value
        this.expect("from")
        const onResource = this.key("a resource key").value
        this.expect("#", "'#' (resource#role)")
        const fromRole = this.key("a role name").value
        this.expect("via")
        const relation = this.key("a relation name").value
        res.roles ??= {}
        const r = (res.roles[role] ??= { permissions: [] })
        r.granted_to ??= { users_with_role: [] }
        r.granted_to.users_with_role.push({ role: fromRole, on_resource: onResource, linked_by_relation: relation })
        this.mark(`resource:${res.key}/derive:${role}<-${onResource}#${fromRole}`, start)
        return
      }
      default:
        this.fail(`Unknown resource item ${this.describe(t)}. Expected actions, attributes, relations, role or derive`)
    }
  }

  private permission(): string {
    const res = this.key("a resource key").value
    this.expect(":", "':' (resource:action)")
    if (this.accept("*")) return `${res}:*`
    return `${res}:${this.key("an action").value}`
  }

  private topRole() {
    const start = this.next().from
    const key = this.key("a role key").value
    const name = this.optString()
    const role = { key, permissions: [] as string[] } as { key: string; name?: string; permissions: string[] }
    if (name) role.name = name
    if (this.is("extends"))
      this.fail(`Top-level role '${key}' cannot extend other roles; list its permissions directly. Only resource roles use 'extends'`)
    if (this.accept(":")) {
      role.permissions.push(this.permission())
      while (this.accept(",")) role.permissions.push(this.permission())
    }
    this.file.schema.roles.push(role)
    this.mark(`role:${key}`, start)
  }

  private userset() {
    const start = this.next().from
    const key = this.key("a user set key").value
    const name = this.optString()
    this.expect("where")
    const conditions = this.condition()
    this.file.schema.condition_sets.push({ key, ...(name ? { name } : {}), type: "userset", conditions })
    this.mark(`set:${key}`, start)
  }

  private resourceset() {
    const start = this.next().from
    const key = this.key("a resource set key").value
    const name = this.optString()
    this.expect("on")
    const resource_type = this.key("a resource key").value
    this.expect("where")
    const conditions = this.condition()
    this.file.schema.condition_sets.push({ key, ...(name ? { name } : {}), type: "resourceset", resource_type, conditions })
    this.mark(`set:${key}`, start)
  }

  /** `permit <userset> to <resourceset|resource>: action, action` */
  private permit() {
    const start = this.next().from
    const user_set = this.key("a user set key").value
    this.expect("to")
    const target = this.key("a resource set or resource key").value
    this.expect(":")
    const actions = this.accept("*") ? ["*"] : this.keyList("an action")
    const idx = this.file.schema.condition_set_rules.length
    for (const a of actions) this.file.schema.condition_set_rules.push({ user_set, resource_set: target, permission: `@${target}:${a}` })
    for (let i = idx; i < this.file.schema.condition_set_rules.length; i++) this.mark(`rule:${i}`, start)
    // one key per statement, so the matrix editor can rewrite every line for a user set / target pair
    this.mark(`permit:${user_set}\u0000${target}:${idx}`, start)
  }

  /* --- expressions (ABAC conditions) --- */

  private expr(): Condition {
    const parts = [this.andExpr()]
    while (this.accept("or")) parts.push(this.andExpr())
    return parts.length === 1 ? parts[0] : { anyOf: parts }
  }

  private andExpr(): Condition {
    const parts = [this.atom()]
    while (this.accept("and")) parts.push(this.atom())
    return parts.length === 1 ? parts[0] : { allOf: parts }
  }

  private atom(): Condition {
    if (this.accept("(")) {
      const e = this.expr()
      this.expect(")")
      return e
    }
    const path = this.path()
    const op = this.operator()
    const value = this.condValue()
    return { [path]: { [op]: value } }
  }

  /** Permit expects a top-level allOf/anyOf group. */
  private condition(): Condition {
    const c = this.expr()
    return "allOf" in c || "anyOf" in c ? c : { allOf: [c] }
  }

  private path(): string {
    const head = this.t
    if (head.kind !== "ident" || (head.value !== "user" && head.value !== "resource"))
      this.fail(`Expected an attribute like user.plan or resource.owner, found ${this.describe(head)}`)
    let p = this.next().value
    this.expect(".", "'.' after user/resource")
    p += "." + this.key("an attribute name").value
    while (this.accept(".")) p += "." + this.key("an attribute name").value
    return p
  }

  private operator(): Operator {
    const t = this.t
    const bySymbol = Object.entries(OP_SYMBOL).find(([, s]) => s === t.value)
    if (t.value === "not") {
      this.next()
      if (this.accept("in")) return "not-in"
      if (this.accept("contains")) return "array_not_contains"
      this.fail("Expected 'in' or 'contains' after 'not'")
    }
    if (bySymbol && (t.kind === "punct" || t.kind === "ident")) {
      this.next()
      return bySymbol[0] as Operator
    }
    this.fail(`Expected an operator (==, !=, >, >=, <, <=, in, not in, contains, not contains), found ${this.describe(t)}`)
  }

  private condValue(): ConditionValue {
    if (this.t.kind === "ident" && (this.t.value === "user" || this.t.value === "resource") && this.peek().value === ".")
      return { ref: this.path() }
    return this.literal()
  }

  private literal(): AttrValue {
    const t = this.t
    if (t.kind === "string") return this.next().value
    if (t.kind === "number") return Number(this.next().value)
    if (t.kind === "ident" && (t.value === "true" || t.value === "false")) return this.next().value === "true"
    if (t.kind === "ident" && t.value === "null") {
      this.next()
      return null
    }
    if (this.accept("[")) {
      const arr: AttrValue[] = []
      while (!this.is("]")) {
        arr.push(this.literal())
        if (!this.accept(",")) break
      }
      this.expect("]")
      return arr as AttrValue
    }
    if (this.is("{")) return this.attrBlock() as AttrValue
    this.fail(`Expected a value (string, number, true/false, null or [list]), found ${this.describe(t)}`)
  }

  private attrBlock(): Attributes {
    this.expect("{")
    const out: Attributes = {}
    while (!this.is("}")) {
      const k = this.key("an attribute name").value
      this.expect(":")
      out[k] = this.literal()
      this.accept(",")
    }
    this.next()
    return out
  }

  /* --- data --- */

  private ref(what: string): string {
    const type = this.key(`${what} type`).value
    this.expect(":", `':' (${what} as type:key)`)
    return `${type}:${this.key(`${what} key`).value}`
  }

  private user() {
    const start = this.next().from
    const key = this.key("a user key").value
    const email = this.optString()
    // `assign` may have created the user already
    let u = this.file.data.users.find((x) => x.key === key)
    if (!u) {
      u = { key }
      this.file.data.users.push(u)
    }
    if (email) u.email = email
    if (this.is("{")) u.attributes = { ...u.attributes, ...this.attrBlock() }
    this.mark(`user:${key}`, start)
  }

  private instance() {
    const start = this.next().from
    const [resource, key] = this.ref("instance").split(":")
    const inst = { key, resource } as PolicyFile["data"]["resource_instances"][number]
    if (this.accept("@")) inst.tenant = this.key("a tenant key").value
    if (this.is("{")) inst.attributes = this.attrBlock()
    this.file.data.resource_instances.push(inst)
    this.mark(`instance:${resource}:${key}`, start)
  }

  /** `assign <user> <role> [@tenant]` or `assign <user> <role> on <type:key>` */
  private assign() {
    const start = this.next().from
    const userKey = this.key("a user key").value
    const role = this.key("a role").value
    let user = this.file.data.users.find((u) => u.key === userKey)
    if (!user) {
      user = { key: userKey }
      this.file.data.users.push(user)
    }
    user.roles ??= []
    if (this.accept("on")) user.roles.push({ role, resource_instance: this.ref("resource instance") })
    else user.roles.push({ role, tenant: this.accept("@") ? this.key("a tenant key").value : "default" })
    this.mark(`assign:${userKey}:${user.roles.length - 1}`, start)
  }

  /** `relate <subject type:key> <relation> <object type:key>` */
  private relate() {
    const start = this.next().from
    const subject = this.ref("subject")
    const relation = this.key("a relation").value
    const object = this.ref("object")
    this.file.data.relationship_tuples.push({ subject, relation, object })
    this.mark(`tuple:${this.file.data.relationship_tuples.length - 1}`, start)
  }

  /** `assert <user> can|cannot <action> <type[:key]> [@tenant] [with { user.x: v }]` */
  private assertion() {
    const start = this.next().from
    const user = this.key("a user key").value
    const verb = this.key("'can' or 'cannot'")
    if (verb.value !== "can" && verb.value !== "cannot") this.fail("Expected 'can' or 'cannot'", verb)
    const action = this.key("an action").value
    let resource = this.key("a resource").value
    if (this.accept(":")) resource += ":" + this.key("a resource key").value
    const test: Test = { user, action, resource, expected: verb.value === "can" }
    if (this.accept("@")) test.tenant = this.key("a tenant key").value
    if (this.accept("with")) {
      this.expect("{")
      test.context = {}
      while (!this.is("}")) {
        const [scope, ...rest] = this.path().split(".") as ["user" | "resource", ...string[]]
        this.expect(":")
        ;(test.context[scope] ??= {})[rest.join(".")] = this.literal()
        this.accept(",")
      }
      this.next()
    }
    this.file.tests.push(test)
    this.mark(`test:${this.file.tests.length - 1}`, start)
  }
}

/**
 * `permit` rules are parsed with a placeholder `@target:action` permission because
 * the resource type behind a resource set is only known once the whole file is read.
 */
function resolvePermitRules(file: PolicyFile) {
  for (const rule of file.schema.condition_set_rules) {
    if (!rule.permission.startsWith("@")) continue
    const action = rule.permission.slice(rule.permission.lastIndexOf(":") + 1)
    const set = file.schema.condition_sets.find((s) => s.key === rule.resource_set)
    const type = set?.type === "resourceset" ? set.resource_type : rule.resource_set
    rule.permission = `${type}:${action}`
  }
}

export function parseDsl(src: string): ParseResult {
  const p = new Parser(src)
  const result = p.parse()
  resolvePermitRules(result.file)
  return result
}

export function dslErrorToDiagnostic(e: unknown): Diagnostic {
  if (e instanceof DslError) return { message: e.message, severity: "error", from: e.from, to: e.to }
  return { message: String((e as Error)?.message ?? e), severity: "error", from: 0, to: 0 }
}

/* ---------------------------------------------------------------- printer */

const KEY_RE = /^[A-Za-z0-9_-]+$/
const RESERVED = new Set([
  "and",
  "or",
  "not",
  "in",
  "contains",
  "true",
  "false",
  "null",
  "on",
  "to",
  "with",
  "where",
  "via",
  "from",
  "extends",
  "can",
  "cannot",
])
const k = (s: string) => (KEY_RE.test(s) && !RESERVED.has(s) && !/^-?[0-9]/.test(s) ? s : JSON.stringify(s))

function literal(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(literal).join(", ")}]`
  if (v && typeof v === "object") return attrs(v as Attributes)
  return JSON.stringify(v ?? null)
}
function attrs(a: Attributes): string {
  const entries = Object.entries(a)
  if (!entries.length) return "{}"
  return `{ ${entries.map(([key, v]) => `${k(key)}: ${literal(v)}`).join(", ")} }`
}
const ref = (r: string) => {
  const i = r.indexOf(":")
  const rest = r.slice(i + 1)
  // `document:*` is a wildcard permission, not a key that needs quoting
  return i < 0 ? k(r) : `${k(r.slice(0, i))}:${rest === "*" ? "*" : k(rest)}`
}
const named = (name?: string) => (name ? ` ${JSON.stringify(name)}` : "")

/* Single-statement printers, shared by the full printer and by text edits from the UI. */
export const stmt = {
  topRole(r: Role) {
    return `role ${k(r.key)}${named(r.name)}${r.permissions.length ? `: ${r.permissions.map(ref).join(", ")}` : ""}`
  },
  /** without indentation; the caller places it inside the resource block */
  resourceRole(key: string, role: ResourceRole) {
    let line = `role ${k(key)}${named(role.name)}`
    if (role.extends?.length) line += ` extends ${role.extends.map(k).join(", ")}`
    if (role.permissions.length) line += `: ${role.permissions.includes("*") ? "*" : role.permissions.map(k).join(", ")}`
    return line
  },
  permit(userSet: string, target: string, actions: string[]) {
    return `permit ${k(userSet)} to ${k(target)}: ${actions.includes("*") ? "*" : actions.map(k).join(", ")}`
  },
  user(u: User) {
    const a = u.attributes && Object.keys(u.attributes).length ? ` ${attrs(u.attributes)}` : ""
    return `user ${k(u.key)}${u.email ? ` ${JSON.stringify(u.email)}` : ""}${a}`
  },
  instance(i: ResourceInstance) {
    const a = i.attributes && Object.keys(i.attributes).length ? ` ${attrs(i.attributes)}` : ""
    return `instance ${k(i.resource)}:${k(i.key)}${i.tenant ? ` @${k(i.tenant)}` : ""}${a}`
  },
  assign(userKey: string, r: RoleAssignment) {
    return r.resource_instance
      ? `assign ${k(userKey)} ${k(r.role)} on ${ref(r.resource_instance)}`
      : `assign ${k(userKey)} ${k(r.role)} @${k(r.tenant ?? "default")}`
  },
  tuple(t: RelationshipTuple) {
    return `relate ${ref(t.subject)} ${k(t.relation)} ${ref(t.object)}`
  },
  test(t: Test) {
    let line = `assert ${k(t.user)} ${t.expected ? "can" : "cannot"} ${k(t.action)} ${ref(t.resource)}`
    if (t.tenant) line += ` @${k(t.tenant)}`
    const ctx = Object.entries(t.context ?? {}).flatMap(([scope, a]) =>
      Object.entries(a ?? {}).map(([key, v]) => `${scope}.${key}: ${literal(v)}`),
    )
    if (ctx.length) line += ` with { ${ctx.join(", ")} }`
    return line
  },
}

export function printDsl(file: PolicyFile, opts: { schema?: boolean; data?: boolean; tests?: boolean } = {}): string {
  const { schema: withSchema = true, data: withData = true, tests: withTests = true } = opts
  const { schema, data, tests } = file
  const out: string[] = []
  const section = (title: string) => {
    if (out.length) out.push("")
    out.push(`// ${title}`)
  }

  if (withSchema) {
    if (schema.tenants.length) {
      section("Tenants")
      for (const t of schema.tenants) out.push(`tenant ${k(t.key)}${named(t.name)}`)
    }

    for (const r of schema.resources) {
      out.push("")
      out.push(`resource ${k(r.key)}${named(r.name)} {`)
      const actions = Object.keys(r.actions)
      if (actions.length) out.push(`  actions ${actions.map(k).join(", ")}`)
      if (r.attributes && Object.keys(r.attributes).length)
        out.push(
          `  attributes { ${Object.entries(r.attributes)
            .map(([n, a]) => `${k(n)}: ${a.type}`)
            .join(", ")} }`,
        )
      if (r.relations && Object.keys(r.relations).length)
        out.push(
          `  relations { ${Object.entries(r.relations)
            .map(([n, to]) => `${k(n)}: ${k(to)}`)
            .join(", ")} }`,
        )
      const roles = Object.entries(r.roles ?? {})
      if (roles.length) out.push("")
      for (const [key, role] of roles) out.push(`  ${stmt.resourceRole(key, role)}`)
      const derivations = roles.flatMap(([key, role]) => (role.granted_to?.users_with_role ?? []).map((d) => ({ key, d })))
      if (derivations.length) out.push("")
      for (const { key, d } of derivations)
        out.push(`  derive ${k(key)} from ${k(d.on_resource)}#${k(d.role)} via ${k(d.linked_by_relation)}`)
      out.push("}")
    }

    if (schema.roles.length) {
      section("Top-level roles (RBAC, per tenant)")
      for (const r of schema.roles) out.push(stmt.topRole(r))
    }

    if (schema.condition_sets.length) {
      section("Condition sets (ABAC)")
      for (const s of schema.condition_sets) {
        if (s.type === "userset") out.push(`userset ${k(s.key)}${named(s.name)} where ${printCondition(s.conditions)}`)
        else out.push(`resourceset ${k(s.key)}${named(s.name)} on ${k(s.resource_type)} where ${printCondition(s.conditions)}`)
      }
    }

    if (schema.condition_set_rules.length) {
      out.push("")
      // group rules that share a user set and resource set into one line
      const groups = new Map<string, string[]>()
      for (const rule of schema.condition_set_rules) {
        const g = `${rule.user_set}\u0000${rule.resource_set}`
        const action = rule.permission.slice(rule.permission.lastIndexOf(":") + 1)
        groups.set(g, [...(groups.get(g) ?? []), action])
      }
      for (const [g, actions] of groups) {
        const [us, rs] = g.split("\u0000")
        out.push(stmt.permit(us, rs, actions))
      }
    }
  }

  if (withData && (data.users.length || data.resource_instances.length || data.relationship_tuples.length)) {
    if (data.users.length) {
      section("Users")
      for (const u of data.users) out.push(stmt.user(u))
    }
    if (data.resource_instances.length) {
      section("Resource instances")
      for (const i of data.resource_instances) out.push(stmt.instance(i))
    }
    const assignments = data.users.flatMap((u) => (u.roles ?? []).map((r) => ({ u, r })))
    if (assignments.length) {
      section("Role assignments")
      for (const { u, r } of assignments) out.push(stmt.assign(u.key, r))
    }
    if (data.relationship_tuples.length) {
      section("Relationships (subject relation object)")
      for (const t of data.relationship_tuples) out.push(stmt.tuple(t))
    }
  }

  if (withTests && tests.length) {
    section("Tests")
    for (const t of tests) out.push(stmt.test(t))
  }

  return out.join("\n").replace(/^\n+/, "") + "\n"
}
