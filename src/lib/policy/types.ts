// Shapes follow the Permit.io API objects (resources, roles, condition sets,
// role assignments, relationship tuples) so a JSON policy can be copied to and
// from Permit with minimal changes.

export type AttributeType = "string" | "number" | "bool" | "array" | "json" | "time"

export type Primitive = string | number | boolean | null
export type AttrValue = Primitive | Primitive[] | { [k: string]: unknown }
export type Attributes = Record<string, AttrValue>

export interface Tenant {
  key: string
  name?: string
}

/** Grants a resource role to users holding `role` on a related `on_resource` instance. */
export interface RoleDerivation {
  role: string
  on_resource: string
  linked_by_relation: string
}

export interface ResourceRole {
  name?: string
  permissions: string[]
  extends?: string[]
  granted_to?: { users_with_role: RoleDerivation[] }
}

export interface Resource {
  key: string
  name?: string
  actions: Record<string, { name?: string }>
  attributes?: Record<string, { type: AttributeType }>
  /** relation key -> subject resource key */
  relations?: Record<string, string>
  roles?: Record<string, ResourceRole>
}

/**
 * Top-level (tenant-wide) role. Permissions are `resource:action` or `resource:*`.
 * Top-level roles do not extend one another; each lists its permissions in full.
 */
export interface Role {
  key: string
  name?: string
  permissions: string[]
}

export type Operator =
  | "equals"
  | "not-equals"
  | "greater-than"
  | "greater-than-equals"
  | "less-than"
  | "less-than-equals"
  | "in"
  | "not-in"
  | "array_contains"
  | "array_not_contains"

export type ConditionValue = AttrValue | { ref: string }

export type Condition = { allOf: Condition[] } | { anyOf: Condition[] } | { [attribute: string]: Partial<Record<Operator, ConditionValue>> }

export interface UserSet {
  key: string
  name?: string
  type: "userset"
  conditions: Condition
}

export interface ResourceSet {
  key: string
  name?: string
  type: "resourceset"
  resource_type: string
  conditions: Condition
}

export type ConditionSet = UserSet | ResourceSet

export interface ConditionSetRule {
  user_set: string
  /** `resource:action` */
  permission: string
  /** a resource set key, or a resource key to cover every instance of that type */
  resource_set: string
}

export interface Schema {
  tenants: Tenant[]
  resources: Resource[]
  roles: Role[]
  condition_sets: ConditionSet[]
  condition_set_rules: ConditionSetRule[]
}

export interface RoleAssignment {
  role: string
  /** top-level role scope */
  tenant?: string
  /** `resource:key` for instance roles (ReBAC) */
  resource_instance?: string
}

export interface User {
  key: string
  email?: string
  first_name?: string
  attributes?: Attributes
  roles?: RoleAssignment[]
}

export interface ResourceInstance {
  key: string
  resource: string
  tenant?: string
  attributes?: Attributes
}

export interface RelationshipTuple {
  /** `resource:key` */
  subject: string
  relation: string
  /** `resource:key` */
  object: string
}

export interface Data {
  users: User[]
  resource_instances: ResourceInstance[]
  relationship_tuples: RelationshipTuple[]
}

export interface Test {
  user: string
  action: string
  /** `resource:key`, or a bare resource key for a type-level check */
  resource: string
  tenant?: string
  expected: boolean
  /** extra attributes merged on top of stored ones for this check */
  context?: { user?: Attributes; resource?: Attributes }
}

export interface PolicyFile {
  schema: Schema
  data: Data
  tests: Test[]
}

export interface Diagnostic {
  message: string
  severity: "error" | "warning"
  /** 0-based character offsets into the source text */
  from: number
  to: number
}

export type PolicyFormat = "dsl" | "json"

export const emptySchema = (): Schema => ({
  tenants: [],
  resources: [],
  roles: [],
  condition_sets: [],
  condition_set_rules: [],
})

export const emptyData = (): Data => ({
  users: [],
  resource_instances: [],
  relationship_tuples: [],
})
