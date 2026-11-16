import { describe, expect, it } from "vitest"
import { SAMPLES } from "@/samples"
import { compile, Engine, parseDsl, parseJson, printDsl, printJson } from ".."

describe.each(SAMPLES)("sample $id", (sample) => {
  const { file, diagnostics } = compile(sample.source, sample.format)

  it("compiles without errors", () => {
    expect(diagnostics.filter((d) => d.severity === "error")).toEqual([])
    expect(file).toBeDefined()
  })

  it("passes its own tests", () => {
    const engine = new Engine(file!)
    const failures = file!.tests
      .map((t) => ({ t, r: engine.check(t) }))
      .filter(({ t, r }) => r.allowed !== t.expected)
      .map(({ t, r }) => ({ test: t, grants: r.grants, misses: r.misses }))
    expect(failures).toEqual([])
  })

  it("round-trips DSL <-> JSON", () => {
    const viaDsl = parseDsl(printDsl(file!)).file
    expect(viaDsl).toEqual(file)
    const viaJson = parseJson(printJson(file!))
    expect(viaJson).toEqual(file)
  })
})

describe("diagnostics", () => {
  it("points at DSL syntax errors", () => {
    const src = "resource doc {\n  actions read\n  role viewer read\n}"
    const { diagnostics } = compile(src, "dsl")
    expect(diagnostics[0].message).toMatch(/Unknown resource item 'read'/)
    expect(src.slice(diagnostics[0].from, diagnostics[0].to)).toBe("read")
  })

  it("reports unknown actions", () => {
    const { diagnostics } = compile("resource doc { actions read role viewer: write }", "dsl")
    expect(diagnostics.map((d) => d.message)).toContain("Role 'doc#viewer' grants unknown action 'write'")
  })

  it("rejects extends on top-level roles in DSL", () => {
    const src = "resource doc { actions read }\nrole viewer: doc:read\nrole editor extends viewer: doc:read"
    const { diagnostics, file } = compile(src, "dsl")
    expect(file).toBeUndefined()
    expect(diagnostics[0].message).toMatch(/Top-level role 'editor' cannot extend/)
    expect(src.slice(diagnostics[0].from, diagnostics[0].to)).toBe("extends")
  })

  it("rejects extends on top-level roles in JSON", () => {
    const src = JSON.stringify(
      {
        resources: [{ key: "doc", actions: ["read"] }],
        roles: [
          { key: "a", permissions: [] },
          { key: "b", permissions: [], extends: ["a"] },
        ],
      },
      null,
      2,
    )
    const { diagnostics } = compile(src, "json")
    expect(diagnostics[0].message).toMatch(/Top-level role 'b' cannot extend/)
    expect(src.slice(diagnostics[0].from, diagnostics[0].to)).toBe('"extends"')
  })

  it("still allows extends on resource roles", () => {
    const { diagnostics } = compile("resource doc { actions read, edit role viewer: read role editor extends viewer: edit }", "dsl")
    expect(diagnostics).toEqual([])
  })

  it("reports JSON syntax errors", () => {
    const { diagnostics } = compile('{ "resources": [ }', "json")
    expect(diagnostics[0].severity).toBe("error")
  })
})

describe("text edits", async () => {
  const { applyMutation } = await import("../edits")
  const src = `// keep me\nresource doc { actions read role viewer: read }\n\nuser ann\n\nrelate doc:a parent doc:b\nassert ann can read doc:a\n`

  it("adds a tuple next to the other tuples and keeps comments", () => {
    const out = applyMutation(src, "dsl", { op: "addTuple", tuple: { subject: "doc:x", relation: "parent", object: "doc:y" } })
    expect(out).toContain("// keep me")
    expect(out).toContain("relate doc:a parent doc:b\nrelate doc:x parent doc:y\nassert")
  })

  it("removes a test line", () => {
    const out = applyMutation(src, "dsl", { op: "removeTest", index: 0 })
    expect(out).not.toContain("assert")
    expect(out.endsWith("doc:b\n")).toBe(true)
  })

  it("adds an assignment and removes a user with its assignments", () => {
    let out = applyMutation(src, "dsl", { op: "addAssignment", user: "ann", assignment: { role: "viewer", resource_instance: "doc:a" } })
    expect(out).toContain("user ann\nassign ann viewer on doc:a\n")
    out = applyMutation(out, "dsl", { op: "removeUser", key: "ann" })
    expect(out).not.toMatch(/ann viewer|user ann/)
  })

  it("edits JSON policies", () => {
    const json = JSON.stringify({ resources: [{ key: "doc", actions: ["read"] }] })
    const out = applyMutation(json, "json", { op: "addUser", user: { key: "ann", attributes: { x: 1 } } })
    expect(JSON.parse(out).data.users).toEqual([{ key: "ann", attributes: { x: 1 } }])
  })
})

describe("matrix schema edits", async () => {
  const { applyMutation } = await import("../edits")
  const src = `resource doc {
  actions read, edit, delete
  relations { parent: folder }
  // viewers only read
  role viewer: read
  derive editor from folder#editor via parent
}
resource folder { actions read role editor: read }

role admin: doc:*
userset pros where user.plan == "pro"
permit pros to doc: read
`

  it("rewrites a top-level role line in place", () => {
    const out = applyMutation(src, "dsl", { op: "setRolePermissions", role: "admin", permissions: ["doc:read", "doc:edit"] })
    expect(out).toContain("role admin: doc:read, doc:edit\n")
    expect(out).toContain("// viewers only read")
  })

  it("rewrites a resource role, and adds a statement for a role that only had derive lines", () => {
    let out = applyMutation(src, "dsl", {
      op: "setResourceRolePermissions",
      resource: "doc",
      role: "viewer",
      permissions: ["read", "edit"],
    })
    expect(out).toContain("  role viewer: read, edit\n")
    out = applyMutation(out, "dsl", { op: "setResourceRolePermissions", resource: "doc", role: "editor", permissions: ["edit"] })
    expect(out).toMatch(/derive editor from folder#editor via parent\n {2}role editor: edit\n\}/)
    expect(compile(out, "dsl").diagnostics.filter((d) => d.severity === "error")).toEqual([])
  })

  it("rewrites, merges and removes permit lines", () => {
    let out = applyMutation(src, "dsl", {
      op: "setRuleActions",
      userSet: "pros",
      target: "doc",
      resource: "doc",
      actions: ["read", "edit"],
    })
    expect(out).toContain("permit pros to doc: read, edit\n")
    out = applyMutation(out, "dsl", { op: "setRuleActions", userSet: "pros", target: "doc", resource: "doc", actions: [] })
    expect(out).not.toContain("permit")
    out = applyMutation(out, "dsl", { op: "setRuleActions", userSet: "pros", target: "doc", resource: "doc", actions: ["delete"] })
    expect(out.trimEnd().endsWith("permit pros to doc: delete")).toBe(true)
  })

  it("prints wildcard permissions unquoted", () => {
    const out = applyMutation(src, "dsl", { op: "setRolePermissions", role: "admin", permissions: ["doc:*", "folder:read"] })
    expect(out).toContain("role admin: doc:*, folder:read\n")
  })

  it("adds roles", () => {
    let out = applyMutation(src, "dsl", { op: "addRole", key: "auditor" })
    expect(out).toContain("role admin: doc:*\nrole auditor\n")
    out = applyMutation(out, "dsl", { op: "addResourceRole", resource: "folder", key: "owner" })
    expect(out).toContain("resource folder { actions read role editor: read role owner }")
    expect(compile(out, "dsl").file?.schema.resources[1].roles?.owner).toEqual({ permissions: [] })
  })

  it("edits JSON policies", () => {
    const json = printJson(compile(src, "dsl").file!)
    const out = applyMutation(json, "json", { op: "setRuleActions", userSet: "pros", target: "doc", resource: "doc", actions: ["edit"] })
    expect(JSON.parse(out).condition_set_rules).toEqual([{ user_set: "pros", permission: "doc:edit", resource_set: "doc" }])
  })
})

describe("engine on cyclic relationships", () => {
  const src = `resource folder {
  actions read
  relations { parent: folder }
  role viewer: read
  derive viewer from folder#viewer via parent
}
assign ann viewer on folder:a
relate folder:a parent folder:b
relate folder:b parent folder:c
relate folder:c parent folder:b
assert ann can read folder:c
assert ann can read folder:b
assert bob cannot read folder:c
`
  it("terminates and still finds roles through the cycle, in any order", () => {
    const file = compile(src, "dsl").file!
    for (const order of [file.tests, [...file.tests].reverse()]) {
      const engine = new Engine(file)
      for (const t of order) expect(engine.check(t).allowed).toBe(t.expected)
    }
  })
})
