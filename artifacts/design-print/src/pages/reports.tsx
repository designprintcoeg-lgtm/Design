import { useGetProductionPerformance, useGetWasteReport, useGetQCRejectionReport, useGetJobProfitabilityReport, useGetMachineUtilizationReport, useGetLowStockAlerts, useGetDelayedJobs } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { AlertTriangle } from "lucide-react";

const LINE_COLORS = ["#D32F2F","#2563eb","#7c3aed","#0d9488","#d97706"];
const STATUS_COLORS: Record<string, string> = {
  available: "bg-green-100 text-green-800", running: "bg-blue-100 text-blue-800",
  maintenance: "bg-yellow-100 text-yellow-800", stopped: "bg-red-100 text-red-700",
};
const QC_COLORS: Record<string, string> = {
  rejected: "bg-red-100 text-red-800", rework: "bg-yellow-100 text-yellow-800",
};

export default function Reports() {
  const { data: performance } = useGetProductionPerformance();
  const { data: waste = [] } = useGetWasteReport();
  const { data: qcRejections = [] } = useGetQCRejectionReport();
  const { data: profitability = [] } = useGetJobProfitabilityReport();
  const { data: machineUtil = [] } = useGetMachineUtilizationReport();
  const { data: lowStock = [] } = useGetLowStockAlerts();
  const { data: delayed = [] } = useGetDelayedJobs();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">Production analytics and performance insights</p>
      </div>

      <Tabs defaultValue="performance">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="delayed">Delayed Jobs</TabsTrigger>
          <TabsTrigger value="waste">Waste</TabsTrigger>
          <TabsTrigger value="machines">Machines</TabsTrigger>
          <TabsTrigger value="profitability">Profitability</TabsTrigger>
          <TabsTrigger value="qc">QC Rejection</TabsTrigger>
          <TabsTrigger value="stock">Low Stock</TabsTrigger>
        </TabsList>

        {/* Production Performance */}
        <TabsContent value="performance" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground uppercase tracking-wide">Total Jobs</p><p className="text-3xl font-bold mt-1">{performance?.totalJobs ?? 0}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground uppercase tracking-wide">Completed</p><p className="text-3xl font-bold mt-1 text-green-600">{performance?.completedJobs ?? 0}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground uppercase tracking-wide">Delayed</p><p className="text-3xl font-bold mt-1 text-red-600">{performance?.delayedJobs ?? 0}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground uppercase tracking-wide">On-Time Rate</p><p className="text-3xl font-bold mt-1">{(performance?.onTimeRate ?? 0).toFixed(1)}%</p></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Jobs by Production Line</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={performance?.byLine ?? []} margin={{ left: -10, right: 10 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Jobs" radius={[4, 4, 0, 0]}>
                    {(performance?.byLine ?? []).map((_, idx) => <Cell key={idx} fill={LINE_COLORS[idx % LINE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delayed Jobs */}
        <TabsContent value="delayed" className="mt-4">
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b"><tr>{['Job #','Customer','Product','Line','Priority','Due Date','Stage'].map(h => <th key={h} className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wide text-xs">{h}</th>)}</tr></thead>
              <tbody>
                {delayed.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No delayed jobs</td></tr>}
                {delayed.map((j: any) => (
                  <tr key={j.id} className="border-b last:border-0 bg-red-50/40 hover:bg-red-50/60">
                    <td className="px-4 py-3 font-mono font-bold text-primary flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-red-500" />{j.jobNumber}</td>
                    <td className="px-4 py-3">{j.customerName}</td>
                    <td className="px-4 py-3 max-w-[140px] truncate">{j.productType}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{j.productionLine?.replace('_',' ')}</td>
                    <td className="px-4 py-3"><Badge className="text-xs bg-orange-100 text-orange-800">{j.priority?.replace('_',' ')}</Badge></td>
                    <td className="px-4 py-3 text-red-600 font-semibold text-xs">{j.requiredDeliveryDate}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{j.currentStage ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Waste */}
        <TabsContent value="waste" className="mt-4">
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b"><tr>{['Job #','Stage','Production Line','Waste Qty'].map(h => <th key={h} className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wide text-xs">{h}</th>)}</tr></thead>
              <tbody>
                {waste.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No waste data</td></tr>}
                {waste.map((w, idx) => (
                  <tr key={idx} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono font-bold text-primary">{w.jobNumber}</td>
                    <td className="px-4 py-3">{w.stageName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{(w.productionLine ?? '').replace('_',' ')}</td>
                    <td className="px-4 py-3 font-semibold text-red-600">{Number(w.wasteQuantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Machine Utilization */}
        <TabsContent value="machines" className="mt-4">
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b"><tr>{['Machine','Production Line','Status','Jobs Completed'].map(h => <th key={h} className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wide text-xs">{h}</th>)}</tr></thead>
              <tbody>
                {machineUtil.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No data</td></tr>}
                {machineUtil.map((m, idx) => (
                  <tr key={idx} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-semibold">{m.machineName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.productionLine.replace('_',' ')}</td>
                    <td className="px-4 py-3"><Badge className={`text-xs ${STATUS_COLORS[m.status] ?? 'bg-gray-100'}`}>{m.status}</Badge></td>
                    <td className="px-4 py-3 font-bold">{m.jobsCompleted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Profitability */}
        <TabsContent value="profitability" className="mt-4">
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b"><tr>{['Job #','Product','Selling Price','Actual Cost','Gross Profit','Margin %'].map(h => <th key={h} className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wide text-xs">{h}</th>)}</tr></thead>
              <tbody>
                {profitability.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No profitability data</td></tr>}
                {profitability.map((p, idx) => (
                  <tr key={idx} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono font-bold text-primary">{p.jobNumber}</td>
                    <td className="px-4 py-3">{p.productType}</td>
                    <td className="px-4 py-3 font-semibold">${Number(p.sellingPrice).toFixed(2)}</td>
                    <td className="px-4 py-3">${Number(p.actualCost).toFixed(2)}</td>
                    <td className={`px-4 py-3 font-bold ${Number(p.grossProfit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>${Number(p.grossProfit).toFixed(2)}</td>
                    <td className="px-4 py-3">{Number(p.grossMarginPercent).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* QC Rejection */}
        <TabsContent value="qc" className="mt-4">
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b"><tr>{['Job #','Production Line','Result','Notes'].map(h => <th key={h} className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wide text-xs">{h}</th>)}</tr></thead>
              <tbody>
                {qcRejections.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No QC rejections</td></tr>}
                {qcRejections.map((r, idx) => (
                  <tr key={idx} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono font-bold text-primary">{r.jobNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.productionLine.replace('_',' ')}</td>
                    <td className="px-4 py-3"><Badge className={`text-xs ${QC_COLORS[r.result] ?? 'bg-gray-100'}`}>{r.result}</Badge></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{r.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Low Stock */}
        <TabsContent value="stock" className="mt-4">
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b"><tr>{['Material','Category','Unit','Current Qty','Min Qty','Supplier'].map(h => <th key={h} className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wide text-xs">{h}</th>)}</tr></thead>
              <tbody>
                {lowStock.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">All materials are above minimum stock</td></tr>}
                {lowStock.map((m, idx) => (
                  <tr key={idx} className="border-b last:border-0 bg-red-50/40 hover:bg-red-50/60">
                    <td className="px-4 py-3 font-semibold flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-red-500" />{m.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.category}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.unit}</td>
                    <td className="px-4 py-3 font-bold text-red-600">{Number(m.currentQuantity).toFixed(2)}</td>
                    <td className="px-4 py-3">{Number(m.minimumQuantity).toFixed(2)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.supplier ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
