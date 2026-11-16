import {
  Background,
  BackgroundVariant,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useInternalNode,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  useViewport,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react"
import "@xyflow/react/dist/base.css"
import { Box, Boxes, Building2, ChevronDown, Eye, EyeOff, Filter, KeyRound, Shield, ShieldCheck, User, UsersRound } from "lucide-react"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { useStore } from "@/store"
import { KIND_LABEL, type GEdge, type GNode, type Graph, type NodeKind } from "./build"
import { forceLayout, type Positions } from "./force-layout"
import { placeTooltip, type Rect } from "./tooltip-placement"

/* ------------------------------------------------------------------ nodes */

const ICONS: Record<NodeKind, typeof Box> = {
  resource: Boxes,
  "resource-role": Shield,
  role: KeyRound,
  userset: UsersRound,
  resourceset: Filter,
  user: User,
  instance: Box,
  tenant: Building2,
}

interface CircleData extends Record<string, unknown> {
  g: GNode
  hovered: boolean
  dim: boolean
  showLabel: boolean
}
type CircleNode = Node<CircleData, "circle">

const Tooltip = ({ g, style, ref }: { g: GNode; style: React.CSSProperties; ref?: React.Ref<HTMLDivElement> }) => {
  return (
    <div
      ref={ref}
      role="tooltip"
      style={style}
      className="pointer-events-none absolute z-50 w-max max-w-80 rounded-md border bg-popover px-3 py-2 text-popover-foreground shadow-lg"
    >
      <div className="flex items-center gap-2">
        <span className="size-2 shrink-0 rounded-full" style={{ background: g.color }} />
        <span className="font-mono text-[12.5px] font-semibold">{g.title}</span>
      </div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">
        {KIND_LABEL[g.kind]}
        {g.subtitle !== KIND_LABEL[g.kind] && ` · ${g.subtitle}`}
      </div>
      {g.rows.length > 0 && (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 border-t pt-2 font-mono text-[11px]">
          {g.rows.map(([k, v], i) => (
            <div key={i} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="break-words whitespace-pre-wrap">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}

function CircleNodeView({ data }: NodeProps<CircleNode>) {
  const { g, hovered, dim, showLabel } = data
  const Icon = ICONS[g.kind]
  const d = g.r * 2
  const dashed = g.kind === "resourceset" || g.kind === "tenant"
  return (
    <div className="relative" style={{ width: d, height: d }}>
      {/* edges are drawn centre to centre, so one hidden handle in the middle is enough */}
      <Handle type="source" position={Position.Top} className="!top-1/2 !left-1/2" />
      <Handle type="target" position={Position.Top} className="!top-1/2 !left-1/2" />
      <div
        className={cn(
          "grid size-full cursor-pointer place-items-center rounded-full border-2 transition-[opacity,transform,box-shadow] duration-150",
          hovered && "scale-110",
          dim && "opacity-25",
          dashed && "border-dashed",
        )}
        style={{
          borderColor: g.color,
          background: `color-mix(in oklch, ${g.color} ${g.kind === "resource-role" ? 12 : 20}%, var(--panel))`,
          color: g.color,
          boxShadow: hovered ? `0 0 0 6px color-mix(in oklch, ${g.color} 18%, transparent)` : undefined,
        }}
      >
        <Icon style={{ width: Math.max(11, g.r * 0.75), height: Math.max(11, g.r * 0.75) }} strokeWidth={2} />
      </div>
      {showLabel && !hovered && (
        <div
          className={cn(
            "pointer-events-none absolute top-full left-1/2 mt-1 -translate-x-1/2 rounded-sm bg-background/85 px-1 font-mono text-[10.5px] whitespace-nowrap text-muted-foreground",
            dim && "opacity-25",
          )}
        >
          {g.kind === "resource-role" ? g.title.split("#")[1] : g.title}
        </div>
      )}
    </div>
  )
}

/**
 * Detail card for the hovered node. It is measured first, then placed in the
 * emptiest spot around the node so it hides as little of the graph as possible.
 */
function SmartTooltip({
  hovered,
  nodes,
  edges,
  showLabels,
  box,
  legend,
}: {
  hovered: string
  nodes: CircleNode[]
  edges: GEdge[]
  showLabels: boolean
  box: React.RefObject<HTMLDivElement | null>
  legend: React.RefObject<HTMLDivElement | null>
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { x: vx, y: vy, zoom } = useViewport()
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const node = nodes.find((n) => n.id === hovered)

  useLayoutEffect(() => {
    const el = ref.current
    const container = box.current
    if (!el || !container || !node) return
    const bounds = container.getBoundingClientRect()
    const toScreen = (n: CircleNode) => ({
      x: (n.position.x + n.data.g.r) * zoom + vx,
      y: (n.position.y + n.data.g.r) * zoom + vy,
      r: n.data.g.r * zoom,
    })
    const centres = new Map(nodes.map((n) => [n.id, toScreen(n)]))
    const others = nodes.filter((n) => n.id !== hovered)
    const labels: Rect[] = showLabels
      ? others.map((n) => {
          const c = centres.get(n.id)!
          const text = n.data.g.kind === "resource-role" ? n.data.g.title.split("#")[1] : n.data.g.title
          const w = (text.length * 6.4 + 8) * zoom
          return { x: c.x - w / 2, y: c.y + c.r + 4 * zoom, w, h: 16 * zoom }
        })
      : []
    const rel = (r: DOMRect): Rect => ({ x: r.left - bounds.left, y: r.top - bounds.top, w: r.width, h: r.height })
    const chrome: Rect[] = []
    if (legend.current) chrome.push(rel(legend.current.getBoundingClientRect()))
    const controls = container.querySelector(".react-flow__controls")
    if (controls) chrome.push(rel(controls.getBoundingClientRect()))
    const segments = edges
      .filter((e) => e.source !== e.target && centres.has(e.source) && centres.has(e.target))
      .map((e) => {
        const a = centres.get(e.source)!
        const b = centres.get(e.target)!
        return { x1: a.x, y1: a.y, x2: b.x, y2: b.y }
      })
    setPos(
      placeTooltip({
        anchor: centres.get(hovered)!,
        size: { w: el.offsetWidth, h: el.offsetHeight },
        bounds: { w: bounds.width, h: bounds.height },
        nodes: others.map((n) => centres.get(n.id)!),
        labels,
        edges: segments,
        chrome,
      }),
    )
  }, [hovered, node, nodes, edges, showLabels, vx, vy, zoom, box, legend])

  if (!node) return null
  return <Tooltip ref={ref} g={node.data.g} style={pos ? { left: pos.x, top: pos.y } : { left: 0, top: 0, visibility: "hidden" }} />
}

/* ------------------------------------------------------------------ edges */

interface LineData extends Record<string, unknown> {
  e: GEdge
  /** index among edges joining the same two nodes, for spreading parallel edges */
  lane: number
  lanes: number
  showLabel: boolean
  dim: boolean
}
type LineEdge = Edge<LineData, "line">

function centre(n: ReturnType<typeof useInternalNode>) {
  const w = n?.measured.width ?? 0
  const h = n?.measured.height ?? 0
  const p = n?.internals.positionAbsolute ?? { x: 0, y: 0 }
  return { x: p.x + w / 2, y: p.y + h / 2, r: Math.min(w, h) / 2 }
}

function LineEdgeView({ id, source, target, data, markerEnd }: EdgeProps<LineEdge>) {
  const s = useInternalNode(source)
  const t = useInternalNode(target)
  if (!s || !t || !data) return null
  const a = centre(s)
  const b = centre(t)
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  // perpendicular offset so parallel edges do not overlap
  const bend = (data.lane - (data.lanes - 1) / 2) * 26
  const sx = a.x + ux * (a.r + 2)
  const sy = a.y + uy * (a.r + 2)
  const tx = b.x - ux * (b.r + 3)
  const ty = b.y - uy * (b.r + 3)
  const cx = (sx + tx) / 2 - uy * bend
  const cy = (sy + ty) / 2 + ux * bend
  const path = bend ? `M ${sx} ${sy} Q ${cx} ${cy} ${tx} ${ty}` : `M ${sx} ${sy} L ${tx} ${ty}`
  const lx = bend ? (sx + 2 * cx + tx) / 4 : cx
  const ly = bend ? (sy + 2 * cy + ty) / 4 : cy
  const { e } = data
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          stroke: e.color,
          strokeWidth: e.arrow ? 1.4 : 1,
          strokeDasharray: e.dashed ? "4 4" : undefined,
          opacity: data.dim ? 0.12 : e.arrow ? 0.85 : 0.5,
          transition: "opacity 150ms",
        }}
      />
      {e.label && data.showLabel && !data.dim && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none absolute rounded-sm border bg-panel px-1.5 py-px font-mono text-[10px] text-muted-foreground"
            style={{ transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)` }}
          >
            {e.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

const nodeTypes = { circle: CircleNodeView }
const edgeTypes = { line: LineEdgeView }

/* ------------------------------------------------------------- visibility */

/** A legend row that shows or hides its kind of node or edge. */
function LegendToggle({ off, name, onToggle, children }: { off: boolean; name: string; onToggle: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={!off}
      title={off ? `Show ${name}` : `Hide ${name}`}
      className={cn(
        "group/row -mx-1 flex items-center gap-1.5 rounded-sm px-1 py-px text-left text-[10.5px] leading-4 whitespace-nowrap transition-[opacity,background-color] hover:bg-accent",
        off && "opacity-40 [&_span:last-of-type]:line-through",
      )}
    >
      {children}
      {off ? (
        <EyeOff className="ml-auto size-3 shrink-0 text-muted-foreground" />
      ) : (
        <Eye className="ml-auto size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/row:opacity-100" />
      )}
    </button>
  )
}

/** Legend group of a node; instances are grouped per resource type. */
const nodeGroup = (g: GNode) => (g.kind === "instance" ? `instance:${g.title.split(":")[0]}` : g.kind)
const legendGroup = (l: LegendItem) => (l.kind === "instance" && l.label ? `instance:${l.label}` : l.kind)

/** Legend group of an edge, read from the id prefix build.ts gives each kind of edge. */
function edgeCategory(e: GEdge): string {
  const prefix = e.id.slice(0, e.id.indexOf(":"))
  if (prefix === "assign") return e.target.startsWith("tenant:") ? "assign-tenant" : "assign-instance"
  return (
    { rel: "relation", derive: "derivation", grant: "grant", rule: "rule", on: "filter", tuple: "tuple", in: "membership" }[prefix] ??
    prefix
  )
}

/** What each graph hides survives switching tabs. */
const hiddenByGraph = new Map<string, Set<string>>()

/* ----------------------------------------------------------------- canvas */

/** Keeps the fitted graph clear of the legend in the top-left corner. */
const FIT = { padding: { top: "40px", right: "40px", bottom: "40px", left: "176px" }, maxZoom: 1.2 } as const

export interface LegendItem {
  kind: NodeKind
  color: string
  label?: string
}

export interface EdgeLegendItem {
  /** matches edgeCategory() */
  category: string
  label: string
  color: string
  dashed?: boolean
}

interface CanvasProps {
  /** keys the remembered show/hide state */
  id: string
  graph: Graph
  legend: LegendItem[]
  edgeLegend: EdgeLegendItem[]
  empty: string
}

function Canvas({ id, graph, legend, edgeLegend, empty }: CanvasProps) {
  const theme = useStore((s) => s.theme)
  const flow = useReactFlow()
  const positions = useRef<Positions>(new Map())
  const [hovered, setHovered] = useState<string | null>(null)
  const [showLabels, setShowLabels] = useState(true)
  const [legendOpen, setLegendOpen] = useState(true)
  const [hidden, setHidden] = useState<Set<string>>(() => hiddenByGraph.get(id) ?? new Set())
  const toggleHidden = (key: string) =>
    setHidden((prev) => {
      const next = new Set(prev)
      if (!next.delete(key)) next.add(key)
      hiddenByGraph.set(id, next)
      return next
    })
  const showAll = () => {
    hiddenByGraph.set(id, new Set())
    setHidden(new Set())
  }
  const isNodeHidden = (g: GNode) => hidden.has(nodeGroup(g))
  // an edge disappears with its category or with either end
  const hiddenNodeIds = useMemo(() => new Set(graph.nodes.filter((g) => hidden.has(nodeGroup(g))).map((g) => g.id)), [graph.nodes, hidden])
  const visibleEdges = useMemo(
    () => graph.edges.filter((e) => !hidden.has(`edge:${edgeCategory(e)}`) && !hiddenNodeIds.has(e.source) && !hiddenNodeIds.has(e.target)),
    [graph.edges, hidden, hiddenNodeIds],
  )
  const legendRef = useRef<HTMLDivElement>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState<CircleNode>([])

  // lay out whenever the graph's shape changes, starting from the last positions
  const shape = graph.nodes.map((n) => n.id).join("|") + "#" + graph.edges.map((e) => `${e.source}>${e.target}`).join("|")
  const layoutKey = useRef("")
  const pendingFit = useRef(false)
  const initialized = useNodesInitialized()
  const box = useRef<HTMLDivElement>(null)
  const hasNodes = graph.nodes.length > 0

  // fit once the circles have been measured, and again whenever the panel is resized
  useEffect(() => {
    if (initialized && pendingFit.current) {
      pendingFit.current = false
      flow.fitView(FIT)
    }
  }, [initialized, flow, nodes])
  useEffect(() => {
    const el = box.current
    if (!el) return
    let raf = 0
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => flow.fitView(FIT))
    })
    ro.observe(el)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [flow, hasNodes])
  useEffect(() => {
    const next =
      layoutKey.current === shape
        ? positions.current
        : forceLayout(
            graph.nodes.map((n) => ({ id: n.id, r: n.r })),
            graph.edges
              .filter((e) => e.source !== e.target)
              .map((e) => ({ source: e.source, target: e.target, distance: e.distance, strength: e.strength })),
            positions.current,
          )
    const first = positions.current.size === 0
    // spread the first layout to the panel's proportions; circles keep their size
    if (first && box.current && next.size > 1) {
      const xs = [...next.values()].map((p) => p.x)
      const ys = [...next.values()].map((p) => p.y)
      const bw = Math.max(...xs) - Math.min(...xs) || 1
      const bh = Math.max(...ys) - Math.min(...ys) || 1
      const { width, height } = box.current.getBoundingClientRect()
      const k = Math.min(Math.max(Math.min((width * 0.7) / bw, (height * 0.7) / bh), 1), 2.2)
      for (const [id, p] of next) next.set(id, { x: p.x * k, y: p.y * k })
    }
    layoutKey.current = shape
    positions.current = next
    setNodes(
      graph.nodes.map((g) => {
        const p = next.get(g.id) ?? { x: 0, y: 0 }
        return {
          id: g.id,
          type: "circle",
          position: { x: p.x - g.r, y: p.y - g.r },
          data: { g, hovered: false, dim: false, showLabel: false },
        }
      }),
    )
    if (first) pendingFit.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph])

  const neighbours = useMemo(() => {
    if (!hovered) return null
    const set = new Set([hovered])
    for (const e of visibleEdges) {
      if (e.source === hovered) set.add(e.target)
      if (e.target === hovered) set.add(e.source)
    }
    return set
  }, [hovered, visibleEdges])

  const viewNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        hidden: isNodeHidden(n.data.g),
        zIndex: n.id === hovered ? 1000 : 1,
        data: { ...n.data, hovered: n.id === hovered, dim: !!neighbours && !neighbours.has(n.id), showLabel: showLabels },
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes, hovered, neighbours, showLabels, hidden],
  )

  const edges = useMemo<LineEdge[]>(() => {
    const pairCount = new Map<string, number>()
    const pairKey = (e: GEdge) => [e.source, e.target].sort().join("\u0000")
    for (const e of graph.edges) pairCount.set(pairKey(e), (pairCount.get(pairKey(e)) ?? 0) + 1)
    const seen = new Map<string, number>()
    return visibleEdges
      .filter((e) => e.source !== e.target)
      .map((e) => {
        const k = pairKey(e)
        const lane = seen.get(k) ?? 0
        seen.set(k, lane + 1)
        const touches = !!hovered && (e.source === hovered || e.target === hovered)
        return {
          id: e.id,
          type: "line",
          source: e.source,
          target: e.target,
          markerEnd: e.arrow ? { type: MarkerType.ArrowClosed, color: e.color, width: 14, height: 14 } : undefined,
          data: { e, lane, lanes: pairCount.get(k) ?? 1, showLabel: touches, dim: !!hovered && !touches },
        }
      })
  }, [graph.edges, visibleEdges, hovered])

  // keep dragged positions so the next layout starts from them
  const onNodeDragStop = (_: unknown, node: Node) => {
    const g = graph.nodes.find((n) => n.id === node.id)
    if (g) positions.current.set(node.id, { x: node.position.x + g.r, y: node.position.y + g.r })
  }

  const onNodeClick = (_: unknown, node: Node) => {
    const g = graph.nodes.find((n) => n.id === node.id)
    if (!g?.locate) return
    const s = useStore.getState()
    const span = s.compiled.locate(g.locate, g.jsonNeedle)
    if (span) s.focusRange(span.from, span.from)
  }

  if (!graph.nodes.length)
    return (
      <div className="grid h-full place-items-center text-[12.5px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4" /> {empty}
        </div>
      </div>
    )

  return (
    <div ref={box} className="relative h-full w-full">
      <ReactFlow
        nodes={viewNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeMouseEnter={(_, n) => setHovered(n.id)}
        onNodeMouseLeave={() => setHovered(null)}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        colorMode={theme}
        minZoom={0.2}
        maxZoom={2.5}
        nodesConnectable={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--border)" />
        <Controls showInteractive={false} position="bottom-right" fitViewOptions={FIT} />
      </ReactFlow>
      {hovered && !hiddenNodeIds.has(hovered) && (
        <SmartTooltip
          hovered={hovered}
          nodes={nodes.filter((n) => !hiddenNodeIds.has(n.id))}
          edges={visibleEdges}
          showLabels={showLabels}
          box={box}
          legend={legendRef}
        />
      )}

      <div
        ref={legendRef}
        className="absolute top-2 left-2 flex w-40 flex-col gap-1 rounded-md border bg-panel/90 px-2 py-1.5 backdrop-blur"
      >
        <button
          type="button"
          onClick={() => setLegendOpen((v) => !v)}
          aria-expanded={legendOpen}
          className="flex items-center gap-1 text-[9.5px] font-semibold tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          Legend
          <ChevronDown className={cn("ml-auto size-3 transition-transform", !legendOpen && "-rotate-90")} />
        </button>
        {legendOpen && (
          <>
            {legend.map((l) => {
              const Icon = ICONS[l.kind]
              const key = legendGroup(l)
              const off = hidden.has(key)
              const name = l.label ?? KIND_LABEL[l.kind]
              return (
                <LegendToggle key={key} off={off} name={name} onToggle={() => toggleHidden(key)}>
                  <span
                    className={cn(
                      "grid size-4 shrink-0 place-items-center rounded-full border",
                      (l.kind === "resourceset" || l.kind === "tenant") && "border-dashed",
                    )}
                    style={{ borderColor: l.color, color: l.color, background: `color-mix(in oklch, ${l.color} 20%, var(--panel))` }}
                  >
                    <Icon className="size-2.5" strokeWidth={2.2} />
                  </span>
                  <span className="text-foreground/80">{name}</span>
                </LegendToggle>
              )
            })}
            {edgeLegend.length > 0 && (
              <div className="mt-0.5 flex flex-col gap-0.5 border-t pt-1.5">
                {edgeLegend.map((e) => {
                  const key = `edge:${e.category}`
                  return (
                    <LegendToggle key={key} off={hidden.has(key)} name={e.label} onToggle={() => toggleHidden(key)}>
                      <svg width="16" height="8" className="shrink-0" aria-hidden>
                        <line
                          x1="1"
                          y1="4"
                          x2="11"
                          y2="4"
                          stroke={e.color}
                          strokeWidth="1.6"
                          strokeDasharray={e.dashed ? "3 2" : undefined}
                        />
                        <path d="M11 1.5 L15.5 4 L11 6.5 Z" fill={e.color} />
                      </svg>
                      <span className="text-muted-foreground">{e.label}</span>
                    </LegendToggle>
                  )
                })}
              </div>
            )}
            {hidden.size > 0 && (
              <button
                type="button"
                onClick={showAll}
                className="mt-0.5 flex items-center gap-1 border-t pt-1.5 text-left text-[10.5px] text-brand transition-opacity hover:opacity-80"
              >
                <Eye className="size-3" /> Show all ({hidden.size} hidden)
              </button>
            )}
            <label className="mt-0.5 flex cursor-pointer items-center gap-1 border-t pt-1.5 text-[10.5px] text-muted-foreground">
              <Switch checked={showLabels} onCheckedChange={setShowLabels} className="origin-left scale-[0.6]" />
              Show names
            </label>
          </>
        )}
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 text-[11px] text-muted-foreground/80">
        Hover a node for its details · click to open its definition · drag to rearrange
      </div>
    </div>
  )
}

export function GraphCanvas(props: CanvasProps) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  )
}
