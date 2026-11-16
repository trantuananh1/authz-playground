import type { PolicyFormat } from "@/lib/policy/types"

export interface Sample {
  id: string
  name: string
  description: string
  models: ("RBAC" | "ReBAC" | "ABAC")[]
  format: PolicyFormat
  source: string
}

const entitlements = `// Entitlements: which features an organization can use depends on its plan.
// Members of an organization inherit access through the plan it subscribes to.

tenant default "Default"

resource organization "Organization" {
  actions view, manage_billing, invite
  attributes { country: string }

  role owner: *
  role member: view
}

resource plan "Plan" {
  actions view, subscribe
  relations { subscriber: organization }

  role subscriber: view

  // every member of a subscribing organization is a subscriber of the plan
  derive subscriber from organization#member via subscriber
  derive subscriber from organization#owner via subscriber
}

resource feature "Feature" {
  actions access, configure
  attributes { stage: string }
  relations { plan: plan }

  role user: access
  role admin extends user: configure

  derive user from plan#subscriber via plan
}

role support "Support engineer": organization:view, plan:view, feature:access
role billing_admin "Billing admin": organization:view, organization:manage_billing, plan:view, plan:subscribe

// Beta features: people who opted in may try any feature still in beta
userset beta_testers "Beta testers" where user.beta == true
resourceset beta_features "Beta features" on feature where resource.stage == "beta"
permit beta_testers to beta_features: access

user anne "anne@acme.example" { beta: false }
user beth "beth@acme.example" { beta: true }
user carl "carl@globex.example" { beta: false }
user sam "sam@vauthz.example"

instance organization:acme { country: "VN" }
instance organization:globex { country: "US" }
instance plan:free
instance plan:team
instance plan:enterprise
instance feature:issues { stage: "ga" }
instance feature:sso { stage: "ga" }
instance feature:audit_log { stage: "ga" }
instance feature:ai_assist { stage: "beta" }

assign anne owner on organization:acme
assign beth member on organization:acme
assign carl member on organization:globex
assign sam support @default

relate organization:acme subscriber plan:enterprise
relate organization:globex subscriber plan:free
relate plan:free plan feature:issues
relate plan:team plan feature:issues
relate plan:team plan feature:sso
relate plan:enterprise plan feature:issues
relate plan:enterprise plan feature:sso
relate plan:enterprise plan feature:audit_log

assert anne can access feature:audit_log
assert beth can access feature:sso
assert carl can access feature:issues
assert carl cannot access feature:sso
assert beth can access feature:ai_assist
assert anne cannot access feature:ai_assist
assert anne can manage_billing organization:acme
assert beth cannot manage_billing organization:acme
assert sam can access feature:sso
assert sam cannot manage_billing organization:acme
`

const drive = `// Drive: folders and documents with owners, editors and viewers.
// Access flows down from a folder to the documents and folders inside it.

tenant default
tenant acme "Acme Corp"

resource folder "Folder" {
  actions read, create_file, share, delete
  relations { parent: folder }

  role owner: *
  role editor extends viewer: create_file
  role viewer: read

  derive owner from folder#owner via parent
  derive editor from folder#editor via parent
  derive viewer from folder#viewer via parent
}

resource document "Document" {
  actions read, comment, edit, share, delete
  attributes { owner_id: string, locked: bool }
  relations { parent: folder }

  role owner: *
  role editor extends commenter: edit
  role commenter extends viewer: comment
  role viewer: read

  derive owner from folder#owner via parent
  derive editor from folder#editor via parent
  derive viewer from folder#viewer via parent
}

role admin "Workspace admin": folder:*, document:*
role auditor: folder:read, document:read

// Authors always keep edit rights on their own documents unless locked
userset everyone where user.key != ""
resourceset own_unlocked "Own unlocked documents" on document where resource.owner_id == user.key and resource.locked == false
permit everyone to own_unlocked: read, edit

user alice "alice@acme.example"
user bob "bob@acme.example"
user cindy "cindy@acme.example"
user dave "dave@acme.example"

instance folder:root @acme
instance folder:engineering @acme
instance folder:rfcs @acme
instance document:roadmap @acme { owner_id: "alice", locked: false }
instance document:rfc-042 @acme { owner_id: "cindy", locked: false }
instance document:salaries @acme { owner_id: "alice", locked: true }

relate folder:root parent folder:engineering
relate folder:engineering parent folder:rfcs
relate folder:engineering parent document:roadmap
relate folder:rfcs parent document:rfc-042
relate folder:root parent document:salaries

assign alice owner on folder:root
assign bob editor on folder:engineering
assign cindy viewer on folder:rfcs
assign dave auditor @acme

assert alice can delete document:rfc-042
assert bob can edit document:rfc-042
assert bob cannot edit document:salaries
assert cindy can read document:rfc-042
assert cindy can edit document:rfc-042
assert cindy cannot edit document:roadmap
assert dave can read document:salaries
assert dave cannot edit document:salaries
`

const saas = `// Multi-tenant SaaS: the same user holds different roles in different tenants.

tenant acme "Acme Corp"
tenant globex "Globex"

resource project "Project" {
  actions read, create, update, delete, archive
}

resource invoice "Invoice" {
  actions read, create, approve, pay
  attributes { amount: number }
}

resource settings "Settings" {
  actions read, update
}

// top-level roles do not inherit from each other, so each lists its permissions in full
role viewer: project:read, invoice:read, settings:read
role editor: project:read, project:create, project:update, invoice:read, settings:read
role finance: project:read, invoice:read, invoice:create, invoice:approve, settings:read
role admin: project:*, invoice:*, settings:*

user mai "mai@acme.example"
user tuan "tuan@globex.example"
user lan "lan@contractor.example"

instance project:website @acme
instance project:mobile @globex
instance invoice:inv-1001 @acme { amount: 1200 }
instance invoice:inv-2001 @globex { amount: 50000 }

assign mai admin @acme
assign tuan finance @globex
assign lan editor @acme
assign lan viewer @globex

assert mai can delete project:website
assert mai cannot read project:mobile
assert lan can update project:website
assert lan cannot update project:mobile
assert lan can read project:mobile
assert tuan can approve invoice:inv-2001
assert tuan cannot pay invoice:inv-2001
assert lan can read settings @globex
assert lan cannot update settings @acme
`

const clinic = {
  tenants: [{ key: "default", name: "City Clinic" }],
  resources: [
    {
      key: "patient_record",
      name: "Patient record",
      actions: { read: {}, write: {}, export: {} },
      attributes: {
        department: { type: "string" },
        sensitivity: { type: "number" },
        patient_id: { type: "string" },
      },
    },
    {
      key: "prescription",
      name: "Prescription",
      actions: { read: {}, issue: {}, revoke: {} },
      attributes: { department: { type: "string" }, controlled: { type: "bool" } },
    },
  ],
  roles: [
    { key: "nurse", permissions: [] },
    { key: "doctor", permissions: [] },
    { key: "compliance", permissions: ["patient_record:export"] },
  ],
  condition_sets: [
    {
      key: "on_shift_staff",
      name: "Staff on shift",
      type: "userset",
      conditions: { allOf: [{ "user.on_shift": { equals: true } }, { "user.title": { in: ["doctor", "nurse"] } }] },
    },
    {
      key: "senior_doctors",
      name: "Senior doctors",
      type: "userset",
      conditions: { allOf: [{ "user.title": { equals: "doctor" } }, { "user.years": { "greater-than-equals": 5 } }] },
    },
    {
      key: "patients",
      type: "userset",
      conditions: { allOf: [{ "user.title": { equals: "patient" } }] },
    },
    {
      key: "same_department",
      name: "Records in my department",
      type: "resourceset",
      resource_type: "patient_record",
      conditions: {
        allOf: [{ "resource.department": { equals: { ref: "user.department" } } }, { "resource.sensitivity": { "less-than": 3 } }],
      },
    },
    {
      key: "sensitive_records",
      type: "resourceset",
      resource_type: "patient_record",
      conditions: { allOf: [{ "resource.department": { equals: { ref: "user.department" } } }] },
    },
    {
      key: "own_record",
      type: "resourceset",
      resource_type: "patient_record",
      conditions: { allOf: [{ "resource.patient_id": { equals: { ref: "user.key" } } }] },
    },
    {
      key: "controlled_rx",
      type: "resourceset",
      resource_type: "prescription",
      conditions: {
        allOf: [{ "resource.controlled": { equals: true } }, { "resource.department": { equals: { ref: "user.department" } } }],
      },
    },
  ],
  condition_set_rules: [
    { user_set: "on_shift_staff", permission: "patient_record:read", resource_set: "same_department" },
    { user_set: "senior_doctors", permission: "patient_record:read", resource_set: "sensitive_records" },
    { user_set: "senior_doctors", permission: "patient_record:write", resource_set: "sensitive_records" },
    { user_set: "patients", permission: "patient_record:read", resource_set: "own_record" },
    { user_set: "senior_doctors", permission: "prescription:issue", resource_set: "controlled_rx" },
    { user_set: "on_shift_staff", permission: "prescription:read", resource_set: "prescription" },
  ],
  data: {
    users: [
      {
        key: "dr_hoa",
        email: "hoa@clinic.example",
        attributes: { title: "doctor", department: "cardiology", years: 9, on_shift: true },
        roles: [{ role: "doctor", tenant: "default" }],
      },
      {
        key: "dr_minh",
        email: "minh@clinic.example",
        attributes: { title: "doctor", department: "cardiology", years: 2, on_shift: true },
        roles: [{ role: "doctor", tenant: "default" }],
      },
      {
        key: "nurse_linh",
        email: "linh@clinic.example",
        attributes: { title: "nurse", department: "oncology", years: 4, on_shift: false },
        roles: [{ role: "nurse", tenant: "default" }],
      },
      { key: "p_quang", email: "quang@mail.example", attributes: { title: "patient" } },
      {
        key: "auditor_vy",
        email: "vy@clinic.example",
        attributes: { title: "compliance" },
        roles: [{ role: "compliance", tenant: "default" }],
      },
    ],
    resource_instances: [
      {
        key: "rec-01",
        resource: "patient_record",
        tenant: "default",
        attributes: { department: "cardiology", sensitivity: 1, patient_id: "p_quang" },
      },
      {
        key: "rec-02",
        resource: "patient_record",
        tenant: "default",
        attributes: { department: "cardiology", sensitivity: 4, patient_id: "p_an" },
      },
      {
        key: "rec-03",
        resource: "patient_record",
        tenant: "default",
        attributes: { department: "oncology", sensitivity: 2, patient_id: "p_binh" },
      },
      { key: "rx-77", resource: "prescription", tenant: "default", attributes: { department: "cardiology", controlled: true } },
    ],
    relationship_tuples: [],
  },
  tests: [
    { user: "dr_minh", action: "read", resource: "patient_record:rec-01", expected: true },
    { user: "dr_minh", action: "read", resource: "patient_record:rec-02", expected: false },
    { user: "dr_hoa", action: "read", resource: "patient_record:rec-02", expected: true },
    { user: "dr_hoa", action: "write", resource: "patient_record:rec-03", expected: false },
    { user: "nurse_linh", action: "read", resource: "patient_record:rec-03", expected: false },
    {
      user: "nurse_linh",
      action: "read",
      resource: "patient_record:rec-03",
      expected: true,
      context: { user: { on_shift: true } },
    },
    { user: "p_quang", action: "read", resource: "patient_record:rec-01", expected: true },
    { user: "p_quang", action: "read", resource: "patient_record:rec-02", expected: false },
    { user: "dr_hoa", action: "issue", resource: "prescription:rx-77", expected: true },
    { user: "dr_minh", action: "issue", resource: "prescription:rx-77", expected: false },
    { user: "auditor_vy", action: "export", resource: "patient_record:rec-02", expected: true },
  ],
}

export const SAMPLES: Sample[] = [
  {
    id: "entitlements",
    name: "Entitlements",
    description: "Plan-based feature access for organizations, with a beta opt-in",
    models: ["ReBAC", "RBAC", "ABAC"],
    format: "dsl",
    source: entitlements,
  },
  {
    id: "drive",
    name: "Drive",
    description: "Nested folders and documents; roles flow down the tree",
    models: ["ReBAC", "RBAC", "ABAC"],
    format: "dsl",
    source: drive,
  },
  {
    id: "multi-tenant",
    name: "Multi-tenant SaaS",
    description: "The same user holds different roles in each tenant",
    models: ["RBAC"],
    format: "dsl",
    source: saas,
  },
  {
    id: "clinic",
    name: "Clinic records",
    description: "Attribute rules on department, seniority and shift (JSON input)",
    models: ["ABAC", "RBAC"],
    format: "json",
    source: JSON.stringify(clinic, null, 2) + "\n",
  },
  {
    id: "blank",
    name: "Blank",
    description: "Start from an empty policy",
    models: [],
    format: "dsl",
    source: `resource document {\n  actions read, write\n\n  role viewer: read\n  role editor extends viewer: write\n}\n\nrole admin: document:*\n`,
  },
]

export const DEFAULT_SAMPLE = "entitlements"
