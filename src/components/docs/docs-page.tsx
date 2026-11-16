import { ArrowRight, Info, Lightbulb, TriangleAlert } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { KindBadge } from "@/components/common"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useStore } from "@/store"

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

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} data-doc-section className="scroll-mt-6 border-t pt-10 pb-4 first:border-t-0 first:pt-0">
      <h2 className="mb-4 text-[22px] font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  )
}

const H3 = ({ children }: { children: React.ReactNode }) => <h3 className="mt-7 mb-2 text-[15.5px] font-semibold">{children}</h3>
const P = ({ children }: { children: React.ReactNode }) => <p className="my-3 leading-7 text-foreground/85">{children}</p>
const C = ({ children }: { children: React.ReactNode }) => (
  <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[12.5px] text-foreground">{children}</code>
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

const TOC = [
  ["gioi-thieu", "Giới thiệu"],
  ["man-hinh", "Các khu vực trên màn hình"],
  ["mo-hinh", "Ba mô hình phân quyền"],
  ["bat-dau", "Bắt đầu nhanh"],
  ["viet-policy", "Viết policy (Text)"],
  ["dsl-json", "DSL và JSON"],
  ["matrix-editor", "Sửa policy bằng Matrix"],
  ["check", "Kiểm tra quyền (Check)"],
  ["tests", "Ca kiểm thử (Tests)"],
  ["data", "Dữ liệu (Data)"],
  ["user-matrix", "Ma trận quyền theo người dùng"],
  ["do-thi", "Đồ thị"],
  ["luu-chia-se", "Lưu, nhập, xuất, chia sẻ"],
  ["cach-tinh", "Cách playground quyết định"],
  ["phim-tat", "Phím tắt"],
  ["hoi-dap", "Hỏi đáp"],
] as const

function Content() {
  const setPage = useStore((s) => s.setPage)
  return (
    <>
      <Section id="gioi-thieu" title="Hướng dẫn sử dụng vAuthz">
        <P>
          Playground giúp bạn <B>thiết kế và thử nghiệm mô hình phân quyền</B> theo cách của Permit.io ngay trong trình duyệt. Bạn viết
          policy dưới dạng DSL hoặc JSON, xem mô hình dưới dạng đồ thị, hỏi “người dùng này có được làm việc này không, và vì sao”, rồi lưu
          các câu hỏi đó thành ca kiểm thử ngay trong file.
        </P>
        <P>
          Mọi tính toán diễn ra trên máy bạn. Playground <B>không gửi dữ liệu lên Permit.io</B> hay bất kỳ máy chủ nào.
        </P>
        <button
          type="button"
          onClick={() => setPage("playground")}
          className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[13px] font-medium text-primary-foreground transition-transform hover:-translate-y-px active:translate-y-0"
        >
          Mở playground <ArrowRight className="size-3.5" />
        </button>
      </Section>

      <Section id="man-hinh" title="Các khu vực trên màn hình">
        <P>Màn hình chia thành bốn khu vực, đánh số trong ảnh dưới đây.</P>
        <Shot name="overview" alt="Toàn cảnh playground với bốn khu vực được đánh số" />
        <Steps>
          <Step>
            <B>Thanh trên cùng (header).</B> Logo, nút chuyển giữa <B>Playground</B> và <B>Docs</B>, menu chọn <B>Store</B> mẫu, tên file
            đang mở, nút đổi định dạng <B>DSL / JSON</B>, <B>Import</B>, <B>Export</B>, <B>Share</B> và nút đổi giao diện sáng/tối.
          </Step>
          <Step>
            <B>Policy.</B> Nội dung file policy. Xem dạng <B>Text</B> (soạn thảo như code) hoặc <B>Matrix</B> (bảng tick quyền). Góc phải
            cho biết policy hợp lệ (<span className="text-allow">Valid</span>) hay đang có lỗi.
          </Step>
          <Step>
            <B>Bảng công cụ.</B> Các tab <B>Check</B>, <B>Tests</B>, <B>Data</B>, <B>Matrix</B>, <B>Problems</B>, <B>Syntax</B>. Con số cạnh
            tên tab cho biết số lượng: Tests màu xanh là tất cả đều đạt, màu đỏ là số ca đang trượt.
          </Step>
          <Step>
            <B>Đồ thị.</B> Hai tab <B>Chính sách</B> (mô hình) và <B>Dữ liệu</B> (người dùng, tài nguyên và quan hệ giữa chúng).
          </Step>
        </Steps>
        <P>
          Thanh dưới cùng đếm số tenant, resource, role, condition set, user và relationship trong file. Bạn có thể kéo đường phân cách giữa
          các khu vực để đổi kích thước.
        </P>
      </Section>

      <Section id="mo-hinh" title="Ba mô hình phân quyền">
        <P>Playground hỗ trợ cả ba mô hình mà Permit.io dùng, và bạn có thể kết hợp chúng trong cùng một file.</P>
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
            Ở tab <B>Check</B>, chọn <B>User</B>, <B>Action</B> và <B>Resource</B>. Kết quả <span className="text-allow">Allowed</span> hoặc{" "}
            <span className="text-deny">Denied</span> hiện ngay, kèm lý do.
          </Step>
          <Step>Sửa thử policy, ví dụ bỏ một quyền khỏi một role. Kết quả Check, Tests và đồ thị cập nhật ngay khi bạn gõ.</Step>
          <Step>
            Bấm <B>Share</B> để sao chép đường link chứa toàn bộ file, gửi cho đồng nghiệp xem đúng trạng thái bạn đang có.
          </Step>
        </Steps>
      </Section>

      <Section id="viet-policy" title="Viết policy (Text)">
        <P>
          Chế độ <B>Text</B> là một trình soạn thảo code: có tô màu cú pháp, gợi ý từ khoá và tên đã khai báo (gõ vài chữ hoặc bấm{" "}
          <K>Ctrl</K> <K>Space</K>), gập/mở khối, và tìm kiếm/thay thế bằng <K>⌘</K> <K>F</K>.
        </P>
        <Shot name="editor-text" alt="Trình soạn thảo policy ở chế độ Text" />
        <H3>Một file gồm ba phần</H3>
        <P>Bạn có thể viết các phần theo bất kỳ thứ tự nào, nhưng nên giữ thứ tự này cho dễ đọc.</P>
        <Code>{`
// 1. Mô hình (schema)
tenant acme "Acme Corp"

resource document {
  actions read, edit, delete
  attributes { owner_id: string }
  relations { parent: folder }

  role viewer: read
  role editor extends viewer: edit
  derive editor from folder#editor via parent
}

role admin: document:*                      // role cấp tenant
userset pros where user.plan == "pro"       // nhóm người dùng theo thuộc tính
resourceset mine on document where resource.owner_id == user.key
permit pros to mine: read, edit             // quy tắc ABAC

// 2. Dữ liệu
user anne "anne@acme.example" { plan: "pro" }
instance document:d1 @acme { owner_id: "anne" }
assign anne admin @acme                     // role trong tenant
assign bob editor on document:d1            // role trên một tài nguyên
relate folder:f1 parent document:d1         // folder:f1 là cha của document:d1

// 3. Ca kiểm thử
assert anne can edit document:d1
assert bob cannot delete document:d1
`}</Code>
        <P>
          Tab <B>Syntax</B> trong bảng công cụ liệt kê đầy đủ từng cú pháp, cả dạng DSL lẫn JSON, để bạn tra nhanh khi đang viết.
        </P>
        <Shot name="syntax" alt="Tab Syntax liệt kê cú pháp DSL và JSON" />
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
            <B>Top-level role không được kế thừa nhau.</B> <C>role editor extends viewer</C> chỉ hợp lệ bên trong một <C>resource</C>. Ở cấp
            tenant, hãy liệt kê đủ quyền cho từng role.
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

      <Section id="dsl-json" title="DSL và JSON">
        <P>
          Cùng một policy có thể viết bằng <B>DSL</B> (file <C>.dsl</C>, gọn, dễ đọc, có chú thích) hoặc <B>JSON</B> (file <C>.json</C>,
          theo đúng cấu trúc đối tượng của Permit.io API, tiện cho máy xử lý).
        </P>
        <Bullets>
          <li>
            Bấm <B>DSL</B> hoặc <B>JSON</B> trên header để chuyển đổi nội dung editor sang định dạng kia. Không mất dữ liệu nào.
          </li>
          <li>
            JSON không có chú thích, nên các dòng <C>//</C> sẽ mất khi chuyển từ DSL sang JSON. Playground có báo trước khi việc này xảy ra.
          </li>
          <li>
            Khi mở file, playground tự nhận định dạng theo đuôi file (<C>.dsl</C>, <C>.txt</C> là DSL; <C>.json</C> là JSON) hoặc theo nội
            dung.
          </li>
        </Bullets>
      </Section>

      <Section id="matrix-editor" title="Sửa policy bằng Matrix">
        <P>
          Bấm <B>Matrix</B> ở góc trái khung Policy để sửa quyền bằng cách tick vào ô, giống trang Policy Editor của Permit.io. Mỗi lần
          tick, playground viết lại đúng dòng <C>role …</C> hoặc <C>permit …</C> tương ứng trong file. Chú thích và phần còn lại của file
          được giữ nguyên.
        </P>
        <H3>Hai kiểu xem</H3>
        <P>
          <B>By resource</B>: mỗi resource một bảng. Hàng là action, cột là role, chia ba nhóm màu: Top-level roles, Resource roles và User
          sets.
        </P>
        <Shot name="matrix-resource" alt="Matrix theo từng resource" />
        <P>
          <B>Overview</B>: gộp mọi resource vào một ma trận duy nhất. Tiêu đề cột và cột action được giữ cố định khi cuộn. Ô thuộc role của
          resource khác được để trống.
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
                Được cấp qua ký tự đại diện (<C>*</C> hoặc <C>document:*</C>). Bỏ tick sẽ thay ký tự đại diện bằng danh sách các action còn
                lại.
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

      <Section id="check" title="Kiểm tra quyền (Check)">
        <P>
          Tab <B>Check</B> trả lời câu hỏi “<B>User</B> có được làm <B>Action</B> trên <B>Resource</B> không?”. Kết quả tính lại ngay khi
          bạn đổi câu hỏi hoặc sửa policy.
        </P>
        <Bullets>
          <li>
            <B>Resource</B> viết dạng <C>loại:khoá</C> (ví dụ <C>document:rfc-042</C>) để hỏi về một tài nguyên cụ thể, hoặc chỉ ghi loại (
            <C>document</C>) để hỏi chung theo role cấp tenant.
          </li>
          <li>
            <B>Tenant</B> để trống thì lấy tenant của tài nguyên; tài nguyên không ghi tenant thì dùng <C>default</C>.
          </li>
          <li>
            <B>Context attributes</B> cho phép thử nhanh một thuộc tính mà không sửa file, ví dụ <C>{'{ "user": { "on_shift": true } }'}</C>
            .
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
            Điền form ở đầu tab rồi bấm <B>Add</B> (hoặc <K>⌘</K> <K>Enter</K>) để thêm ca mới. Di chuột vào một ca và bấm biểu tượng thùng
            rác để xoá.
          </li>
        </Bullets>
      </Section>

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
            Trong <B>Role assignments</B>, chọn một tenant để gán role cấp tenant (RBAC), hoặc chọn một tài nguyên như <C>folder:root</C> để
            gán role trên tài nguyên đó (ReBAC).
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

      <Section id="user-matrix" title="Ma trận quyền theo người dùng">
        <P>
          Tab <B>Matrix</B> trong bảng công cụ cho thấy <B>một người dùng</B> được làm gì trên <B>mọi tài nguyên</B>. Chọn người dùng ở ô
          User.
        </P>
        <Shot name="user-matrix" alt="Ma trận quyền của một người dùng" />
        <Bullets>
          <li>Mỗi chấm màu là một mô hình đã cấp quyền: xanh dương là RBAC, vàng là ReBAC, xanh ngọc là ABAC. Dấu – là không có quyền.</li>
          <li>Bấm vào một ô để mở câu hỏi đó trong Check.</li>
        </Bullets>
        <Callout tone="note">
          Đừng nhầm với chế độ <B>Matrix</B> của khung Policy: chế độ đó dùng để <B>sửa</B> policy, còn tab này dùng để <B>xem</B> kết quả
          cho một người.
        </Callout>
      </Section>

      <Section id="do-thi" title="Đồ thị">
        <P>
          Tab <B>Chính sách</B> vẽ mô hình: resource (tròn lớn), role của resource (tròn nhỏ quanh nó), role cấp tenant, user set và
          resource set. Các cạnh thể hiện relation, role derivation, quyền của role và quy tắc ABAC. Bảng <B>Legend</B> ở góc trái giải
          thích từng biểu tượng và từng kiểu nét.
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
        </Bullets>
        <P>
          Tab <B>Dữ liệu</B> vẽ người dùng, tài nguyên (mỗi loại một màu) và tenant, cùng các cạnh gán role, quan hệ và tài nguyên thuộc
          tenant nào.
        </P>
        <Shot name="graph-data" alt="Đồ thị dữ liệu khi di chuột vào một người dùng" />
      </Section>

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
            <B>Share.</B> Sao chép một đường link chứa toàn bộ file (đã nén). Người nhận mở link là thấy đúng file của bạn. Không có gì được
            lưu lên máy chủ.
          </li>
          <li>
            <B>Giao diện.</B> Nút mặt trời / mặt trăng ở góc phải header chuyển giữa giao diện tối và sáng.
          </li>
        </Bullets>
        <Shot name="export-menu" alt="Menu Export" width="half" />
      </Section>

      <Section id="cach-tinh" title="Cách playground quyết định">
        <P>
          Một câu hỏi <C>user, action, loại:khoá</C> được <span className="text-allow">phép</span> nếu <B>ít nhất một</B> trong ba điều sau
          đúng:
        </P>
        <Steps>
          <Step>
            <KindBadge kind="rbac" /> Người dùng có một <B>role cấp tenant</B> trong tenant của tài nguyên, và role đó có quyền{" "}
            <C>loại:action</C> hoặc <C>loại:*</C>. Role cấp tenant không kế thừa nhau.
          </Step>
          <Step>
            <KindBadge kind="rebac" /> Người dùng có một <B>role trên chính tài nguyên đó</B>, được gán trực tiếp hoặc suy ra qua quan hệ (
            <C>derive</C>, có thể qua nhiều tầng), và role đó (hoặc role nó <C>extends</C>) cho phép action.
          </Step>
          <Step>
            <KindBadge kind="abac" /> Người dùng thuộc một <B>user set</B>, tài nguyên thuộc một <B>resource set</B> (hoặc quy tắc áp cho cả
            loại resource), và có quy tắc <C>permit</C> cấp action đó.
          </Step>
        </Steps>
        <Callout tone="note">
          Playground là công cụ để <B>mô hình hoá và thử nghiệm</B>. Nó tuân theo các khái niệm của Permit.io nhưng không phải bản sao chính
          xác của PDP (bộ quyết định quyền) chạy trên Permit.io.
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
        <P>Không. Policy chỉ nằm trong trình duyệt của bạn. Chỉ khi bạn tự gửi link Share cho người khác thì họ mới thấy được nội dung.</P>
      </Section>
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
      const top = root.getBoundingClientRect().top + 80
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
          <ul className="space-y-0.5 border-l">
            {TOC.map(([id, label]) => (
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
        </nav>
        <article className="min-w-0 max-w-3xl flex-1 pb-24 text-[14.5px]">
          <Content />
        </article>
      </div>
    </div>
  )
}
