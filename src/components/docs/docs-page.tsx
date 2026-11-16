import { ArrowRight, Download, Info, Lightbulb, TriangleAlert } from "lucide-react"
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
    title: "Thiết kế với AI Skill",
    sections: [
      ["ai-tong-quan", "Tổng quan và tải về"],
      ["ai-cai-dat", "Cài đặt"],
      ["ai-quy-trinh", "Quy trình 6 bước"],
      ["ai-playground", "Thử thiết kế trên playground"],
      ["ai-tham-khao", "Bảng lệnh và xử lý sự cố"],
    ],
  },
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
        Từ những bước đầu tiên tới cú pháp đầy đủ và thiết kế bằng AI, chia thành bảy phần theo thứ tự bạn làm việc.
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
          <P>
            Mọi hệ thống phân quyền đều trả lời một câu hỏi: <B>Ai được làm gì với cái gì?</B> Ví dụ: “Anh Bình có được <B>sửa</B>{" "}
            <B>bản kế hoạch quý 3</B> không?”. Ba mô hình dưới đây là ba cách khác nhau để trả lời câu hỏi đó.
          </P>

          <H3>Các khái niệm cơ bản</H3>
          <Table
            head={["Thuật ngữ", "Nghĩa là", "Ví dụ"]}
            rows={[
              [<B key="t">Người dùng (user)</B>, "Người cần được cấp hoặc từ chối quyền.", "anh Bình, chị Mai"],
              [<B key="t">Tài nguyên (resource)</B>, "Loại thứ cần bảo vệ.", "tài liệu, thư mục, hoá đơn"],
              [<B key="t">Bản ghi (instance)</B>, "Một tài nguyên cụ thể.", "bản kế hoạch quý 3, thư mục “Kế toán”"],
              [<B key="t">Hành động (action)</B>, "Việc có thể làm với tài nguyên.", "xem, sửa, xoá, chia sẻ"],
              [<B key="t">Vai trò (role)</B>, "Một nhóm quyền đặt tên, gán cho người dùng.", "Quản trị, Người chỉnh sửa, Người xem"],
              [<B key="t">Tenant</B>, "Một tổ chức hoặc đơn vị độc lập, dữ liệu tách biệt với nhau.", "công ty Acme, công ty Globex"],
              [
                <B key="t">Thuộc tính (attribute)</B>,
                "Đặc điểm của người dùng hoặc tài nguyên.",
                "phòng ban, cấp bậc, trạng thái “đã khoá”",
              ],
            ]}
          />

          <H3>
            <KindBadge kind="rbac" className="mr-2 align-middle" /> RBAC: phân quyền theo vai trò
          </H3>
          <P>
            Giống <B>chức danh trong công ty</B>. Chức danh “Kế toán” được xem và sửa hoá đơn; ai được giao chức danh này thì có các quyền
            đó. Khi một người chuyển công việc, bạn chỉ cần đổi chức danh của họ, không phải sửa từng quyền.
          </P>
          <Code>{`role ke_toan "Kế toán": invoice:read, invoice:edit
assign binh ke_toan @acme`}</Code>
          <P>
            <B>Đọc là:</B> vai trò Kế toán được xem và sửa hoá đơn; anh Bình là Kế toán ở công ty Acme. Vì vai trò gắn với tenant, anh Bình
            chỉ có quyền trên hoá đơn <B>của Acme</B>; ở công ty khác anh có thể giữ vai trò khác hoặc không có vai trò nào.
          </P>
          <Bullets>
            <li>
              <B>Ưu điểm:</B> đơn giản, dễ giải thích, dễ quản lý khi tổ chức có ít vai trò rõ ràng.
            </li>
            <li>
              <B>Hạn chế:</B> không phân biệt từng bản ghi. Kế toán xem được <B>mọi</B> hoá đơn của công ty, không thể nói “chỉ hoá đơn do
              mình phụ trách”.
            </li>
            <li>
              <B>Phù hợp khi:</B> quyền phụ thuộc vào công việc của người đó, không phụ thuộc vào bản ghi cụ thể.
            </li>
          </Bullets>

          <H3>
            <KindBadge kind="rebac" className="mr-2 align-middle" /> ReBAC: phân quyền theo mối quan hệ
          </H3>
          <P>
            Giống cách <B>Google Drive</B> hoạt động. Khi bạn chia sẻ một thư mục cho đồng nghiệp với quyền “Người chỉnh sửa”, họ chỉnh sửa
            được <B>mọi tài liệu bên trong</B> thư mục đó, kể cả tài liệu tạo sau này. Quyền đi theo mối quan hệ: tài liệu <B>nằm trong</B>{" "}
            thư mục, thư mục <B>nằm trong</B> thư mục cha. Ví dụ khác: trưởng phòng xem được hồ sơ của mọi nhân viên <B>thuộc</B> phòng
            mình.
          </P>
          <Code>{`resource document {
  actions read, edit
  relations { parent: folder }          // tài liệu nằm trong một thư mục
  role editor: read, edit
  derive editor from folder#editor via parent
}
assign mai editor on folder:ke_hoach   // chị Mai chỉnh sửa thư mục "Kế hoạch"
relate folder:ke_hoach parent document:q3`}</Code>
          <P>
            <B>Đọc là:</B> ai là người chỉnh sửa của thư mục chứa tài liệu thì cũng là người chỉnh sửa của tài liệu. Chị Mai chỉnh sửa thư
            mục “Kế hoạch”, bản kế hoạch quý 3 nằm trong thư mục đó, nên chị Mai sửa được bản kế hoạch quý 3. Không ai phải cấp quyền riêng
            cho từng tài liệu.
          </P>
          <Bullets>
            <li>
              <B>Ưu điểm:</B> phân quyền tới <B>từng bản ghi</B>, và quyền tự động lan theo cấu trúc (thư mục, phòng ban, dự án).
            </li>
            <li>
              <B>Hạn chế:</B> phải khai báo các mối quan hệ; khi chuỗi quan hệ dài sẽ khó hình dung vì sao một người có quyền. Đồ thị và
              phần “Granted by” trong tab Check giúp bạn nhìn thấy chuỗi đó.
            </li>
            <li>
              <B>Phù hợp khi:</B> dữ liệu có cấu trúc cây hoặc thuộc về ai đó: thư mục và tài liệu, đơn vị và cấp trên, dự án và thành viên.
            </li>
          </Bullets>

          <H3>
            <KindBadge kind="abac" className="mr-2 align-middle" /> ABAC: phân quyền theo thuộc tính
          </H3>
          <P>
            Giống <B>nội quy có điều kiện</B>: “Bác sĩ chỉ xem hồ sơ bệnh nhân <B>cùng khoa</B> và <B>khi đang trực</B>”, “Tài liệu gắn nhãn{" "}
            <B>công khai</B> thì ai cũng đọc được”, “Bạn sửa được bài viết <B>của chính mình</B> khi bài <B>chưa bị khoá</B>”. Quyền không
            gắn với chức danh hay quan hệ, mà với <B>đặc điểm</B> của người và của tài liệu tại thời điểm hỏi.
          </P>
          <Code>{`userset bac_si_truc where user.title == "doctor" and user.on_shift == true
resourceset cung_khoa on record where resource.department == user.department
permit bac_si_truc to cung_khoa: read`}</Code>
          <P>
            <B>Đọc là:</B> nhóm “bác sĩ đang trực” gồm những người có chức danh bác sĩ và đang trong ca trực; nhóm “hồ sơ cùng khoa” gồm hồ
            sơ thuộc đúng khoa của người hỏi; nhóm thứ nhất được xem nhóm thứ hai. Khi bác sĩ hết ca, quyền tự mất mà không ai phải thu hồi.
          </P>
          <Bullets>
            <li>
              <B>Ưu điểm:</B> rất linh hoạt, diễn đạt được các quy tắc theo ngữ cảnh (thời gian, trạng thái, phòng ban, cấp độ bảo mật).
            </li>
            <li>
              <B>Hạn chế:</B> quy tắc phức tạp dễ sai mà khó nhận ra. Hãy viết ca kiểm thử (tab Tests) cho các tình huống quan trọng.
            </li>
            <li>
              <B>Phù hợp khi:</B> quyền phụ thuộc vào tình huống hoặc vào nội dung của bản ghi, không chỉ vào người.
            </li>
          </Bullets>

          <H3>So sánh nhanh</H3>
          <Table
            head={["", "RBAC", "ReBAC", "ABAC"]}
            rows={[
              ["Câu hỏi đặt ra", "Bạn giữ vai trò gì?", "Bạn có quan hệ gì với thứ này?", "Bạn và thứ này có đặc điểm gì?"],
              ["Ví dụ đời thường", "Chức danh trong công ty", "Chia sẻ thư mục trên Google Drive", "Nội quy có điều kiện"],
              ["Mức chi tiết", "Theo loại tài nguyên", "Tới từng bản ghi", "Tới từng bản ghi, theo ngữ cảnh"],
              ["Cần chuẩn bị", "Danh sách vai trò", "Các mối quan hệ giữa dữ liệu", "Thuộc tính của người và dữ liệu"],
              ["Dễ hiểu", "Dễ nhất", "Trung bình", "Cần cẩn thận"],
            ]}
          />

          <H3>Kết hợp cả ba</H3>
          <P>
            Trong cùng một file, bạn có thể dùng cả ba mô hình. Một yêu cầu được <B>cho phép</B> nếu <B>ít nhất một</B> mô hình cho phép;
            chỉ khi cả ba đều không cho phép thì mới bị từ chối. Trong store mẫu <B>Drive</B>:
          </P>
          <Bullets>
            <li>
              <KindBadge kind="rebac" /> Alice xoá được tài liệu rfc-042 vì chị là chủ thư mục gốc, và quyền chủ đi xuống qua từng thư mục
              con.
            </li>
            <li>
              <KindBadge kind="rbac" /> Dave đọc được mọi tài liệu của Acme vì anh có vai trò Kiểm toán (auditor) trong tenant Acme.
            </li>
            <li>
              <KindBadge kind="abac" /> Cindy sửa được rfc-042 dù chỉ là người xem thư mục, vì chị là tác giả và tài liệu chưa bị khoá.
            </li>
          </Bullets>
          <Callout>
            <B>Nên bắt đầu từ đâu?</B> Hầu hết hệ thống bắt đầu bằng <B>RBAC</B>. Thêm <B>ReBAC</B> khi cần quyền theo từng thư mục, dự án
            hay đơn vị. Thêm <B>ABAC</B> cho những quy tắc có điều kiện đặc biệt. Màu xanh dương, vàng và xanh ngọc của ba nhãn trên được
            dùng nhất quán trong toàn bộ playground: trên đồ thị, trong Matrix và trong phần giải thích của Check.
          </Callout>
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
      <Part n={6} id="phan-6" title="Thiết kế với AI Skill">
        <Section id="ai-tong-quan" title="Tổng quan và tải về">
          <P>
            Bộ <B>AI Skill phân quyền</B> giúp BA đi từ <B>tài liệu nghiệp vụ</B> (Word, PDF, Excel, sơ đồ drawio) tới một{" "}
            <B>chính sách phân quyền chạy thử được ngay trên playground này</B>. BA chỉ cần gõ lệnh, trả lời câu hỏi nghiệp vụ và bấm Đúng /
            Sai; không cần biết RBAC, ReBAC hay ABAC.
          </P>
          <a
            href={`${import.meta.env.BASE_URL}downloads/ai-skill-phan-quyen.zip`}
            download
            className="my-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-[13.5px] font-medium text-primary-foreground transition-transform hover:-translate-y-px active:translate-y-0"
          >
            <Download className="size-4" /> Tải bộ AI Skill (.zip, 120 KB)
          </a>
          <P>Bộ công cụ gồm hai skill, chạy trong ứng dụng Claude (thẻ Code) hoặc Claude Code:</P>
          <Table
            head={["Lệnh", "Việc làm"]}
            rows={[
              [
                <C key="c">/thiet-ke-phan-quyen</C>,
                "Đọc tài liệu; đề xuất vai trò, dữ liệu, quyền và phạm vi; tự áp quy định chung (duyệt thì được xem, cấp trên xem cấp dưới, người lập không tự duyệt…); tự kiểm tra nguyên tắc; xuất tệp import và tệp chạy thử trên playground.",
              ],
              [
                <C key="c">/truc-quan-phan-quyen</C>,
                "Mở giao diện rà soát trên máy: BA đọc từng câu theo vai trò, bấm Đúng / Sai, trả lời câu hỏi và xuất biên bản.",
              ],
            ]}
          />
          <P>Mỗi quyền trong thiết kế mang một nhãn nguồn gốc, để BA biết chỗ nào lấy từ tài liệu và chỗ nào do AI suy ra:</P>
          <Table
            head={["Nhãn", "Ý nghĩa"]}
            rows={[
              ["Theo tài liệu", "Tài liệu nêu, AI giữ nguyên."],
              [
                "Theo quy định chung",
                "Suy ra từ bộ quy định kế thừa đã duyệt; chỉ là quyền xem hoặc ràng buộc, không bao giờ là quyền ghi.",
              ],
              ["AI đề xuất thêm", "Tài liệu không nêu; AI thêm theo nguyên tắc, kèm lý do."],
              ["AI đề xuất bỏ", "Tài liệu nêu nhưng trái nguyên tắc (ví dụ một người vừa lập vừa duyệt); AI đề nghị bỏ, kèm lý do."],
            ]}
          />
        </Section>

        <Section id="ai-cai-dat" title="Cài đặt">
          <P>Làm một lần trên mỗi máy:</P>
          <Steps>
            <Step>Cài ứng dụng Claude trên máy tính (dùng thẻ Code) hoặc Claude Code.</Step>
            <Step>
              Cài <B>Python 3.10</B> trở lên. Trên Windows, đánh dấu ô <B>Add Python to PATH</B> khi cài.
            </Step>
            <Step>
              Giải nén tệp vừa tải vào thư mục skill: Windows <C>{"C:\\Users\\<tên đăng nhập>\\.claude\\skills\\"}</C>, macOS / Linux{" "}
              <C>~/.claude/skills/</C>. Sau khi giải nén phải có đúng hai thư mục <C>thiet-ke-phan-quyen</C> và <C>truc-quan-phan-quyen</C>{" "}
              nằm ngay trong <C>skills</C>.
            </Step>
            <Step>
              Mở lại ứng dụng Claude và gõ <C>/</C> trong ô chat. Danh sách gợi ý có <C>thiet-ke-phan-quyen</C> và{" "}
              <C>truc-quan-phan-quyen</C> là đã cài xong.
            </Step>
          </Steps>
        </Section>

        <Section id="ai-quy-trinh" title="Quy trình 6 bước">
          <Steps>
            <Step>
              <B>Đặt tài liệu vào một thư mục.</B> Tạo một thư mục cho phân hệ và chép tài liệu vào: quy trình, SRS, khảo sát (<C>.docx</C>,{" "}
              <C>.pdf</C>, <C>.md</C>); bảng chức năng / usecase có cột tác nhân; ma trận phân quyền Excel (dòng chức năng, cột vai trò; nếu
              có, AI còn đo độ khớp giữa thiết kế và ma trận); sơ đồ quy trình <C>.drawio</C> có làn. Trong ứng dụng Claude, mở phiên mới và
              chọn thư mục này làm thư mục làm việc.
            </Step>
            <Step>
              <B>Gõ lệnh thiết kế.</B> Chỉ cần <C>/thiet-ke-phan-quyen</C>; có nhiều tài liệu thì AI hỏi chọn, hoặc gõ tên tệp sau lệnh. AI
              làm liền một mạch: lập danh sách giao dịch “ai – làm gì”, hỏi các điểm nghiệp vụ, lập thiết kế và tự kiểm tra nguyên tắc, mở
              giao diện rà soát, xuất tệp import và tệp playground. Kết quả nằm trong thư mục <C>{"thiet_ke_<tên tài liệu>"}</C> cạnh tài
              liệu.
            </Step>
            <Step>
              <B>Trả lời câu hỏi nghiệp vụ.</B> AI hỏi những điểm tài liệu chưa nói rõ (ai duyệt ở cấp đơn vị, thông tin nhạy cảm cho ai
              xem…). Mỗi câu có sẵn lựa chọn, phương án khuyến nghị đứng đầu; chọn <B>Other</B> để tự gõ. Một câu trả lời thường thay đổi
              nhiều quyền cùng lúc.
            </Step>
            <Step>
              <B>Rà soát trên giao diện</B> (tự mở, dạng <C>http://localhost:4190/</C>; mở lại bằng <C>/truc-quan-phan-quyen</C>). Ghi tên
              người rà soát; trả lời các câu còn mở ở thẻ <B>Câu hỏi cho BA</B>; ở thẻ <B>Theo vai trò</B>, đọc từng câu và bấm <B>Đúng</B>{" "}
              hoặc <B>Sai</B> (bấm <B>Vì sao?</B> để xem căn cứ); tải biên bản ở thẻ <B>Biên bản</B>.
            </Step>
            <Step>
              <B>Cập nhật thiết kế</B> bằng <C>/thiet-ke-phan-quyen cap-nhat</C>. AI đọc ý kiến rà soát, sửa thiết kế và xuất lại các tệp.
              Lặp bước 4 và 5 tới khi mọi câu đã được xác nhận.
            </Step>
            <Step>
              <B>Thử trên playground</B> (mục tiếp theo).
            </Step>
          </Steps>
          <Table
            head={["Bấm", "Trên câu có nhãn", "Kết quả khi cập nhật"]}
            rows={[
              ["Đúng", "bất kỳ", "Giữ nguyên."],
              ["Sai", "AI đề xuất thêm", "Quyền bị bỏ."],
              ["Sai", "AI đề xuất bỏ", "Giữ lại quyền tài liệu nêu."],
              ["Sai", "Theo tài liệu / theo quy định chung", "AI đọc lại tài liệu và ghi chú để sửa thiết kế."],
            ]}
          />
        </Section>

        <Section id="ai-playground" title="Thử thiết kế trên playground">
          <Bullets>
            <li>
              <B>Chọn tệp:</B> nên dùng <C>{"playground_theo_mang/<mảng>.dsl"}</C> (mỗi tệp một mảng nghiệp vụ, 10–40 KB). Tệp{" "}
              <C>playground.dsl</C> chứa toàn bộ phân hệ; với phân hệ lớn, bật Collapse roles và dùng chế độ tập trung trên đồ thị (xem “Làm
              việc với policy lớn”). Muốn chỉ xem vài loại dữ liệu: <C>{"/thiet-ke-phan-quyen dsl <key>,<key>"}</C>.
            </li>
            <li>
              <B>Nạp tệp:</B> bấm <B>Import</B> trên header và chọn tệp <C>.dsl</C>, hoặc kéo-thả tệp vào trang. Nếu ứng dụng Claude có
              trình duyệt tích hợp, <C>/thiet-ke-phan-quyen playground</C> sẽ tự nạp.
            </li>
            <li>
              <B>Đọc kết quả:</B> <span className="text-allow">Valid</span> là tệp đúng cú pháp; tab <B>Tests</B> báo “x of y tests pass”,
              đạt hết nghĩa là chính sách đúng ý đồ thiết kế; tab <B>Check</B> để tự hỏi một câu (tenant <C>mac_dinh</C>); <B>Graph</B> và{" "}
              <B>Policy › Matrix</B> để xem tổng thể. Cảnh báo “Resource 'don_vi' has no actions” là bình thường: cây đơn vị chỉ dùng để
              tính phạm vi.
            </li>
          </Bullets>
          <Table
            head={["Trên màn hình", "Nghĩa trong thiết kế của skill"]}
            rows={[
              ["Resource", "Loại dữ liệu, ví dụ truong_mam_non."],
              ["Resource role", "Vai trò gắn với một đơn vị hoặc bản ghi, có phạm vi (ví dụ trợ lý CTQC ở đơn vị A)."],
              ["Top-level role", "Vai trò toàn hệ thống; đuôi __quyen_chung là quyền không theo bản ghi (thêm mới, nhập, xuất)."],
              ["Relation, Role derivation", "Quan hệ giữa dữ liệu (cap_tren, thuoc_don_vi…) và quyền lan theo quan hệ đó."],
              ["User set, Resource set, ABAC rule", "Quyền theo điều kiện, ví dụ người lập xem được bản ghi do mình lập."],
              ["can / cannot", "Được / không được."],
            ]}
          />
          <Callout tone="note">
            Dữ liệu trên playground là <B>dữ liệu mẫu</B> do AI dựng để thử (đơn vị A, B, trường mầm non 1, 2…). Các ràng buộc như chỉ duyệt
            khi đang chờ duyệt, người lập không tự duyệt, bản ghi đã khoá không sửa được nằm trong thiết kế và tệp import; trên playground
            chúng chỉ được liệt kê ở chú thích cuối tệp.
          </Callout>
        </Section>

        <Section id="ai-tham-khao" title="Bảng lệnh và xử lý sự cố">
          <Table
            head={["Gõ", "Khi nào"]}
            rows={[
              [
                <C key="c">/thiet-ke-phan-quyen</C>,
                "Bắt đầu thiết kế từ tài liệu trong thư mục; nếu đã có thiết kế, AI hỏi cập nhật hay làm mới.",
              ],
              [<C key="c">{"/thiet-ke-phan-quyen <tệp> …"}</C>, "Thiết kế mới từ đúng các tệp chỉ định."],
              [<C key="c">/thiet-ke-phan-quyen cap-nhat</C>, "Sau mỗi lượt rà soát trên giao diện."],
              [<C key="c">{"/thiet-ke-phan-quyen dsl <key>,<key>"}</C>, "Xuất tệp playground chỉ gồm vài loại dữ liệu."],
              [<C key="c">{"/thiet-ke-phan-quyen playground [<tệp>]"}</C>, "Nạp một tệp lên playground (cần trình duyệt tích hợp)."],
              [<C key="c">/truc-quan-phan-quyen</C>, "Mở lại giao diện rà soát."],
            ]}
          />
          <Table
            head={["Hiện tượng", "Cách xử lý"]}
            rows={[
              [
                "Gõ / không thấy lệnh",
                "Kiểm tra hai thư mục skill nằm ngay trong .claude/skills (không lồng thêm một cấp), rồi mở lại ứng dụng.",
              ],
              ["Báo không tìm thấy Python", "Cài Python 3.10+ (Windows: đánh dấu Add Python to PATH), mở lại ứng dụng."],
              ["Giao diện rà soát không mở", "Gõ /truc-quan-phan-quyen; AI tự chọn cổng trống và đưa địa chỉ mới."],
              [
                "Playground rối, chậm",
                "Nạp tệp theo mảng, hoặc dùng lệnh dsl với vài loại dữ liệu; bật Collapse roles và chế độ tập trung.",
              ],
              ["Một số câu kiểm thử không đạt", "Chụp màn hình tab Tests và gửi vào cửa sổ Claude để AI sửa bước xuất."],
            ]}
          />
        </Section>
      </Part>
      <Part n={7} id="phan-7" title="Tham khảo">
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
