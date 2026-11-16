import { KindBadge } from "@/components/common"
import type { GrantKind } from "@/lib/policy"

const ROWS: { kind?: GrantKind; title: string; dsl: string; json: string }[] = [
  { title: "Tenant", dsl: `tenant acme "Acme Corp"`, json: `"tenants": [{ "key": "acme", "name": "Acme Corp" }]` },
  {
    title: "Resource, actions, attributes",
    dsl: `resource document {\n  actions read, edit\n  attributes { locked: bool }\n}`,
    json: `"resources": [{ "key": "document",\n  "actions": { "read": {}, "edit": {} },\n  "attributes": { "locked": { "type": "bool" } } }]`,
  },
  {
    kind: "rbac",
    title: "Top-level role, per tenant",
    dsl: `role editor: document:read, document:edit\nrole admin: document:*   // no extends at top level`,
    json: `"roles": [{ "key": "editor",\n  "permissions": ["document:read", "document:edit"] }]`,
  },
  {
    kind: "rebac",
    title: "Resource role and relation",
    dsl: `resource document {\n  relations { parent: folder }\n  role viewer: read\n  role editor extends viewer: edit\n}`,
    json: `"relations": { "parent": "folder" },\n"roles": { "editor": { "permissions": ["edit"],\n  "extends": ["viewer"] } }`,
  },
  {
    kind: "rebac",
    title: "Role derivation",
    dsl: `derive editor from folder#editor via parent`,
    json: `"granted_to": { "users_with_role": [{ "role": "editor",\n  "on_resource": "folder", "linked_by_relation": "parent" }] }`,
  },
  {
    kind: "abac",
    title: "User set and resource set",
    dsl: `userset pros where user.plan == "pro" and user.age >= 18\nresourceset mine on document\n  where resource.owner == user.key`,
    json: `"condition_sets": [{ "key": "pros", "type": "userset",\n  "conditions": { "allOf": [{ "user.plan": { "equals": "pro" } }] } }]`,
  },
  {
    kind: "abac",
    title: "Condition set rule",
    dsl: `permit pros to mine: read, edit\npermit pros to document: read   // every document`,
    json: `"condition_set_rules": [{ "user_set": "pros",\n  "permission": "document:read", "resource_set": "mine" }]`,
  },
  {
    title: "Data",
    dsl: `user anne "anne@acme.example" { plan: "pro" }\ninstance document:d1 @acme { locked: false }\nassign anne admin @acme\nassign anne editor on document:d1\nrelate folder:f1 parent document:d1`,
    json: `"data": { "users": [{ "key": "anne", "roles": [\n  { "role": "admin", "tenant": "acme" },\n  { "role": "editor", "resource_instance": "document:d1" }] }],\n  "relationship_tuples": [{ "subject": "folder:f1",\n  "relation": "parent", "object": "document:d1" }] }`,
  },
  {
    title: "Tests",
    dsl: `assert anne can edit document:d1\nassert bob cannot read document:d1 @acme\nassert eve can read document:d1 with { user.plan: "pro" }`,
    json: `"tests": [{ "user": "anne", "action": "edit",\n  "resource": "document:d1", "expected": true }]`,
  },
]

const OPS = "==  !=  >  >=  <  <=  in [..]  not in [..]  contains  not contains  and  or  ( )"

export function ReferencePanel() {
  return (
    <div className="space-y-3 p-4">
      <p className="max-w-[70ch] text-[12.5px] text-muted-foreground">
        One file holds the schema, the data and the tests. The JSON form follows Permit.io API objects, so a policy moves between the two
        formats without loss (DSL comments aside). Operators in conditions: <code className="font-mono text-foreground">{OPS}</code>. A
        value of <code className="font-mono text-foreground">user.x</code> on the right side compares two attributes.
      </p>
      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b bg-muted/40 text-[11.5px] text-muted-foreground">
              <th className="w-44 px-3 py-1.5 font-medium">Concept</th>
              <th className="px-3 py-1.5 font-medium">DSL</th>
              <th className="px-3 py-1.5 font-medium">JSON</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.title} className="border-b align-top last:border-0">
                <td className="px-3 py-2 text-[12.5px]">
                  <div className="flex flex-col items-start gap-1">
                    {r.title}
                    {r.kind && <KindBadge kind={r.kind} />}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <pre className="font-mono text-[11.5px] leading-5 whitespace-pre-wrap">{r.dsl}</pre>
                </td>
                <td className="px-3 py-2">
                  <pre className="font-mono text-[11.5px] leading-5 whitespace-pre-wrap text-muted-foreground">{r.json}</pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
