# vAuthz playground

**Live:** https://trantuananh1.github.io/authz-playground/

A browser playground for Permit.io authorization models, in the spirit of the
[OpenFGA playground](https://play.fga.dev/sandbox/?store=entitlements). Write a
policy as a DSL or JSON file, see the model as a graph, check access with a full
explanation, and keep tests next to the policy.

```bash
npm install
npm run dev      # http://localhost:5173/?store=entitlements
npm test         # parser, engine and sample tests
npm run build
```

## What it covers

| Model | Permit concept | DSL |
|---|---|---|
| RBAC | top-level roles per tenant (no inheritance between them) | `role editor: document:read, document:edit` |
| ReBAC | resource roles, relations, role derivation, relationship tuples | `derive editor from folder#editor via parent` |
| ABAC | user sets, resource sets, condition set rules | `permit pros to mine: read` |

One file holds the schema, the data (users, instances, role assignments,
relationships) and the tests. The JSON form uses the Permit API object shapes
(`resources`, `roles`, `condition_sets`, `condition_set_rules`,
`granted_to.users_with_role`, `relationship_tuples`), and converts to and from the
DSL without loss, apart from DSL comments. The **Syntax** tab in the app lists
every construct in both forms.

## Layout

- **Left, top — policy**, in two views:
  - **Text** (CodeMirror): highlighting, inline errors, completion from declared names.
  - **Matrix**: one table per resource, actions as rows and roles as columns, grouped as top-level roles (RBAC), resource roles (ReBAC) and user sets (ABAC); each resource set adds rows for ABAC rules. Ticking a cell rewrites the matching `role` or `permit` statement in the file, keeping comments. Wildcards (`*`, `doc:*`) and permissions inherited through `extends` are marked; new top-level and resource roles can be added from here. Two layouts: **By resource** (one table per resource) and **Overview** (every resource, action and role in a single matrix with sticky headers).
- **Left, bottom — panels**:
  - **Check**: live allow/deny with every granting path and, when denied, what was checked.
  - **Tests**: `assert` lines run on every edit.
  - **Data**: add or remove users, instances, role assignments and relationships. Edits are written into the policy text in place, so DSL comments survive.
  - **Matrix**: every action on every instance for one user, coloured by the model that granted it.
  - **Problems** and **Syntax** (DSL ↔ JSON reference).
- **Right — graph**, full height, two tabs:
  - **Chính sách** (policy): resources, their roles, top-level roles, user sets and resource sets; edges for relations, derivations, grants and rules.
  - **Dữ liệu** (data): users, resource instances (one colour per type) and tenants; edges for role assignments, relationship tuples and tenant membership.

  Nodes are circles laid out by a force simulation. Hovering a node shows its name and attributes and dims everything not connected to it; clicking jumps to its definition; nodes can be dragged. "Show names" labels every node.

A **Docs** tab next to the logo opens a user guide in Vietnamese, illustrated with screenshots of the app (`public/docs/`); `?page=docs` links to it directly.

Samples load with `?store=entitlements|drive|multi-tenant|clinic|blank`. **Share**
packs the file into the URL hash. Import accepts `.dsl`/`.txt` as DSL and
`.json` as JSON, by button or drag and drop.

## Evaluation rules

A check `user, action, type:key` is allowed when any of these grants it:

1. a top-level role the user holds in the resource's tenant (the instance tenant, else `default`) has `type:action` or `type:*` (top-level roles never extend one another);
2. a role the user holds on the instance, assigned directly or derived through a relationship tuple (recursively), allows the action, directly or through resource-role `extends`;
3. the user is in a user set and the resource is in a resource set (or the rule targets the whole type) of a rule granting `type:action`.

Evaluation runs locally in the browser; nothing is sent to Permit.io. This is a
modelling aid, not a byte-for-byte reimplementation of Permit's PDP.

## Code

- `src/lib/policy/` — types, DSL lexer/parser/printer, JSON normaliser, validator, engine, text edits
- `src/samples/` — sample stores
- `src/components/` — editor, graph and panels (shadcn/ui on Tailwind v4)
