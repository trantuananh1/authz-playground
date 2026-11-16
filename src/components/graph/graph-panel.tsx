import { useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useStore, type GraphTab } from "@/store"
import { dataGraph, policyGraph, typeColor } from "./build"
import { GraphCanvas, type EdgeLegendItem, type LegendItem } from "./graph-canvas"

const POLICY_LEGEND: LegendItem[] = [
  { kind: "resource", color: "var(--rebac)" },
  { kind: "resource-role", color: "var(--rebac)" },
  { kind: "role", color: "var(--rbac)" },
  { kind: "userset", color: "var(--abac)" },
  { kind: "resourceset", color: "var(--abac)" },
]

const POLICY_EDGES: EdgeLegendItem[] = [
  { label: "Relation", color: "var(--muted-foreground)" },
  { label: "Role derivation", color: "var(--rebac)", dashed: true },
  { label: "Role grants actions", color: "var(--rbac)" },
  { label: "ABAC rule", color: "var(--abac)" },
  { label: "Resource set filters", color: "var(--abac)", dashed: true },
]

const DATA_EDGES: EdgeLegendItem[] = [
  { label: "Role on instance", color: "var(--rebac)" },
  { label: "Role in tenant", color: "var(--rbac)" },
  { label: "Relationship", color: "var(--foreground)" },
  { label: "Belongs to tenant", color: "var(--muted-foreground)", dashed: true },
]

function PolicyGraph() {
  const schema = useStore((s) => s.file.schema)
  const graph = useMemo(() => policyGraph(schema), [schema])
  return <GraphCanvas graph={graph} legend={POLICY_LEGEND} edgeLegend={POLICY_EDGES} empty="Declare a resource to see the policy graph" />
}

function DataGraph() {
  const file = useStore((s) => s.file)
  const graph = useMemo(() => dataGraph(file), [file])
  const legend = useMemo<LegendItem[]>(() => {
    const types = [...new Set(graph.nodes.filter((n) => n.kind === "instance").map((n) => n.title.split(":")[0]))]
    return [
      { kind: "user", color: "var(--rbac)" },
      { kind: "tenant", color: "var(--muted-foreground)" },
      ...types.map((t): LegendItem => ({ kind: "instance", color: typeColor(file.schema, t), label: t })),
    ]
  }, [graph, file.schema])
  return (
    <GraphCanvas
      graph={graph}
      legend={legend}
      edgeLegend={DATA_EDGES}
      empty="Add users, instances or relationships to see the data graph"
    />
  )
}

export function GraphPanel() {
  const tab = useStore((s) => s.graphTab)
  const setTab = useStore((s) => s.setGraphTab)
  const schema = useStore((s) => s.file.schema)
  const data = useStore((s) => s.file.data)
  const policyCount = schema.resources.length + schema.roles.length + schema.condition_sets.length
  const dataCount = data.users.length + data.resource_instances.length
  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as GraphTab)} className="h-full gap-0 bg-background" data-tour="graph">
      <TabsList variant="line" className="h-10 w-full shrink-0 justify-start gap-4 rounded-none border-b bg-panel px-4">
        <TabsTrigger value="policy" className="flex-none px-0 text-[12.5px]">
          Chính sách <span className="font-mono text-[11px] text-muted-foreground">{policyCount}</span>
        </TabsTrigger>
        <TabsTrigger value="data" className="flex-none px-0 text-[12.5px]">
          Dữ liệu <span className="font-mono text-[11px] text-muted-foreground">{dataCount}</span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="policy" className="min-h-0 flex-1">
        <PolicyGraph />
      </TabsContent>
      <TabsContent value="data" className="min-h-0 flex-1">
        <DataGraph />
      </TabsContent>
    </Tabs>
  )
}
