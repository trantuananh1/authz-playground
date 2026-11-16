// Outlines the header's groups and numbers them underneath, for the guide.
(() => {
  document.querySelectorAll(".doc-anno").forEach((e) => e.remove())
  const rectOf = (els) => {
    const rs = els.map((e) => e.getBoundingClientRect())
    const x = Math.min(...rs.map((r) => r.left)), y = Math.min(...rs.map((r) => r.top))
    return { x, y, w: Math.max(...rs.map((r) => r.right)) - x, h: Math.max(...rs.map((r) => r.bottom)) - y }
  }
  const header = document.querySelector("header")
  // a plain strip under the header, so the numbers do not sit on the panels below
  const hb = header.getBoundingClientRect()
  const strip = document.createElement("div")
  strip.className = "doc-anno"
  Object.assign(strip.style, { position: "fixed", left: "0", top: hb.bottom + "px", width: "100vw", height: "48px", background: "var(--background)", zIndex: 9998 })
  document.body.appendChild(strip)
  const logo = header.firstElementChild
  const groups = [
    ["1", [logo, header.querySelector("nav")]],
    ["2", [header.querySelector('[aria-label="Policy source"]')]],
    ["3", [header.querySelector('[aria-label="Policy format"]')]],
    ["4", [header.querySelector('[aria-label="Policy output"]')]],
    ["5", [header.querySelector('[aria-label="Toggle colour theme"]')]],
  ]
  for (const [n, els] of groups) {
    const r = rectOf(els.filter(Boolean))
    const box = document.createElement("div")
    box.className = "doc-anno"
    Object.assign(box.style, { position: "fixed", left: r.x - 4 + "px", top: r.y - 4 + "px", width: r.w + 8 + "px", height: r.h + 8 + "px", border: "2px solid #f0a640", borderRadius: "7px", zIndex: 9999, pointerEvents: "none" })
    const badge = document.createElement("div")
    badge.textContent = n
    Object.assign(badge.style, { position: "absolute", left: "50%", top: "calc(100% + 6px)", transform: "translateX(-50%)", width: "22px", height: "22px", borderRadius: "999px", background: "#f0a640", color: "#2a1d0c", font: "700 12px/22px Geist Variable, sans-serif", textAlign: "center" })
    box.appendChild(badge)
    document.body.appendChild(box)
  }
  return 1
})()
