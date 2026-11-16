import { Database, Workflow } from "lucide-react"
import { useDeferredValue, useMemo, useState } from "react"
import { Switch } from "@/components/ui/switch"
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
  { category: "relation", label: "Relation", color: "var(--muted-foreground)" },
  { category: "derivation", label: "Role derivation", color: "var(--rebac)", dashed: true },
  { category: "grant", label: "Role grants actions", color: "var(--rbac)" },
  { category: "rule", label: "ABAC rule", color: "var(--abac)" },
  { category: "filter", label: "Resource set filters", color: "var(--abac)", dashed: true },
]

const DATA_EDGES: EdgeLegendItem[] = [
  { category: "assign-instance", label: "Role on instance", color: "var(--rebac)" },
  { category: "assign-tenant", label: "Role in tenant", color: "var(--rbac)" },
  { category: "tuple", label: "Relationship", color: "var(--foreground)" },
  { category: "membership", label: "Belongs to tenant", color: "var(--muted-foreground)", dashed: true },
]

// the graphs follow the editor a beat behind, so typing stays smooth on large policies
/** Beyond this many resource roles the policy graph starts with roles folded into their resources. */
const COLLAPSE_ABOVE = 40

function PolicyGraph() {
  const schema = useDeferredValue(useStore((s) => s.file.schema))
  const roleCount = schema.resources.reduce((n, r) => n + Object.keys(r.roles ?? {}).length, 0)
  const [collapse, setCollapse] = useState<boolean | null>(null)
  const collapseRoles = collapse ?? roleCount > COLLAPSE_ABOVE
  const graph = useMemo(() => policyGraph(schema, { collapseRoles }), [schema, collapseRoles])
  return (
    <GraphCanvas
      id="policy"
      controls={
        roleCount > 0 && (
          <label className="mt-0.5 flex cursor-pointer items-center gap-1 border-t pt-1.5 text-[10.5px] text-muted-foreground">
            <Switch checked={collapseRoles} onCheckedChange={setCollapse} className="origin-left scale-[0.6]" />
            Collapse roles ({roleCount})
          </label>
        )
      }
      graph={graph}
      legend={POLICY_LEGEND}
      edgeLegend={POLICY_EDGES}
      empty="Declare a resource to see the policy graph"
    />
  )
}

function DataGraph() {
  const file = useDeferredValue(useStore((s) => s.file))
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
      id="data"
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
      <div className="flex h-10 shrink-0 items-center gap-3 border-b bg-panel px-4">
        <span className="text-[12.5px] font-medium">Graph</span>
        <TabsList className="h-8 gap-0.5 rounded-md border bg-transparent p-0.5">
          <TabsTrigger
            value="policy"
            className="h-6 flex-none gap-1.5 rounded-sm px-2 text-[11.5px] data-active:bg-accent data-active:shadow-none dark:data-active:border-transparent dark:data-active:bg-accent"
          >
            <Workflow className="size-3.5" /> Policy <span className="font-mono text-[10.5px] text-muted-foreground">{policyCount}</span>
          </TabsTrigger>
          <TabsTrigger
            value="data"
            className="h-6 flex-none gap-1.5 rounded-sm px-2 text-[11.5px] data-active:bg-accent data-active:shadow-none dark:data-active:border-transparent dark:data-active:bg-accent"
          >
            <Database className="size-3.5" /> Data <span className="font-mono text-[10.5px] text-muted-foreground">{dataCount}</span>
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="policy" className="min-h-0 flex-1">
        <PolicyGraph />
      </TabsContent>
      <TabsContent value="data" className="min-h-0 flex-1">
        <DataGraph />
      </TabsContent>
    </Tabs>
  )
}
