import { Plus, Redo2, Trash2, Undo2 } from "lucide-react"
import { useState } from "react"
import { Combo, FieldLabel, ModEnterHint, Mono, submitOnModEnter, useRefOptions } from "@/components/common"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { parseDsl, splitRef, type Attributes } from "@/lib/policy"
import { cn } from "@/lib/utils"
import { useStore } from "@/store"

/** Accepts `plan: "pro", age: 30` or a JSON object. */
function parseAttrs(text: string): { value?: Attributes; error?: string } {
  const body = text.trim()
  if (!body) return { value: undefined }
  try {
    const wrapped = body.startsWith("{") ? body : `{ ${body} }`
    return { value: parseDsl(`user __attrs ${wrapped}`).file.data.users[0].attributes }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

function attrsText(a?: Attributes) {
  if (!a || !Object.keys(a).length) return ""
  return Object.entries(a)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join(", ")
}

const inputCls =
  "h-8 w-full rounded-md border border-input bg-transparent px-2.5 font-mono text-[12.5px] outline-none transition-colors placeholder:text-muted-foreground/70 hover:border-foreground/20 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 dark:bg-input/20"

function Row({ children, onDelete, label }: { children: React.ReactNode; onDelete: () => void; label: string }) {
  return (
    <li className="group flex min-h-10 items-center gap-3 border-b px-4 py-1.5 transition-colors last:border-0 hover:bg-accent/50">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5">{children}</div>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        aria-label={label}
        onClick={onDelete}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </li>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-8 text-center text-[12.5px] text-muted-foreground">{children}</p>
}

function AddForm({
  children,
  onSubmit,
  disabled,
  error,
}: {
  children: React.ReactNode
  onSubmit: () => void
  disabled?: boolean
  error?: string
}) {
  return (
    <form
      className="border-b p-4"
      onKeyDownCapture={submitOnModEnter}
      onSubmit={(e) => {
        e.preventDefault()
        if (!disabled) onSubmit()
      }}
    >
      <div className="flex items-end gap-2">
        {children}
        <Button type="submit" size="sm" className="h-8 shrink-0 gap-1" disabled={disabled}>
          <Plus className="size-3.5" /> Add
          <ModEnterHint />
        </Button>
      </div>
      {error && <p className="mt-1.5 text-[11.5px] text-deny">{error}</p>}
    </form>
  )
}

function Users() {
  const users = useStore((s) => s.file.data.users)
  const mutate = useStore((s) => s.mutate)
  const [key, setKey] = useState("")
  const [email, setEmail] = useState("")
  const [attrs, setAttrs] = useState("")
  const parsed = parseAttrs(attrs)
  const exists = users.some((u) => u.key === key)

  return (
    <>
      <AddForm
        disabled={!key || !!parsed.error}
        error={parsed.error ?? (exists ? `'${key}' exists; adding updates its email and attributes` : undefined)}
        onSubmit={() => {
          const user = { key, ...(email ? { email } : {}), ...(parsed.value ? { attributes: parsed.value } : {}) }
          if (mutate(exists ? { op: "updateUser", user } : { op: "addUser", user })) {
            setKey("")
            setEmail("")
            setAttrs("")
          }
        }}
      >
        <div className="w-28">
          <FieldLabel htmlFor="u-key">Key</FieldLabel>
          <input id="u-key" className={inputCls} value={key} onChange={(e) => setKey(e.target.value)} placeholder="anne" />
        </div>
        <div className="w-40">
          <FieldLabel htmlFor="u-email">Email</FieldLabel>
          <input
            id="u-email"
            className={inputCls}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="anne@acme.example"
          />
        </div>
        <div className="flex-1">
          <FieldLabel htmlFor="u-attrs">Attributes</FieldLabel>
          <input
            id="u-attrs"
            className={inputCls}
            value={attrs}
            onChange={(e) => setAttrs(e.target.value)}
            placeholder='plan: "pro", age: 30'
          />
        </div>
      </AddForm>
      {users.length ? (
        <ul>
          {users.map((u) => (
            <Row key={u.key} label={`Delete user ${u.key}`} onDelete={() => mutate({ op: "removeUser", key: u.key })}>
              <Mono className="font-semibold">{u.key}</Mono>
              {u.email && <span className="text-[12px] text-muted-foreground">{u.email}</span>}
              {u.attributes && Object.keys(u.attributes).length > 0 && (
                <Mono className="text-[11.5px] text-abac">{`{ ${attrsText(u.attributes)} }`}</Mono>
              )}
              {(u.roles?.length ?? 0) > 0 && (
                <span className="text-[11.5px] text-muted-foreground">
                  {u.roles!.length} role{u.roles!.length > 1 ? "s" : ""}
                </span>
              )}
            </Row>
          ))}
        </ul>
      ) : (
        <Empty>No users. Add one above or declare `user anne` in the policy.</Empty>
      )}
    </>
  )
}

function Instances() {
  const file = useStore((s) => s.file)
  const mutate = useStore((s) => s.mutate)
  const opts = useRefOptions(file)
  const [type, setType] = useState("")
  const [key, setKey] = useState("")
  const [tenant, setTenant] = useState("")
  const [attrs, setAttrs] = useState("")
  const parsed = parseAttrs(attrs)
  const instances = file.data.resource_instances
  const exists = instances.some((i) => i.resource === type && i.key === key)

  return (
    <>
      <AddForm
        disabled={!type || !key || !!parsed.error}
        error={parsed.error ?? (exists ? `${type}:${key} exists; adding replaces it` : undefined)}
        onSubmit={() => {
          const instance = { key, resource: type, ...(tenant ? { tenant } : {}), ...(parsed.value ? { attributes: parsed.value } : {}) }
          if (mutate(exists ? { op: "updateInstance", instance } : { op: "addInstance", instance })) {
            setKey("")
            setAttrs("")
          }
        }}
      >
        <div className="w-32">
          <FieldLabel htmlFor="i-type">Resource</FieldLabel>
          <Combo
            id="i-type"
            value={type}
            onChange={setType}
            options={file.schema.resources.map((r) => ({ value: r.key, hint: r.name }))}
            placeholder="document"
          />
        </div>
        <div className="w-28">
          <FieldLabel htmlFor="i-key">Key</FieldLabel>
          <input id="i-key" className={inputCls} value={key} onChange={(e) => setKey(e.target.value)} placeholder="doc1" />
        </div>
        <div className="w-28">
          <FieldLabel htmlFor="i-tenant">Tenant</FieldLabel>
          <Combo id="i-tenant" value={tenant} onChange={setTenant} options={opts.tenants} placeholder="default" />
        </div>
        <div className="flex-1">
          <FieldLabel htmlFor="i-attrs">Attributes</FieldLabel>
          <input id="i-attrs" className={inputCls} value={attrs} onChange={(e) => setAttrs(e.target.value)} placeholder='stage: "beta"' />
        </div>
      </AddForm>
      {instances.length ? (
        <ul>
          {instances.map((i) => (
            <Row
              key={`${i.resource}:${i.key}`}
              label={`Delete ${i.resource}:${i.key}`}
              onDelete={() => mutate({ op: "removeInstance", ref: `${i.resource}:${i.key}` })}
            >
              <Mono>
                <span className="text-rebac">{i.resource}</span>:<span className="font-semibold">{i.key}</span>
              </Mono>
              {i.tenant && <Mono className="text-[11.5px] text-muted-foreground">@{i.tenant}</Mono>}
              {i.attributes && Object.keys(i.attributes).length > 0 && (
                <Mono className="text-[11.5px] text-abac">{`{ ${attrsText(i.attributes)} }`}</Mono>
              )}
            </Row>
          ))}
        </ul>
      ) : (
        <Empty>No resource instances yet.</Empty>
      )}
    </>
  )
}

function Assignments() {
  const file = useStore((s) => s.file)
  const mutate = useStore((s) => s.mutate)
  const opts = useRefOptions(file)
  const [user, setUser] = useState("")
  const [role, setRole] = useState("")
  const [scope, setScope] = useState("")

  // a scope with ':' is a resource instance (ReBAC), otherwise a tenant (RBAC)
  const isInstance = scope.includes(":")
  const [type] = splitRef(scope)
  const roleOptions = isInstance
    ? Object.keys(file.schema.resources.find((r) => r.key === type)?.roles ?? {}).map((r) => ({ value: r, hint: `${type} role` }))
    : file.schema.roles.map((r) => ({ value: r.key, hint: r.name ?? "top-level" }))
  const scopeOptions = [
    ...opts.tenants.map((t) => ({ ...t, group: "Tenants (RBAC)" })),
    ...file.data.resource_instances.map((i) => ({ value: `${i.resource}:${i.key}`, group: "Instances (ReBAC)" })),
  ]
  const rows = file.data.users.flatMap((u) => (u.roles ?? []).map((r, index) => ({ user: u.key, r, index })))

  return (
    <>
      <AddForm
        disabled={!user || !role}
        onSubmit={() => {
          const assignment = isInstance ? { role, resource_instance: scope } : { role, tenant: scope || "default" }
          if (mutate({ op: "addAssignment", user, assignment })) setRole("")
        }}
      >
        <div className="w-28">
          <FieldLabel htmlFor="a-user">User</FieldLabel>
          <Combo id="a-user" value={user} onChange={setUser} options={opts.users} placeholder="anne" />
        </div>
        <div className="flex-1">
          <FieldLabel htmlFor="a-scope">Tenant or instance</FieldLabel>
          <Combo id="a-scope" value={scope} onChange={setScope} options={scopeOptions} placeholder="default or folder:root" />
        </div>
        <div className="w-32">
          <FieldLabel htmlFor="a-role">Role</FieldLabel>
          <Combo id="a-role" value={role} onChange={setRole} options={roleOptions} placeholder="editor" />
        </div>
      </AddForm>
      {rows.length ? (
        <ul>
          {rows.map(({ user, r, index }) => (
            <Row key={`${user}:${index}`} label="Delete role assignment" onDelete={() => mutate({ op: "removeAssignment", user, index })}>
              <Mono className="font-semibold">{user}</Mono>
              <span className="text-[12px] text-muted-foreground">is</span>
              <Mono className={cn(r.resource_instance ? "text-rebac" : "text-rbac")}>{r.role}</Mono>
              <span className="text-[12px] text-muted-foreground">{r.resource_instance ? "on" : "in tenant"}</span>
              <Mono>{r.resource_instance ?? r.tenant ?? "default"}</Mono>
            </Row>
          ))}
        </ul>
      ) : (
        <Empty>No role assignments yet.</Empty>
      )}
    </>
  )
}

function Relationships() {
  const file = useStore((s) => s.file)
  const mutate = useStore((s) => s.mutate)
  const opts = useRefOptions(file)
  const [subject, setSubject] = useState("")
  const [relation, setRelation] = useState("")
  const [object, setObject] = useState("")
  const instanceOpts = opts.resources.filter((o) => o.group === "Instances")
  const [objType] = splitRef(object)
  const relOpts = Object.entries(file.schema.resources.find((r) => r.key === objType)?.relations ?? {}).map(([k, v]) => ({
    value: k,
    hint: `subject: ${v}`,
  }))
  const tuples = file.data.relationship_tuples

  return (
    <>
      <AddForm
        disabled={!subject || !relation || !object}
        onSubmit={() => {
          if (mutate({ op: "addTuple", tuple: { subject, relation, object } })) {
            setSubject("")
            setObject("")
          }
        }}
      >
        <div className="flex-1">
          <FieldLabel htmlFor="r-subj">Subject</FieldLabel>
          <Combo id="r-subj" value={subject} onChange={setSubject} options={instanceOpts} placeholder="folder:root" />
        </div>
        <div className="w-28">
          <FieldLabel htmlFor="r-rel">Relation</FieldLabel>
          <Combo id="r-rel" value={relation} onChange={setRelation} options={relOpts} placeholder="parent" />
        </div>
        <div className="flex-1">
          <FieldLabel htmlFor="r-obj">Object</FieldLabel>
          <Combo id="r-obj" value={object} onChange={setObject} options={instanceOpts} placeholder="document:doc1" />
        </div>
      </AddForm>
      {tuples.length ? (
        <ul>
          {tuples.map((t, i) => (
            <Row key={i} label="Delete relationship" onDelete={() => mutate({ op: "removeTuple", index: i })}>
              <Mono>{t.subject}</Mono>
              <Mono className="rounded-sm bg-rebac/12 px-1.5 text-rebac">{t.relation}</Mono>
              <Mono>{t.object}</Mono>
            </Row>
          ))}
        </ul>
      ) : (
        <Empty>No relationship tuples. They link instances, such as folder:root parent document:doc1.</Empty>
      )}
    </>
  )
}

/** Steps back through edits made from the panels, e.g. a user removed by mistake. */
function UndoRedo() {
  const text = useStore((s) => s.text)
  const last = useStore((s) => s.past.at(-1))
  const next = useStore((s) => s.future.at(-1))
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)
  // typing in the editor after a panel edit makes that edit stale; the editor's own undo covers it then
  const canUndo = !!last && last.after === text
  const canRedo = !!next && next.before === text
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button variant="ghost" size="icon" className="size-7" disabled={!canUndo} onClick={undo} aria-label="Undo">
              <Undo2 className="size-3.5" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>{canUndo ? `Undo: ${last!.label}` : "Nothing to undo"}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button variant="ghost" size="icon" className="size-7" disabled={!canRedo} onClick={redo} aria-label="Redo">
              <Redo2 className="size-3.5" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>{canRedo ? `Redo: ${next!.label}` : "Nothing to redo"}</TooltipContent>
      </Tooltip>
    </div>
  )
}

export function DataPanel() {
  const data = useStore((s) => s.file.data)
  const assignments = data.users.reduce((n, u) => n + (u.roles?.length ?? 0), 0)
  const tabs = [
    { id: "users", label: "Users", count: data.users.length, el: <Users /> },
    { id: "instances", label: "Instances", count: data.resource_instances.length, el: <Instances /> },
    { id: "roles", label: "Role assignments", count: assignments, el: <Assignments /> },
    { id: "relations", label: "Relationships", count: data.relationship_tuples.length, el: <Relationships /> },
  ]
  return (
    <Tabs defaultValue="users" className="gap-0">
      <div className="flex h-10 items-center border-b pr-2">
        <TabsList variant="line" className="h-10 flex-1 justify-start gap-3 rounded-none px-4">
          {tabs.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="flex-none px-0 text-[12.5px]">
              {t.label}
              <span className="font-mono text-[11px] text-muted-foreground">{t.count}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <UndoRedo />
      </div>
      {tabs.map((t) => (
        <TabsContent key={t.id} value={t.id}>
          {t.el}
        </TabsContent>
      ))}
    </Tabs>
  )
}
