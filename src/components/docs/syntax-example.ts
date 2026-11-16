// The complete example in the user guide's syntax sections. A unit test keeps it valid,
// and the guide derives the JSON form from it, so both always match the parser.
export const SYNTAX_EXAMPLE = `// Tài liệu nội bộ của một công ty
tenant default "Mặc định"
tenant acme "Acme Corp"

resource folder "Thư mục" {
  actions read, create_file, delete
  relations { parent: folder }

  role owner: *
  role editor extends viewer: create_file
  role viewer: read

  derive owner from folder#owner via parent
  derive editor from folder#editor via parent
  derive viewer from folder#viewer via parent
}

resource document "Tài liệu" {
  actions read, edit, share, delete
  attributes { owner_id: string, level: number, tags: array, locked: bool }
  relations { parent: folder }

  role owner: *
  role editor extends viewer: edit
  role viewer: read

  derive owner from folder#owner via parent
  derive editor from folder#editor via parent
  derive viewer from folder#viewer via parent
}

role admin "Quản trị": folder:*, document:*
role auditor: folder:read, document:read

userset seniors "Nhân sự cấp cao" where user.level >= 3 and user.department in ["legal", "hr"]
resourceset own_docs on document where resource.owner_id == user.key and resource.locked == false
resourceset public_docs on document where resource.tags contains "public" or resource.level < 2

permit seniors to public_docs: read
permit seniors to own_docs: read, edit
permit seniors to document: share

user anne "anne@acme.example" { level: 4, department: "legal" }
user bob { level: 1, department: "sales" }
instance folder:root @acme
instance document:plan @acme { owner_id: "anne", level: 3, tags: ["public"], locked: false }

assign anne admin @acme
assign bob viewer on folder:root
relate folder:root parent document:plan

assert anne can delete document:plan
assert bob can read document:plan
assert bob cannot edit document:plan
assert bob can share document:plan @acme with { user.level: 5, user.department: "hr" }
`
