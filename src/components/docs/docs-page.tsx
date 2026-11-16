import { ArrowRight, Info, Lightbulb, TriangleAlert } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { KindBadge } from "@/components/common"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { parseDsl, printJson } from "@/lib/policy"
import { cn } from "@/lib/utils"
import { useStore } from "@/store"
import { SYNTAX_EXAMPLE } from "./syntax-example"

// the JSON form of the DSL example, produced by the playground's own printer
const EXAMPLE_JSON = printJson(parseDsl(SYNTAX_EXAMPLE).file)

/* ------------------------------------------------------------ building blocks */

const img = (name: string) => `${import.meta.env.BASE_URL}docs/${name}.png`

function Shot({ name, alt, width = "full" }: { name: string; alt: string; width?: "full" | "half" }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "group my-5 block overflow-hidden rounded-lg border bg-panel transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-foreground/25",
          width === "half" ? "max-w-md" : "w-full",
        )}
        aria-label={`Phóng to ảnh: ${alt}`}
      >
        <img src={img(name)} alt={alt} loading="lazy" className="block w-full transition-transform duration-300 group-hover:scale-[1.01]" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        {/* a fixed width: the dialog is centred from left: 50%, so an auto width would stop at half the screen */}
        <DialogContent className="max-h-[94vh] w-[min(94vw,1600px)] max-w-none place-items-center overflow-auto p-2 sm:max-w-none">
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <img src={img(name)} alt={alt} className="block h-auto max-h-[88vh] w-auto max-w-full rounded-md" />
        </DialogContent>
      </Dialog>
    </>
  )
}

/** A part of the guide: a numbered group of sections. */
function Part({ n, id, title, children }: { n: number; id: string; title: string; children: React.ReactNode }) {
  return (
    <div id={id} className="scroll-mt-6 border-t pt-12 pb-6 first-of-type:border-t-0 first-of-type:pt-0">
      <div className="mb-8">
        <div className="text-[11.5px] font-semibold tracking-wide text-brand uppercase">Phần {n}</div>
        <h2 className="mt-1 text-[26px] font-semibold tracking-tight">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} data-doc-section className="scroll-mt-6 pt-2 pb-8">
      <h3 className="mb-3 text-[20px] font-semibold tracking-tight">{title}</h3>
      {children}
    </section>
  )
}

const H3 = ({ children }: { children: React.ReactNode }) => <h4 className="mt-6 mb-2 text-[15px] font-semibold">{children}</h4>
const P = ({ children }: { children: React.ReactNode }) => <p className="my-3 leading-7 text-foreground/85">{children}</p>
const C = ({ children }: { children: React.ReactNode }) => (
  <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[12.5px] whitespace-nowrap text-foreground">{children}</code>
)
const K = ({ children }: { children: React.ReactNode }) => (
  <kbd className="rounded border border-b-2 bg-muted px-1.5 py-0.5 font-sans text-[11.5px] font-medium text-foreground">{children}</kbd>
)
const B = ({ children }: { children: React.ReactNode }) => <strong className="font-semibold text-foreground">{children}</strong>

function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="my-4 list-none space-y-3 [counter-reset:step] [&>li]:relative [&>li]:pl-9 [&>li]:leading-7">{children}</ol>
}
function Step({ children }: { children: React.ReactNode }) {
  return (
    <li className="text-foreground/85 [counter-increment:step] before:absolute before:top-0.5 before:left-0 before:grid before:size-6 before:place-items-center before:rounded-full before:bg-brand before:text-[12px] before:font-semibold before:text-brand-foreground before:content-[counter(step)]">
      {children}
    </li>
  )
}

function Bullets({ children }: { children: React.ReactNode }) {
  return <ul className="my-3 list-disc space-y-1.5 pl-5 leading-7 text-foreground/85 marker:text-muted-foreground">{children}</ul>
}

function Callout({ tone = "tip", children }: { tone?: "tip" | "note" | "warn"; children: React.ReactNode }) {
  const Icon = tone === "tip" ? Lightbulb : tone === "warn" ? TriangleAlert : Info
  return (
    <div
      className={cn(
        "my-5 flex gap-3 rounded-md border px-4 py-3 text-[13.5px] leading-6",
        tone === "tip" && "border-brand/30 bg-brand/8",
        tone === "note" && "border-rbac/30 bg-rbac/8",
        tone === "warn" && "border-deny/30 bg-deny/8",
      )}
    >
      <Icon className={cn("mt-1 size-4 shrink-0", tone === "tip" ? "text-brand" : tone === "warn" ? "text-deny" : "text-rbac")} />
      <div className="text-foreground/90">{children}</div>
    </div>
  )
}

function Code({ children }: { children: string }) {
  return <pre className="my-4 overflow-x-auto rounded-md border bg-code px-4 py-3 font-mono text-[12.5px] leading-6">{children.trim()}</pre>
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="my-4 overflow-x-auto rounded-md border">
      <table className="w-full text-left text-[13.5px]">
        <thead>
          <tr className="border-b bg-muted/40">
            {head.map((h) => (
              <th key={h} className="px-3 py-2 text-[12px] font-medium text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b align-top last:border-0">
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2 leading-6">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ------------------------------------------------------------------- content */

/** The guide in reading order: parts, each with its sections. */
const PARTS: { title: string; sections: [string, string][] }[] = [
  {
    title: "Bắt đầu",
    sections: [
      ["gioi-thieu", "Giới thiệu"],
      ["mo-hinh", "Ba mô hình phân quyền"],
      ["man-hinh", "Các khu vực trên màn hình"],
      ["bat-dau", "Bắt đầu nhanh"],
    ],
  },
  {
    title: "Viết policy",
    sections: [
      ["viet-policy", "Soạn thảo trong editor"],
      ["cu-phap-dsl", "Cú pháp DSL"],
      ["cu-phap-json", "Cú pháp JSON"],
      ["dsl-json", "Chuyển đổi DSL ↔ JSON"],
      ["matrix-editor", "Sửa bằng Matrix"],
    ],
  },
  {
    title: "Dữ liệu và đồ thị",
    sections: [
      ["data", "Dữ liệu (Data)"],
      ["do-thi", "Đồ thị (Graph)"],
    ],
  },
  {
    title: "Kiểm tra quyền",
    sections: [
      ["check", "Kiểm tra quyền (Check)"],
      ["tests", "Ca kiểm thử (Tests)"],
      ["user-matrix", "Ma trận quyền theo người dùng"],
      ["cach-tinh", "Cách playground quyết định"],
    ],
  },
  { title: "Lưu và chia sẻ", sections: [["luu-chia-se", "Lưu, nhập, xuất, chia sẻ"]] },
  {
    title: "Tham khảo",
    sections: [
      ["policy-lon", "Làm việc với policy lớn"],
      ["phim-tat", "Phím tắt"],
      ["hoi-dap", "Hỏi đáp"],
    ],
  },
]
const TOC = PARTS.flatMap((p) => p.sections)

function Content() {
  const setPage = useStore((s) => s.setPage)
  return (
    <>
      <h1 className="mb-2 text-[30px] font-semibold tracking-tight">Hướng dẫn sử dụng vAuthz Playground</h1>
      <p className="mb-12 text-muted-foreground">
        Từ những bước đầu tiên tới cú pháp đầy đủ, chia thành sáu phần theo thứ tự bạn làm việc.
      </p>
      <Part n={1} id="phan-1" title="Bắt đầu">
        <Section id="gioi-thieu" title="Giới thiệu">
          <P>
            Playground giúp bạn <B>thiết kế và thử nghiệm mô hình phân quyền</B> ngay trong trình duyệt. Bạn viết policy dưới dạng DSL hoặc
            JSON, xem mô hình dưới dạng đồ thị, hỏi “người dùng này có được làm việc này không, và vì sao”, rồi lưu các câu hỏi đó thành ca
            kiểm thử ngay trong file.
          </P>
          <P>
            Mọi tính toán diễn ra trên máy bạn. Playground <B>không gửi dữ liệu lên bất kỳ máy chủ nào</B>.
          </P>
          <button
            type="button"
            onClick={() => setPage("playground")}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[13px] font-medium text-primary-foreground transition-transform hover:-translate-y-px active:translate-y-0"
          >
            Mở playground <ArrowRight className="size-3.5" />
          </button>
        </Section>
        <Section id="mo-hinh" title="Ba mô hình phân quyền">
          <P>Playground hỗ trợ cả ba mô hình phân quyền phổ biến, và bạn có thể kết hợp chúng trong cùng một file.</P>
          <Table
            head={["Mô hình", "Ý tưởng", "Ví dụ trong DSL"]}
            rows={[
              [
                <KindBadge key="m" kind="rbac" />,
                <>
                  Theo <B>vai trò trong tenant</B>. Ai là <C>admin</C> của tenant <C>acme</C> thì được mọi quyền trên tài nguyên của acme.
                </>,
                <C key="e">role admin: document:*</C>,
              ],
              [
                <KindBadge key="m" kind="rebac" />,
                <>
                  Theo <B>quan hệ giữa các đối tượng</B>. Chủ thư mục là chủ mọi tài liệu nằm trong thư mục đó.
                </>,
                <C key="e">derive owner from folder#owner via parent</C>,
              ],
              [
                <KindBadge key="m" kind="abac" />,
                <>
                  Theo <B>thuộc tính</B> của người dùng và tài nguyên, ví dụ bác sĩ trực ca chỉ xem hồ sơ cùng khoa.
                </>,
                <C key="e">userset pros where user.plan == "pro"</C>,
              ],
            ]}
          />
          <P>
            Màu xanh dương, vàng và xanh ngọc ở trên được dùng nhất quán trong toàn bộ playground: trên đồ thị, trong Matrix và trong phần
            giải thích của Check.
          </P>
        </Section>
        <Section id="man-hinh" title="Các khu vực trên màn hình">
          <P>Màn hình chia thành bốn khu vực, đánh số trong ảnh dưới đây.</P>
          <Shot name="overview" alt="Toàn cảnh playground với bốn khu vực được đánh số" />
          <Steps>
            <Step>
              <B>Thanh trên cùng (header).</B> Điều hướng, chọn nguồn policy, định dạng và chia sẻ. Xem chi tiết từng nhóm ngay bên dưới.
            </Step>
            <Step>
              <B>Policy.</B> Nội dung file policy. Xem dạng <B>Text</B> (soạn thảo như code) hoặc <B>Matrix</B> (bảng tick quyền). Góc phải
              cho biết policy hợp lệ (<span className="text-allow">Valid</span>) hay đang có lỗi.
            </Step>
            <Step>
              <B>Bảng công cụ.</B> Các tab <B>Check</B>, <B>Tests</B>, <B>Data</B>, <B>Matrix</B>, <B>Problems</B>. Con số cạnh tên tab cho
              biết số lượng: Tests màu xanh là tất cả đều đạt, màu đỏ là số ca đang trượt.
            </Step>
            <Step>
              <B>Graph (đồ thị).</B> Hai tab <B>Policy</B> (mô hình) và <B>Data</B> (người dùng, tài nguyên và quan hệ giữa chúng).
            </Step>
          </Steps>
          <P>
            Thanh dưới cùng đếm số tenant, resource, role, condition set, user và relationship trong file. Bạn có thể kéo đường phân cách
            giữa các khu vực để đổi kích thước.
          </P>
          <H3>Thanh trên cùng</H3>
          <P>Các nút được gom thành năm nhóm, theo thứ tự bạn thường làm việc: chọn policy, chọn định dạng, rồi xuất hoặc chia sẻ.</P>
          <Shot name="header-groups" alt="Thanh trên cùng với năm nhóm được đánh số" />
          <Table
            head={["", "Nhóm", "Thành phần", "Dùng để"]}
            rows={[
              [
                "1",
                <span key="g" className="whitespace-nowrap">
                  Điều hướng
                </span>,
                "Logo · Playground · Docs",
                "Chuyển giữa playground và trang hướng dẫn này.",
              ],
              [
                "2",
                <span key="g" className="whitespace-nowrap">
                  Nguồn
                </span>,
                <>
                  <B>Store ▾</B> · <B>Import</B>
                </>,
                <>
                  Lấy policy: chọn một store mẫu, hoặc mở file <C>.dsl</C> / <C>.json</C> của bạn (cũng có thể kéo-thả file vào trang).
                </>,
              ],
              [
                "3",
                <span key="g" className="whitespace-nowrap">
                  Định dạng
                </span>,
                <>
                  <B>DSL</B> / <B>JSON</B>
                </>,
                "Đổi cách viết policy trong editor; nội dung được chuyển đổi tự động.",
              ],
              [
                "4",
                <span key="g" className="whitespace-nowrap">
                  Đầu ra
                </span>,
                <>
                  <B>Export ▾</B> · <B>Share</B>
                </>,
                "Tải file về (DSL hoặc JSON), sao chép nội dung, hoặc tạo đường link chứa toàn bộ file để gửi người khác.",
              ],
              [
                "5",
                <span key="g" className="whitespace-nowrap">
                  Tuỳ chọn
                </span>,
                "Mặt trời / mặt trăng",
                "Chuyển giao diện tối và sáng.",
              ],
            ]}
          />
        </Section>
        <Section id="bat-dau" title="Bắt đầu nhanh">
          <Steps>
            <Step>
              Bấm menu <B>Store</B> trên header và chọn một store mẫu, ví dụ <B>Entitlements</B>. Mỗi store ghi rõ nó dùng mô hình nào.
            </Step>
          </Steps>
          <Shot name="store-menu" alt="Menu chọn store mẫu" />
          <Steps>
            <Step>Đọc policy trong khung Policy. Các dòng bắt đầu bằng // là chú thích giải thích ý đồ của mẫu.</Step>
            <Step>
              Ở tab <B>Check</B>, chọn <B>User</B>, <B>Action</B> và <B>Resource</B>. Kết quả <span className="text-allow">Allowed</span>{" "}
              hoặc <span className="text-deny">Denied</span> hiện ngay, kèm lý do.
            </Step>
            <Step>Sửa thử policy, ví dụ bỏ một quyền khỏi một role. Kết quả Check, Tests và đồ thị cập nhật ngay khi bạn gõ.</Step>
            <Step>
              Bấm <B>Share</B> để sao chép đường link chứa toàn bộ file, gửi cho đồng nghiệp xem đúng trạng thái bạn đang có.
            </Step>
          </Steps>
        </Section>
      </Part>
      <Part n={2} id="phan-2" title="Viết policy">
        <Section id="viet-policy" title="Soạn thảo trong editor">
          <P>
            Chế độ <B>Text</B> là một trình soạn thảo code: có tô màu cú pháp, gợi ý từ khoá và tên đã khai báo (gõ vài chữ hoặc bấm{" "}
            <K>Ctrl</K> <K>Space</K>), gập/mở khối, và tìm kiếm/thay thế bằng <K>⌘</K> <K>F</K>.
          </P>
          <Shot name="editor-text" alt="Trình soạn thảo policy ở chế độ Text" />
          <H3>Một file gồm ba phần</H3>
          <P>
            <B>Mô hình</B> (tenant, resource, role, quy tắc ABAC), <B>dữ liệu</B> (người dùng, tài nguyên, gán role, quan hệ) và{" "}
            <B>ca kiểm thử</B>. Cú pháp đầy đủ của từng phần nằm ở hai mục <B>Cú pháp DSL</B> và <B>Cú pháp JSON</B> ngay bên dưới.
          </P>
          <H3>Khi có lỗi</H3>
          <P>
            Lỗi được gạch chân đỏ ngay tại chỗ, kèm chấm đỏ ở lề trái; cảnh báo gạch chân vàng. Di chuột vào chỗ gạch chân để đọc thông báo.
            Góc phải khung Policy hiện số lỗi.
          </P>
          <Shot name="editor-error" alt="Lỗi được gạch chân và giải thích khi di chuột" />
          <P>
            Tab <B>Problems</B> gom mọi lỗi và cảnh báo kèm số dòng. Bấm vào một dòng để nhảy tới chỗ lỗi trong editor.
          </P>
          <Shot name="problems" alt="Tab Problems liệt kê lỗi" />
          <P>Một số lỗi thường gặp:</P>
          <Bullets>
            <li>
              <B>Top-level role không được kế thừa nhau.</B> <C>role editor extends viewer</C> chỉ hợp lệ bên trong một <C>resource</C>. Ở
              cấp tenant, hãy liệt kê đủ quyền cho từng role.
            </li>
            <li>
              Role cấp một action không có trong <C>actions</C> của resource.
            </li>
            <li>
              <C>derive</C> dùng một relation không tồn tại, hoặc relation trỏ tới loại resource khác với loại ghi sau <C>from</C>.
            </li>
            <li>
              <C>userset</C> đọc thuộc tính <C>resource.*</C>. Điều kiện về tài nguyên phải đặt trong <C>resourceset</C>.
            </li>
          </Bullets>
        </Section>
        <Section id="cu-phap-dsl" title="Cú pháp DSL">
          <H3>Quy tắc chung</H3>
          <Bullets>
            <li>
              Mỗi câu lệnh bắt đầu bằng một từ khoá (<C>tenant</C>, <C>resource</C>, <C>role</C>, …). Xuống dòng và khoảng trắng không quan
              trọng; nên viết mỗi câu lệnh một dòng cho dễ đọc.
            </li>
            <li>
              Chú thích bắt đầu bằng <C>//</C> và kéo tới hết dòng.
            </li>
            <li>
              <B>Tên</B> (key) gồm chữ, số, <C>_</C> và <C>-</C>, ví dụ <C>folder</C>, <C>rfc-042</C>. Tên có ký tự khác hoặc trùng từ khoá
              (<C>and</C>, <C>or</C>, <C>not</C>, <C>in</C>, <C>to</C>, <C>on</C>, <C>with</C>, …) thì đặt trong ngoặc kép:{" "}
              <C>"anne@acme.example"</C>.
            </li>
            <li>
              <B>Tên hiển thị</B> là một chuỗi trong ngoặc kép, đặt ngay sau tên: <C>resource folder "Thư mục"</C>. Chuỗi hỗ trợ <C>\"</C>,{" "}
              <C>\n</C>.
            </li>
            <li>
              Tham chiếu tới một tài nguyên cụ thể viết <C>loại:khoá</C>, ví dụ <C>document:plan</C>.
            </li>
          </Bullets>

          <H3>Tenant</H3>
          <Code>{`tenant acme "Acme Corp"`}</Code>
          <P>
            Khai báo tenant là tuỳ chọn nhưng nên có, để playground cảnh báo khi bạn gõ nhầm tên tenant. Tenant <C>default</C> dùng khi
            không ghi tenant.
          </P>

          <H3>Resource</H3>
          <Code>{`resource document "Tài liệu" {
    actions read, edit, share, delete
    attributes { owner_id: string, level: number, tags: array, locked: bool }
    relations { parent: folder }
  
    role viewer: read
    role editor extends viewer: edit
    role owner: *
  
    derive editor from folder#editor via parent
  }`}</Code>
          <Table
            head={["Dòng", "Ý nghĩa"]}
            rows={[
              [<C key="c">actions a, b</C>, "Các hành động có thể làm trên resource. Bắt buộc phải có ít nhất một."],
              [
                <C key="c">{"attributes { tên: kiểu }"}</C>,
                <>
                  Thuộc tính của tài nguyên, dùng trong điều kiện ABAC. Kiểu: <C>string</C>, <C>number</C>, <C>bool</C>, <C>array</C>,{" "}
                  <C>json</C>, <C>time</C>.
                </>,
              ],
              [
                <C key="c">{"relations { tên: resource }"}</C>,
                <>
                  Quan hệ tới resource khác (hoặc chính nó). <C>parent: folder</C> nghĩa là một folder có thể là <C>parent</C> của tài
                  nguyên này.
                </>,
              ],
              [
                <C key="c">role tên: action, …</C>,
                <>
                  Role trên từng tài nguyên (ReBAC). <C>*</C> là mọi action. <C>extends viewer</C> thừa hưởng toàn bộ quyền của role{" "}
                  <C>viewer</C> cùng resource.
                </>,
              ],
              [
                <C key="c">derive A from R#B via rel</C>,
                <>
                  Ai có role <C>B</C> trên một <C>R</C> là <C>rel</C> của tài nguyên này thì có role <C>A</C> trên tài nguyên này. Ví dụ
                  biên tập viên của thư mục cha là biên tập viên của tài liệu. Có thể suy nhiều tầng.
                </>,
              ],
            ]}
          />

          <H3>Role cấp tenant (RBAC)</H3>
          <Code>{`role admin "Quản trị": folder:*, document:*
  role auditor: folder:read, document:read`}</Code>
          <P>
            Quyền viết <C>resource:action</C> hoặc <C>resource:*</C>. Role cấp tenant được gán cho người dùng theo từng tenant và{" "}
            <B>không kế thừa nhau</B>: mỗi role phải liệt kê đủ quyền của nó.
          </P>

          <H3>Quy tắc ABAC</H3>
          <Code>{`userset seniors "Nhân sự cấp cao" where user.level >= 3 and user.department in ["legal", "hr"]
  resourceset own_docs on document where resource.owner_id == user.key and resource.locked == false
  
  permit seniors to own_docs: read, edit     // người trong seniors được đọc, sửa tài liệu của chính họ
  permit seniors to document: share          // ghi tên resource: áp cho mọi tài liệu`}</Code>
          <Bullets>
            <li>
              <C>userset</C> chọn người dùng theo thuộc tính <C>user.*</C>; <C>resourceset … on resource</C> chọn tài nguyên theo{" "}
              <C>resource.*</C> (có thể so với <C>user.*</C>).
            </li>
            <li>
              <C>permit nhóm-người to nhóm-tài-nguyên: action, …</C> cấp quyền. Vế phải của <C>to</C> là một resource set, hoặc tên resource
              để áp cho mọi tài nguyên loại đó.
            </li>
          </Bullets>

          <H3>Điều kiện</H3>
          <Table
            head={["Viết", "Nghĩa", "Ví dụ"]}
            rows={[
              [<C key="c">== !=</C>, "bằng / khác", <C key="e">user.plan == "pro"</C>],
              [<C key="c">{">  >=  <  <="}</C>, "so sánh số", <C key="e">user.level &gt;= 3</C>],
              [<C key="c">in [...] not in [...]</C>, "giá trị nằm / không nằm trong danh sách", <C key="e">user.role in ["a", "b"]</C>],
              [<C key="c">contains not contains</C>, "mảng chứa / không chứa giá trị", <C key="e">resource.tags contains "public"</C>],
              [
                <C key="c">and or ( )</C>,
                "kết hợp; and được tính trước or, dùng ngoặc để đổi thứ tự",
                <C key="e">(a == 1 or b == 2) and c == 3</C>,
              ],
            ]}
          />
          <Bullets>
            <li>
              Vế trái là <C>user.tên</C> hoặc <C>resource.tên</C>; thuộc tính lồng nhau viết thêm dấu chấm: <C>user.address.city</C>.
            </li>
            <li>
              Vế phải là chuỗi, số, <C>true</C>/<C>false</C>, <C>null</C>, danh sách <C>[…]</C>, hoặc một thuộc tính khác như{" "}
              <C>user.key</C> để so hai thuộc tính với nhau.
            </li>
            <li>
              Thuộc tính có sẵn: <C>user.key</C>, <C>user.email</C>, <C>user.first_name</C>, <C>resource.key</C>, <C>resource.type</C>,{" "}
              <C>resource.tenant</C>.
            </li>
          </Bullets>

          <H3>Dữ liệu</H3>
          <Code>{`user anne "anne@acme.example" { level: 4, department: "legal" }   // email và thuộc tính là tuỳ chọn
  instance document:plan @acme { owner_id: "anne", tags: ["public"] }  // @tenant là tuỳ chọn
  
  assign anne admin @acme              // role cấp tenant; bỏ @tenant thì là default
  assign bob viewer on folder:root     // role trên một tài nguyên cụ thể
  relate folder:root parent document:plan   // folder:root là parent của document:plan`}</Code>
          <P>
            Giá trị thuộc tính có thể là chuỗi, số, <C>true</C>/<C>false</C>, <C>null</C>, danh sách <C>[…]</C> hoặc object <C>{"{ … }"}</C>
            . Quan hệ đọc theo thứ tự <B>subject – relation – object</B>; relation phải được khai báo trong <C>relations</C> của resource
            phía object.
          </P>

          <H3>Ca kiểm thử</H3>
          <Code>{`assert anne can delete document:plan
  assert bob cannot edit document:plan
  assert anne can read document                                   // không ghi khoá: hỏi theo role cấp tenant
  assert bob can share document:plan @acme with { user.level: 5 } // tenant và thuộc tính tạm thời`}</Code>
          <P>
            <C>with {"{ … }"}</C> ghi đè thuộc tính của người dùng hoặc tài nguyên chỉ cho riêng ca này, giống ô Context attributes trong
            Check.
          </P>

          <H3>Ví dụ đầy đủ</H3>
          <P>File dưới đây dùng mọi cú pháp ở trên và chạy được ngay: dán vào editor (chọn store Blank trước) để thử.</P>
          <Code>{SYNTAX_EXAMPLE}</Code>
        </Section>
        <Section id="cu-phap-json" title="Cú pháp JSON">
          <P>
            Dạng JSON mô tả cùng nội dung bằng các object có cấu trúc. Một file là một object với các khoá dưới đây; khoá nào không dùng có
            thể bỏ. Các phần mô hình cũng có thể đặt chung trong một khoá <C>schema</C>.
          </P>
          <Code>{`{
    "tenants": [ … ],
    "resources": [ … ],
    "roles": [ … ],                 // role cấp tenant
    "condition_sets": [ … ],        // user set và resource set
    "condition_set_rules": [ … ],   // quy tắc permit
    "data": { "users": [ … ], "resource_instances": [ … ], "relationship_tuples": [ … ] },
    "tests": [ … ]
  }`}</Code>

          <H3>Resource</H3>
          <Code>{`{
    "key": "document",
    "name": "Tài liệu",
    "actions": { "read": {}, "edit": {} },              // hoặc ["read", "edit"]
    "attributes": { "owner_id": { "type": "string" } },
    "relations": { "parent": "folder" },                // hoặc { "parent": { "subject_resource": "folder" } }
    "roles": {
      "viewer": { "permissions": ["read"] },
      "editor": {
        "permissions": ["edit"],
        "extends": ["viewer"],
        "granted_to": {
          "users_with_role": [{ "role": "editor", "on_resource": "folder", "linked_by_relation": "parent" }]
        }
      }
    }
  }`}</Code>
          <P>
            <C>granted_to.users_with_role</C> là dạng JSON của <C>derive</C>. <C>roles</C> cũng có thể là một mảng các object có <C>key</C>.
          </P>

          <H3>Role cấp tenant, tenant</H3>
          <Code>{`"tenants": [{ "key": "acme", "name": "Acme Corp" }],
  "roles": [{ "key": "admin", "name": "Quản trị", "permissions": ["folder:*", "document:*"] }]`}</Code>
          <P>
            Role cấp tenant không có <C>extends</C>; playground báo lỗi nếu gặp.
          </P>

          <H3>User set, resource set và quy tắc</H3>
          <Code>{`"condition_sets": [
    { "key": "seniors", "type": "userset",
      "conditions": { "allOf": [
        { "user.level": { "greater-than-equals": 3 } },
        { "user.department": { "in": ["legal", "hr"] } } ] } },
    { "key": "own_docs", "type": "resourceset", "resource_type": "document",
      "conditions": { "allOf": [
        { "resource.owner_id": { "equals": { "ref": "user.key" } } } ] } }
  ],
  "condition_set_rules": [
    { "user_set": "seniors", "permission": "document:read", "resource_set": "own_docs" }
  ]`}</Code>
          <Bullets>
            <li>
              Điều kiện là cây <C>allOf</C> (tất cả đều đúng) và <C>anyOf</C> (ít nhất một đúng), lồng nhau tuỳ ý. Mỗi lá có dạng{" "}
              <C>{'{ "thuộc tính": { "toán tử": giá trị } }'}</C>.
            </li>
            <li>
              So với một thuộc tính khác: giá trị là <C>{'{ "ref": "user.key" }'}</C>.
            </li>
            <li>
              Mỗi quy tắc cấp đúng một quyền; DSL <C>permit seniors to own_docs: read, edit</C> tương ứng hai quy tắc. <C>resource_set</C>{" "}
              là tên resource set, hoặc tên resource để áp cho mọi tài nguyên loại đó.
            </li>
          </Bullets>
          <Table
            head={["DSL", "JSON"]}
            rows={[
              [<C key="d">==</C>, <C key="j">equals</C>],
              [<C key="d">!=</C>, <C key="j">not-equals</C>],
              [<C key="d">&gt;</C>, <C key="j">greater-than</C>],
              [<C key="d">&gt;=</C>, <C key="j">greater-than-equals</C>],
              [<C key="d">&lt;</C>, <C key="j">less-than</C>],
              [<C key="d">&lt;=</C>, <C key="j">less-than-equals</C>],
              [<C key="d">in</C>, <C key="j">in</C>],
              [<C key="d">not in</C>, <C key="j">not-in</C>],
              [<C key="d">contains</C>, <C key="j">array_contains</C>],
              [<C key="d">not contains</C>, <C key="j">array_not_contains</C>],
              [<C key="d">and / or</C>, <C key="j">allOf / anyOf</C>],
            ]}
          />

          <H3>Dữ liệu</H3>
          <Code>{`"data": {
    "users": [{
      "key": "anne", "email": "anne@acme.example",
      "attributes": { "level": 4 },
      "roles": [
        { "role": "admin", "tenant": "acme" },
        { "role": "viewer", "resource_instance": "folder:root" }
      ]
    }],
    "resource_instances": [
      { "key": "plan", "resource": "document", "tenant": "acme", "attributes": { "owner_id": "anne" } }
    ],
    "relationship_tuples": [
      { "subject": "folder:root", "relation": "parent", "object": "document:plan" }
    ]
  }`}</Code>
          <P>
            Gán role nằm trong từng người dùng: có <C>tenant</C> là role cấp tenant, có <C>resource_instance</C> là role trên một tài
            nguyên.
          </P>

          <H3>Ca kiểm thử</H3>
          <Code>{`"tests": [
    { "user": "anne", "action": "delete", "resource": "document:plan", "expected": true },
    { "user": "bob", "action": "share", "resource": "document:plan", "tenant": "acme",
      "expected": true, "context": { "user": { "level": 5 } } }
  ]`}</Code>

          <H3>Ví dụ đầy đủ</H3>
          <P>
            Đây là ví dụ đầy đủ của mục Cú pháp DSL, viết dưới dạng JSON (chính là kết quả khi bấm nút <B>JSON</B> trên header).
          </P>
          <details className="group my-4 rounded-md border">
            <summary className="cursor-pointer px-4 py-2 text-[13px] font-medium text-foreground/85 transition-colors hover:bg-accent/50">
              Mở bản JSON đầy đủ
            </summary>
            <pre className="overflow-x-auto border-t bg-code px-4 py-3 font-mono text-[12px] leading-5">{EXAMPLE_JSON}</pre>
          </details>
        </Section>
        <Section id="dsl-json" title="Chuyển đổi DSL ↔ JSON">
          <P>
            Cùng một policy có thể viết bằng <B>DSL</B> (file <C>.dsl</C>, gọn, dễ đọc, có chú thích) hoặc <B>JSON</B> (file <C>.json</C>,
            có cấu trúc rõ ràng, tiện cho máy xử lý).
          </P>
          <Bullets>
            <li>
              Bấm <B>DSL</B> hoặc <B>JSON</B> trên header để chuyển đổi nội dung editor sang định dạng kia. Không mất dữ liệu nào.
            </li>
            <li>
              JSON không có chú thích, nên các dòng <C>//</C> sẽ mất khi chuyển từ DSL sang JSON. Playground có báo trước khi việc này xảy
              ra.
            </li>
            <li>
              Khi mở file, playground tự nhận định dạng theo đuôi file (<C>.dsl</C>, <C>.txt</C> là DSL; <C>.json</C> là JSON) hoặc theo nội
              dung.
            </li>
          </Bullets>
        </Section>
        <Section id="matrix-editor" title="Sửa bằng Matrix">
          <P>
            Bấm <B>Matrix</B> ở góc trái khung Policy để sửa quyền bằng cách tick vào ô. Mỗi lần tick, playground viết lại đúng dòng{" "}
            <C>role …</C> hoặc <C>permit …</C> tương ứng trong file. Chú thích và phần còn lại của file được giữ nguyên.
          </P>
          <H3>Hai kiểu xem</H3>
          <P>
            <B>By resource</B>: mỗi resource một bảng. Hàng là action, cột là role, chia ba nhóm màu: Top-level roles, Resource roles và
            User sets.
          </P>
          <Shot name="matrix-resource" alt="Matrix theo từng resource" />
          <P>
            <B>Overview</B>: gộp mọi resource vào một ma trận duy nhất. Tiêu đề cột và cột action được giữ cố định khi cuộn. Ô thuộc role
            của resource khác được để trống.
          </P>
          <Shot name="matrix-overview" alt="Matrix tổng thể gộp tất cả resource" />
          <H3>Ý nghĩa các ô</H3>
          <Table
            head={["Ô", "Ý nghĩa"]}
            rows={[
              ["Có dấu ✓", "Role được cấp action này. Bấm để bỏ."],
              ["Ô trống", "Chưa được cấp. Bấm để cấp."],
              [
                "✓ kèm dấu ✱ ở góc",
                <>
                  Được cấp qua ký tự đại diện (<C>*</C> hoặc <C>document:*</C>). Bỏ tick sẽ thay ký tự đại diện bằng danh sách các action
                  còn lại.
                </>,
              ],
              [
                "✓ mờ, viền nét đứt",
                <>
                  Kế thừa qua <C>extends</C> từ role khác. Không bấm được; di chuột vào để biết kế thừa từ role nào, rồi sửa ở role đó.
                </>,
              ],
              ["Dấu –", "Không áp dụng. Hàng của resource set chỉ nhận quy tắc ABAC."],
            ]}
          />
          <Bullets>
            <li>
              Bấm <B>+ Top-level role</B> hoặc <B>+ Resource role</B> để thêm role mới.
            </li>
            <li>Bấm vào tên cột để quay về chế độ Text và nhảy tới dòng định nghĩa role đó.</li>
            <li>Khi file đang có lỗi cú pháp, Matrix chỉ cho xem, không cho sửa, cho tới khi bạn sửa xong lỗi trong Text.</li>
          </Bullets>
        </Section>
      </Part>
      <Part n={3} id="phan-3" title="Dữ liệu và đồ thị">
        <Section id="data" title="Dữ liệu (Data)">
          <P>
            Tab <B>Data</B> có bốn tab con: <B>Users</B>, <B>Instances</B> (tài nguyên cụ thể), <B>Role assignments</B> (gán role) và{" "}
            <B>Relationships</B> (quan hệ giữa các tài nguyên). Mọi thay đổi ở đây được viết thẳng vào file policy.
          </P>
          <Shot name="data" alt="Tab Data với danh sách người dùng" />
          <Bullets>
            <li>
              Ô <B>Attributes</B> nhận dạng <C>plan: "pro", age: 30</C> hoặc một object JSON.
            </li>
            <li>
              Trong <B>Role assignments</B>, chọn một tenant để gán role cấp tenant (RBAC), hoặc chọn một tài nguyên như <C>folder:root</C>{" "}
              để gán role trên tài nguyên đó (ReBAC).
            </li>
            <li>
              Trong <B>Relationships</B>, quan hệ đọc là “subject là relation của object”, ví dụ <C>folder:root</C> là <C>parent</C> của{" "}
              <C>document:d1</C>.
            </li>
            <li>
              Bấm <B>Add</B> hoặc <K>⌘</K> <K>Enter</K> từ bất kỳ ô nào trong form.
            </li>
          </Bullets>
          <Callout>
            Lỡ xoá nhầm? Bấm nút <B>Undo</B> (mũi tên vòng trái) ở góc phải hàng tab con, hoặc nút <B>Undo</B> trong thông báo hiện lên ngay
            sau khi xoá. Nút bên cạnh là <B>Redo</B>. Playground nhớ 50 thao tác gần nhất.
          </Callout>
        </Section>
        <Section id="do-thi" title="Đồ thị (Graph)">
          <P>
            Tab <B>Policy</B> của khung Graph vẽ mô hình: resource (tròn lớn), role của resource (tròn nhỏ quanh nó), role cấp tenant, user
            set và resource set. Các cạnh thể hiện relation, role derivation, quyền của role và quy tắc ABAC. Bảng <B>Legend</B> ở góc trái
            giải thích từng biểu tượng và từng kiểu nét.
          </P>
          <Shot name="graph-policy" alt="Đồ thị chính sách khi di chuột vào một user set" />
          <Bullets>
            <li>
              <B>Di chuột</B> vào một nút để xem chi tiết (tên, thuộc tính, quyền). Các nút không liên quan được làm mờ, nhãn trên các cạnh
              liên quan hiện ra. Bảng chi tiết tự đặt ở chỗ trống để không che các thành phần khác.
            </li>
            <li>
              <B>Bấm</B> vào một nút để nhảy tới định nghĩa của nó trong editor.
            </li>
            <li>
              <B>Kéo</B> nút để sắp xếp lại; cuộn chuột hoặc dùng nút +/– ở góc phải dưới để phóng to, thu nhỏ.
            </li>
            <li>
              Tắt <B>Show names</B> trong Legend nếu muốn ẩn tên dưới các nút. Bấm tiêu đề <B>Legend</B> để thu gọn bảng.
            </li>
            <li>
              <B>Bấm một mục trong Legend</B> để ẩn hoặc hiện loại thành phần đó (ví dụ ẩn mọi Resource role, hoặc mọi cạnh Role
              derivation). Mục đang ẩn bị mờ và có biểu tượng con mắt gạch chéo; bấm <B>Show all</B> để hiện lại tất cả. Vị trí các nút
              không đổi khi ẩn hiện.
            </li>
          </Bullets>
          <H3>Tập trung vào một nút</H3>
          <P>
            <B>Double-click</B> một nút, hoặc gõ tên vào ô <B>Find a node</B> ở góc phải, để chỉ xem nút đó và các nút nối trực tiếp với nó.
            Các nút liên quan được xếp thành vòng quanh nút đang chọn và chỉ còn các cạnh của nút đó, nên dù đồ thị có hàng trăm nút vẫn đọc
            được. Bấm <B>Show all</B> trên thanh “Focused on” hoặc <K>Esc</K> để quay lại; vị trí các nút trở về như cũ.
          </P>
          <Shot name="graph-focus" alt="Chế độ tập trung: một resource ở giữa, các nút liên quan xếp vòng quanh" />
          <P>
            Tab <B>Data</B> của khung Graph vẽ người dùng, tài nguyên (mỗi loại một màu) và tenant, cùng các cạnh gán role, quan hệ và tài
            nguyên thuộc tenant nào.
          </P>
          <Shot name="graph-data" alt="Đồ thị dữ liệu khi di chuột vào một người dùng" />
        </Section>
      </Part>
      <Part n={4} id="phan-4" title="Kiểm tra quyền">
        <Section id="check" title="Kiểm tra quyền (Check)">
          <P>
            Tab <B>Check</B> trả lời câu hỏi “<B>User</B> có được làm <B>Action</B> trên <B>Resource</B> không?”. Kết quả tính lại ngay khi
            bạn đổi câu hỏi hoặc sửa policy.
          </P>
          <Bullets>
            <li>
              <B>Resource</B> viết dạng <C>loại:khoá</C> (ví dụ <C>document:rfc-042</C>) để hỏi về một tài nguyên cụ thể, hoặc chỉ ghi loại
              (<C>document</C>) để hỏi chung theo role cấp tenant.
            </li>
            <li>
              <B>Tenant</B> để trống thì lấy tenant của tài nguyên; tài nguyên không ghi tenant thì dùng <C>default</C>.
            </li>
            <li>
              <B>Context attributes</B> cho phép thử nhanh một thuộc tính mà không sửa file, ví dụ{" "}
              <C>{'{ "user": { "on_shift": true } }'}</C>.
            </li>
          </Bullets>
          <P>
            Khi được phép, mục <B>Granted by</B> liệt kê mọi con đường dẫn tới quyền đó, từng bước một. Ví dụ dưới đây: alice là chủ thư mục
            gốc, quyền chủ đi xuống qua từng thư mục con rồi tới tài liệu.
          </P>
          <Shot name="check-allowed" alt="Kết quả Allowed kèm chuỗi lý do" />
          <P>
            Khi bị từ chối, mục <B>Why not</B> cho biết từng mô hình đã kiểm tra những gì. Với quy tắc ABAC, bảng nhỏ bên dưới so sánh từng
            điều kiện với giá trị thực tế (✓ đạt, ✗ không đạt).
          </P>
          <Shot name="check-denied" alt="Kết quả Denied kèm phần Why not" />
          <Callout>
            Bấm <B>Save as test</B> để lưu câu hỏi đang xem thành một ca kiểm thử, với kết quả hiện tại làm kết quả mong đợi.
          </Callout>
        </Section>
        <Section id="tests" title="Ca kiểm thử (Tests)">
          <P>
            Mỗi dòng <C>assert</C> trong file là một ca kiểm thử. Tab <B>Tests</B> chạy lại toàn bộ sau mỗi lần sửa, nên bạn biết ngay một
            thay đổi có làm hỏng kỳ vọng nào không.
          </P>
          <Shot name="tests" alt="Tab Tests với danh sách ca kiểm thử" />
          <Bullets>
            <li>
              Dấu <span className="text-allow">✓</span> là đạt; dấu <span className="text-deny">✗</span> là trượt, kèm kết quả thực tế (
              <C>got allow</C> hoặc <C>got deny</C>).
            </li>
            <li>Nhãn RBAC / ReBAC / ABAC cho biết mô hình nào đã cấp quyền.</li>
            <li>Bấm vào một ca để mở nó trong Check và xem lý do chi tiết.</li>
            <li>
              Khi có trên 20 ca, đầu danh sách xuất hiện ô lọc theo user, action hoặc resource, và nút <B>Failing</B> để chỉ xem các ca đang
              trượt.
            </li>
            <li>
              Điền form ở đầu tab rồi bấm <B>Add</B> (hoặc <K>⌘</K> <K>Enter</K>) để thêm ca mới. Di chuột vào một ca và bấm biểu tượng
              thùng rác để xoá.
            </li>
          </Bullets>
        </Section>
        <Section id="user-matrix" title="Ma trận quyền theo người dùng">
          <P>
            Tab <B>Matrix</B> trong bảng công cụ cho thấy <B>một người dùng</B> được làm gì trên <B>mọi tài nguyên</B>. Chọn người dùng ở ô
            User.
          </P>
          <Shot name="user-matrix" alt="Ma trận quyền của một người dùng" />
          <Bullets>
            <li>
              Mỗi chấm màu là một mô hình đã cấp quyền: xanh dương là RBAC, vàng là ReBAC, xanh ngọc là ABAC. Dấu – là không có quyền.
            </li>
            <li>Bấm vào một ô để mở câu hỏi đó trong Check.</li>
          </Bullets>
          <Callout tone="note">
            Đừng nhầm với chế độ <B>Matrix</B> của khung Policy: chế độ đó dùng để <B>sửa</B> policy, còn tab này dùng để <B>xem</B> kết quả
            cho một người.
          </Callout>
        </Section>
        <Section id="cach-tinh" title="Cách playground quyết định">
          <P>
            Một câu hỏi <C>user, action, loại:khoá</C> được <span className="text-allow">phép</span> nếu <B>ít nhất một</B> trong ba điều
            sau đúng:
          </P>
          <Steps>
            <Step>
              <KindBadge kind="rbac" /> Người dùng có một <B>role cấp tenant</B> trong tenant của tài nguyên, và role đó có quyền{" "}
              <C>loại:action</C> hoặc <C>loại:*</C>. Role cấp tenant không kế thừa nhau.
            </Step>
            <Step>
              <KindBadge kind="rebac" /> Người dùng có một <B>role trên chính tài nguyên đó</B>, được gán trực tiếp hoặc suy ra qua quan hệ
              (<C>derive</C>, có thể qua nhiều tầng), và role đó (hoặc role nó <C>extends</C>) cho phép action.
            </Step>
            <Step>
              <KindBadge kind="abac" /> Người dùng thuộc một <B>user set</B>, tài nguyên thuộc một <B>resource set</B> (hoặc quy tắc áp cho
              cả loại resource), và có quy tắc <C>permit</C> cấp action đó.
            </Step>
          </Steps>
          <Callout tone="note">
            Playground là công cụ để <B>mô hình hoá và thử nghiệm</B>. Kết quả dùng để đánh giá thiết kế, không thay thế cho hệ thống phân
            quyền chạy thật.
          </Callout>
        </Section>
      </Part>
      <Part n={5} id="phan-5" title="Lưu và chia sẻ">
        <Section id="luu-chia-se" title="Lưu, nhập, xuất, chia sẻ">
          <Bullets>
            <li>
              <B>Tự động lưu.</B> Playground lưu file đang mở trong trình duyệt của bạn. Mở lại trang, bạn tiếp tục từ chỗ cũ.
            </li>
            <li>
              <B>Import.</B> Bấm <B>Import</B> hoặc kéo-thả file <C>.dsl</C> / <C>.json</C> vào bất kỳ đâu trên trang.
            </li>
            <li>
              <B>Export.</B> Tải file về dưới dạng DSL hoặc JSON (playground tự chuyển định dạng nếu cần), hoặc sao chép nội dung editor.
            </li>
            <li>
              <B>Share.</B> Sao chép một đường link chứa toàn bộ file (đã nén). Người nhận mở link là thấy đúng file của bạn. Không có gì
              được lưu lên máy chủ.
            </li>
            <li>
              <B>Giao diện.</B> Nút mặt trời / mặt trăng ở góc phải header chuyển giữa giao diện tối và sáng.
            </li>
          </Bullets>
          <Shot name="export-menu" alt="Menu Export" width="half" />
        </Section>
      </Part>
      <Part n={6} id="phan-6" title="Tham khảo">
        <Section id="policy-lon" title="Làm việc với policy lớn">
          <P>
            Playground xử lý tốt các policy cỡ hàng trăm role và hàng nghìn ca kiểm thử: kiểm tra quyền, chạy test và vẽ đồ thị đều cập nhật
            ngay khi gõ. Vài cách giúp mô hình lớn dễ nhìn hơn:
          </P>
          <Bullets>
            <li>
              <B>Collapse roles</B> trong Legend của đồ thị Policy gộp các resource role vào resource của chúng, và gộp các cạnh derivation
              giữa hai resource thành một. Công tắc tự bật khi mô hình có trên 40 resource role; danh sách role của một resource hiện khi di
              chuột vào nó.
            </li>
            <li>
              <B>Tập trung</B> vào một nút (double-click hoặc <B>Find a node</B>) để xem riêng phần liên quan tới nó.
            </li>
            <li>
              <B>Ẩn bớt</B> các loại nút hoặc cạnh không cần bằng cách bấm vào mục tương ứng trong Legend, ví dụ ẩn “Role grants actions”
              khi đang xem quan hệ giữa các resource.
            </li>
            <li>
              Để xem toàn cảnh role nào được làm gì trên resource nào, <B>Matrix → Overview</B> trong khung Policy thường dễ đọc hơn đồ thị.
            </li>
            <li>
              Trong tab <B>Tests</B>, dùng ô lọc và nút <B>Failing</B> để chỉ xem các ca cần chú ý.
            </li>
          </Bullets>
          <Callout tone="note">
            Bản chạy trên máy cho lập trình viên (<C>npm run dev</C>) chậm hơn rõ rệt so với bản phát hành, nhất là khi kéo nút trên đồ thị
            lớn. Hãy đánh giá tốc độ trên bản phát hành (trang GitHub Pages).
          </Callout>
        </Section>
        <Section id="phim-tat" title="Phím tắt">
          <Table
            head={["Phím", "Tác dụng"]}
            rows={[
              [
                <>
                  <K>⌘</K> <K>Enter</K>
                </>,
                "Bấm Add trong form đang nhập (Data, Tests). Trên Windows/Linux dùng Ctrl.",
              ],
              [
                <>
                  <K>Ctrl</K> <K>Space</K>
                </>,
                "Mở gợi ý trong editor.",
              ],
              [
                <>
                  <K>⌘</K> <K>F</K>
                </>,
                "Tìm kiếm và thay thế trong editor.",
              ],
              [
                <>
                  <K>⌘</K> <K>Z</K> / <K>⌘</K> <K>⇧</K> <K>Z</K>
                </>,
                "Hoàn tác / làm lại khi đang gõ trong editor.",
              ],
              [<K key="k">Esc</K>, "Thoát chế độ tập trung trên đồ thị (khi con trỏ không ở trong editor)."],
              [<K key="k">↑</K>, "Chọn gợi ý phía trên trong ô có danh sách gợi ý; ↓ để xuống, Enter để chọn, Esc để đóng."],
            ]}
          />
        </Section>
        <Section id="hoi-dap" title="Hỏi đáp">
          <H3>Vì sao nút Undo trong tab Data bị mờ?</H3>
          <P>
            Nút này chỉ hoàn tác các thay đổi làm từ bảng công cụ và Matrix. Nếu sau đó bạn gõ thêm vào editor, nút sẽ tắt để không ghi đè
            phần vừa gõ. Khi đó hãy dùng <K>⌘</K> <K>Z</K> ngay trong editor.
          </P>
          <H3>Vì sao Matrix không cho tick?</H3>
          <P>File đang có lỗi cú pháp. Chuyển sang Text, sửa lỗi (xem tab Problems), rồi quay lại Matrix.</P>
          <H3>Làm sao bắt đầu từ đầu?</H3>
          <P>
            Chọn store <B>Blank</B> trong menu Store. Store này chỉ có một resource và hai role để bạn sửa tiếp.
          </P>
          <H3>Dữ liệu của tôi có bị gửi đi đâu không?</H3>
          <P>
            Không. Policy chỉ nằm trong trình duyệt của bạn. Chỉ khi bạn tự gửi link Share cho người khác thì họ mới thấy được nội dung.
          </P>
        </Section>
      </Part>
    </>
  )
}

/* ---------------------------------------------------------------------- page */

export function DocsPage() {
  const scroller = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<string>(TOC[0][0])

  // highlight the section being read
  useEffect(() => {
    const root = scroller.current
    if (!root) return
    const sections = [...root.querySelectorAll<HTMLElement>("[data-doc-section]")]
    const onScroll = () => {
      // a section counts as being read once its title reaches the upper third, below any part heading
      const top = root.getBoundingClientRect().top + root.clientHeight * 0.35
      let current: string | undefined = sections[0]?.id
      for (const s of sections) if (s.getBoundingClientRect().top <= top) current = s.id
      if (root.scrollTop + root.clientHeight >= root.scrollHeight - 4) current = sections.at(-1)?.id
      if (current) setActive(current)
    }
    onScroll()
    root.addEventListener("scroll", onScroll, { passive: true })
    return () => root.removeEventListener("scroll", onScroll)
  }, [])

  const go = (id: string) => scroller.current?.querySelector(`#${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })

  return (
    <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-6xl gap-12 px-8 py-10">
        <nav aria-label="Mục lục" className="sticky top-10 hidden h-fit w-56 shrink-0 lg:block">
          <div className="mb-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Mục lục</div>
          <ol className="space-y-4">
            {PARTS.map((part, i) => (
              <li key={part.title}>
                <div className="mb-1 text-[12px] font-semibold text-foreground/90">
                  <span className="mr-1.5 text-brand">{i + 1}</span>
                  {part.title}
                </div>
                <ul className="border-l">
                  {part.sections.map(([id, label]) => (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => go(id)}
                        className={cn(
                          "-ml-px block w-full border-l-2 py-1 pl-3 text-left text-[13px] transition-colors",
                          active === id
                            ? "border-brand font-medium text-foreground"
                            : "border-transparent text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {label}
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </nav>
        <article className="min-w-0 max-w-3xl flex-1 pb-24 text-[14.5px]">
          <Content />
        </article>
      </div>
    </div>
  )
}
