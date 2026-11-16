export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface Circle {
  x: number
  y: number
  r: number
}

export interface Segment {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface PlacementInput {
  /** the hovered node, in container pixels */
  anchor: Circle
  size: { w: number; h: number }
  bounds: { w: number; h: number }
  /** other nodes, with their name labels when shown */
  nodes: Circle[]
  labels: Rect[]
  edges: Segment[]
  /** fixed UI on top of the canvas: legend, zoom controls */
  chrome: Rect[]
}

const MARGIN = 8
const DIRECTIONS = Array.from({ length: 16 }, (_, i) => (i * Math.PI) / 8)

function overlap(a: Rect, b: Rect) {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  return w > 0 && h > 0 ? w * h : 0
}

const circleRect = (c: Circle, pad = 0): Rect => ({ x: c.x - c.r - pad, y: c.y - c.r - pad, w: (c.r + pad) * 2, h: (c.r + pad) * 2 })

const inside = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h

/** Share of an edge's length that runs under the rectangle, sampled. */
function edgeCover(r: Rect, s: Segment) {
  let hits = 0
  const N = 12
  for (let i = 1; i < N; i++) {
    const t = i / N
    if (inside(r, s.x1 + (s.x2 - s.x1) * t, s.y1 + (s.y2 - s.y1) * t)) hits++
  }
  return hits / (N - 1)
}

/**
 * Picks the tooltip position around a node that covers the least of the graph:
 * other circles and their names weigh most, then the legend and controls, then
 * edges; among equals, the spot closest to the node wins.
 */
export function placeTooltip({ anchor, size, bounds, nodes, labels, edges, chrome }: PlacementInput): { x: number; y: number } {
  const gap = anchor.r + 10
  let best = { x: 0, y: 0, score: Infinity }

  for (const dist of [gap, gap + 36, gap + 90, gap + 170]) {
    for (const a of DIRECTIONS) {
      const dx = Math.cos(a)
      const dy = Math.sin(a)
      // push the box out along the direction until its nearest side sits at `dist`
      const half = Math.abs(dx) * (size.w / 2) + Math.abs(dy) * (size.h / 2)
      const cx = anchor.x + dx * (dist + half)
      const cy = anchor.y + dy * (dist + half)
      let x = cx - size.w / 2
      let y = cy - size.h / 2
      const rawX = x
      const rawY = y
      x = Math.min(Math.max(x, MARGIN), bounds.w - size.w - MARGIN)
      y = Math.min(Math.max(y, MARGIN), bounds.h - size.h - MARGIN)
      const box = { x, y, w: size.w, h: size.h }

      // never sit on the hovered node itself
      if (overlap(box, circleRect(anchor, 6)) > 0) continue

      let score = 0
      for (const n of nodes) score += overlap(box, circleRect(n, 4)) * 4
      for (const l of labels) score += overlap(box, l) * 3
      for (const c of chrome) score += overlap(box, c) * 5
      for (const s of edges) score += edgeCover(box, s) * 600
      score += Math.hypot(x - rawX, y - rawY) * 2 // clamped against a wall
      score += dist * 1.5
      if (score < best.score) best = { x, y, score }
    }
  }
  if (best.score === Infinity) return { x: MARGIN, y: MARGIN }
  return { x: best.x, y: best.y }
}
