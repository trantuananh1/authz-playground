import { describe, expect, it } from "vitest"
import { placeTooltip, type PlacementInput } from "../tooltip-placement"

const base: PlacementInput = {
  anchor: { x: 400, y: 300, r: 20 },
  size: { w: 200, h: 100 },
  bounds: { w: 800, h: 600 },
  nodes: [],
  labels: [],
  edges: [],
  chrome: [],
}

const box = (p: { x: number; y: number }) => ({ x: p.x, y: p.y, w: 200, h: 100 })
const hits = (b: { x: number; y: number; w: number; h: number }, c: { x: number; y: number; r: number }) =>
  c.x + c.r > b.x && c.x - c.r < b.x + b.w && c.y + c.r > b.y && c.y - c.r < b.y + b.h

describe("placeTooltip", () => {
  it("never covers the hovered node and stays inside the canvas", () => {
    const p = placeTooltip(base)
    expect(hits(box(p), { ...base.anchor, r: base.anchor.r + 6 })).toBe(false)
    expect(p.x).toBeGreaterThanOrEqual(8)
    expect(p.y + 100).toBeLessThanOrEqual(592)
  })

  it("moves to the empty side when neighbours crowd the other sides", () => {
    // nodes to the right, above and below; only the left is free
    const nodes = [
      { x: 520, y: 300, r: 20 },
      { x: 600, y: 260, r: 20 },
      { x: 600, y: 340, r: 20 },
      { x: 400, y: 180, r: 20 },
      { x: 400, y: 420, r: 20 },
      { x: 300, y: 160, r: 20 },
      { x: 300, y: 440, r: 20 },
      { x: 500, y: 160, r: 20 },
      { x: 500, y: 440, r: 20 },
    ]
    const p = placeTooltip({ ...base, nodes })
    for (const n of nodes) expect(hits(box(p), n)).toBe(false)
    expect(p.x + 200).toBeLessThanOrEqual(400)
  })

  it("keeps clear of the legend", () => {
    const legend = { x: 0, y: 0, w: 150, h: 250 }
    const p = placeTooltip({ ...base, anchor: { x: 120, y: 120, r: 20 }, chrome: [legend] })
    const b = box(p)
    const overlapW = Math.min(b.x + b.w, legend.w) - Math.max(b.x, 0)
    const overlapH = Math.min(b.y + b.h, legend.h) - Math.max(b.y, 0)
    expect(overlapW > 0 && overlapH > 0).toBe(false)
  })
})
