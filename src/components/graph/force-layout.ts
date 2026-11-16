import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum } from "d3-force"

export interface LayoutNode {
  id: string
  r: number
}

export interface LayoutLink {
  source: string
  target: string
  /** preferred length; short for a role hanging off its resource */
  distance?: number
  /** 0..1; satellites (a role on its resource) hold tight, cross links stay loose */
  strength?: number
}

type SimNode = SimulationNodeDatum & LayoutNode
export type Positions = Map<string, { x: number; y: number }>

/**
 * Runs a force simulation to rest and returns node centres. Nodes that were placed
 * before keep their position as a starting point, so an edit nudges the graph
 * instead of reshuffling it.
 */
export function forceLayout(nodes: LayoutNode[], links: LayoutLink[], previous: Positions): Positions {
  const sim: SimNode[] = nodes.map((n) => ({ ...n, ...previous.get(n.id) }))
  const known = sim.filter((n) => n.x !== undefined).length
  const fresh = known < sim.length * 0.6

  // place a new node next to something it links to
  const byId = new Map(sim.map((n) => [n.id, n]))
  for (const n of sim) {
    if (n.x !== undefined) continue
    const anchor = links
      .map((l) => (l.source === n.id ? byId.get(l.target) : l.target === n.id ? byId.get(l.source) : undefined))
      .find((m) => m?.x !== undefined)
    if (anchor && !fresh) {
      n.x = anchor.x! + 40
      n.y = anchor.y! + 40
    }
  }

  const simulation = forceSimulation(sim)
    .force(
      "link",
      forceLink<SimNode, LayoutLink & { source: string | SimNode; target: string | SimNode }>(links.map((l) => ({ ...l })))
        .id((d) => d.id)
        .distance((l) => l.distance ?? 110)
        .strength((l) => l.strength ?? 0.35),
    )
    .force(
      "charge",
      forceManyBody<SimNode>().strength((d) => -120 - d.r * 14),
    )
    .force(
      "collide",
      forceCollide<SimNode>((d) => d.r + 22),
    )
    .force("x", forceX(0).strength(0.05))
    .force("y", forceY(0).strength(0.07))
    .alpha(fresh ? 1 : 0.25)
    .stop()

  const ticks = fresh ? 320 : 120
  for (let i = 0; i < ticks; i++) simulation.tick()

  return new Map(sim.map((n) => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }]))
}
