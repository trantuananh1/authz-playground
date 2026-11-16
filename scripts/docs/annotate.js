(() => {
  document.querySelectorAll(".doc-anno").forEach((e) => e.remove())
  const areas = [
    ["header", "1"],
    ["[data-tour=editor]", "2"],
    ["[data-tour=panels]", "3"],
    ["[data-tour=graph]", "4"],
  ]
  for (const [sel, n] of areas) {
    const r = document.querySelector(sel).getBoundingClientRect()
    const box = document.createElement("div")
    box.className = "doc-anno"
    Object.assign(box.style, { position: "fixed", left: r.left + 3 + "px", top: r.top + 3 + "px", width: r.width - 6 + "px", height: r.height - 6 + "px", border: "2px solid #f0a640", borderRadius: "6px", zIndex: 9999, pointerEvents: "none" })
    const badge = document.createElement("div")
    badge.textContent = n
    // header: the empty middle; editor: bottom-right, away from the status; others: top-right
    const place =
      sel === "header"
        ? { left: "56%", top: "50%", transform: "translateY(-50%)" }
        : sel === "[data-tour=editor]"
          ? { right: "14px", bottom: "12px" }
          : { right: "10px", top: "8px" }
    Object.assign(badge.style, { position: "absolute", ...place, width: "26px", height: "26px", borderRadius: "999px", background: "#f0a640", color: "#2a1d0c", font: "700 14px/26px Geist Variable, sans-serif", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,.4)" })
    box.appendChild(badge)
    document.body.appendChild(box)
  }
  return 1
})()
