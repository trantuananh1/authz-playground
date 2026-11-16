import type { AttrValue, Condition, ConditionValue, Operator } from "./types"

export const OPERATORS: Operator[] = [
  "equals",
  "not-equals",
  "greater-than",
  "greater-than-equals",
  "less-than",
  "less-than-equals",
  "in",
  "not-in",
  "array_contains",
  "array_not_contains",
]

/** DSL spelling of each operator. */
export const OP_SYMBOL: Record<Operator, string> = {
  equals: "==",
  "not-equals": "!=",
  "greater-than": ">",
  "greater-than-equals": ">=",
  "less-than": "<",
  "less-than-equals": "<=",
  in: "in",
  "not-in": "not in",
  array_contains: "contains",
  array_not_contains: "not contains",
}

export interface EvalContext {
  user: Record<string, unknown>
  resource: Record<string, unknown>
}

export interface ConditionCheck {
  attribute: string
  op: Operator
  expected: unknown
  actual: unknown
  ok: boolean
}

export const isRef = (v: unknown): v is { ref: string } =>
  typeof v === "object" && v !== null && !Array.isArray(v) && typeof (v as { ref?: unknown }).ref === "string"

export function lookup(ctx: EvalContext, path: string): unknown {
  const [head, ...rest] = path.split(".")
  let cur: unknown = head === "user" ? ctx.user : head === "resource" ? ctx.resource : undefined
  for (const part of rest) {
    if (cur === null || typeof cur !== "object") return undefined
    cur = (cur as Record<string, unknown>)[part]
  }
  return cur
}

const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

function compare(op: Operator, actual: unknown, expected: unknown): boolean {
  switch (op) {
    case "equals":
      return eq(actual, expected)
    case "not-equals":
      return !eq(actual, expected)
    case "greater-than":
      return actual != null && expected != null && (actual as number) > (expected as number)
    case "greater-than-equals":
      return actual != null && expected != null && (actual as number) >= (expected as number)
    case "less-than":
      return actual != null && expected != null && (actual as number) < (expected as number)
    case "less-than-equals":
      return actual != null && expected != null && (actual as number) <= (expected as number)
    case "in":
      return Array.isArray(expected) && expected.some((e) => eq(e, actual))
    case "not-in":
      return Array.isArray(expected) && !expected.some((e) => eq(e, actual))
    case "array_contains":
      return Array.isArray(actual) && actual.some((e) => eq(e, expected))
    case "array_not_contains":
      return !Array.isArray(actual) || !actual.some((e) => eq(e, expected))
  }
}

/** Evaluates a condition tree, collecting every leaf comparison for the trace. */
export function evaluate(cond: Condition, ctx: EvalContext, checks: ConditionCheck[] = []): boolean {
  if ("allOf" in cond && Array.isArray(cond.allOf)) {
    let ok = true
    for (const c of cond.allOf as Condition[]) ok = evaluate(c, ctx, checks) && ok
    return ok
  }
  if ("anyOf" in cond && Array.isArray(cond.anyOf)) {
    let ok = false
    for (const c of cond.anyOf as Condition[]) ok = evaluate(c, ctx, checks) || ok
    return ok
  }
  let ok = true
  for (const [attribute, ops] of Object.entries(cond as Record<string, Partial<Record<Operator, ConditionValue>>>)) {
    for (const [op, raw] of Object.entries(ops) as [Operator, ConditionValue][]) {
      const expected = isRef(raw) ? lookup(ctx, raw.ref) : raw
      const actual = lookup(ctx, attribute)
      const pass = compare(op, actual, expected)
      checks.push({ attribute, op, expected: isRef(raw) ? `${raw.ref} (${JSON.stringify(expected)})` : expected, actual, ok: pass })
      ok = pass && ok
    }
  }
  return ok
}

/** Every attribute path a condition reads, for validation. */
export function attributesOf(cond: Condition, out: string[] = []): string[] {
  if ("allOf" in cond && Array.isArray(cond.allOf)) (cond.allOf as Condition[]).forEach((c) => attributesOf(c, out))
  else if ("anyOf" in cond && Array.isArray(cond.anyOf)) (cond.anyOf as Condition[]).forEach((c) => attributesOf(c, out))
  else
    for (const [attr, ops] of Object.entries(cond)) {
      out.push(attr)
      for (const v of Object.values(ops as object)) if (isRef(v)) out.push(v.ref)
    }
  return out
}

export function formatValue(v: ConditionValue | AttrValue): string {
  if (isRef(v)) return v.ref
  return JSON.stringify(v)
}

/** Prints a condition tree as a DSL expression. */
export function printCondition(cond: Condition, top = true): string {
  if ("allOf" in cond && Array.isArray(cond.allOf)) {
    const parts = (cond.allOf as Condition[]).map((c) => printCondition(c, false))
    const s = parts.join(" and ")
    return top || parts.length < 2 ? s : `(${s})`
  }
  if ("anyOf" in cond && Array.isArray(cond.anyOf)) {
    const parts = (cond.anyOf as Condition[]).map((c) => printCondition(c, false))
    const s = parts.join(" or ")
    return top || parts.length < 2 ? s : `(${s})`
  }
  const leaves: string[] = []
  for (const [attr, ops] of Object.entries(cond))
    for (const [op, v] of Object.entries(ops as object))
      leaves.push(`${attr} ${OP_SYMBOL[op as Operator]} ${formatValue(v as ConditionValue)}`)
  const s = leaves.join(" and ")
  return top || leaves.length < 2 ? s : `(${s})`
}
