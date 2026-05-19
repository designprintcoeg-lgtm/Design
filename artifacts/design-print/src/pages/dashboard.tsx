import { useGetDashboardSummary, useGetJobsByLine, useGetJobsByStage, useGetUrgentJobs, useGetDelayedJobs, useGetMachineLoad } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { AlertTriangle, CheckCircle, Clock, Activity, Users, FileText, ShoppingCart, Cpu } from "lucide-react";

const LINE_COLORS: Record<string, string> = {
  "Offset Printing": "#2563eb",
  "Silk Screen": "#7c3aed",
  "Plastic Bags": "#0d9488",
  "Corrugated Carton": "#d97706",
  "Flowpack": "#0891b2",
};

const PIE_COLORS = ["#D32F2F", "#2563eb", "#7c3aed", "#0d9488", "#d97706"];

const STATUS_COLORS: Record<string, string> = {
  available: "bg-green-100 text-green-800",
  running: "bg-blue-100 text-blue-800",
  maintenance: "bg-yellow-100 text-yellow-800",
  stopped: "bg-red-100 text-red-800",
};

const PRIORITY_COLORS: Record<string, string> = {
  normal: "bg-gray-100 text-gray-700",
  urgent: "bg-orange-100 text-orange-800",
  very_urgent: "bg-red-100 text-red-800",
};

function StatCard({ title, value, icon: Icon, color, sub }: { title: string; value: number | string; icon: any; color: string; sub?: string }) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-6 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`p-3 rounded-lg ${color === 'text-red-600' ? 'bg-red-50' : color === 'text-blue-600' ? 'bg-blue-50' : color === 'text-green-600' ? 'bg-green-50' : 'bg-orange-50'}`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: summary } = useGetDashboardSummary();
  const { data: byLine } = useGetJobsByLine();
  const { data: byStage } = useGetJobsByStage();
  const { data: urgentJobs } = useGetUrgentJobs();
  const { data: delayedJobs } = useGetDelayedJobs();
  const { data: machineLoad } = useGetMachineLoad();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Production Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Live overview of all production lines and job status</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Jobs" value={summary?.totalActiveJobs ?? 0} icon={Activity} color="text-blue-600" sub="In progress" />
        <StatCard title="Delayed Jobs" value={summary?.delayedJobs ?? 0} icon={AlertTriangle} color="text-red-600" sub="Needs attention" />
        <StatCard title="Urgent Jobs" value={summary?.urgentJobs ?? 0} icon={Clock} color="text-orange-600" sub="Priority: urgent+" />
        <StatCard title="Completed Today" value={summary?.completedToday ?? 0} icon={CheckCircle} color="text-green-600" sub="Jobs finished" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Customers" value={summary?.totalCustomers ?? 0} icon={Users} color="text-blue-600" />
        <StatCard title="Quotations" value={summary?.totalQuotations ?? 0} icon={FileText} color="text-purple-600" />
        <StatCard title="Pending Orders" value={summary?.pendingOrders ?? 0} icon={ShoppingCart} color="text-orange-600" />
        <StatCard title="Due This Week" value={summary?.ordersThisWeek ?? 0} icon={Cpu} color="text-teal-600" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Jobs by Production Line</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byLine ?? []} margin={{ left: -10, right: 10 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Jobs" radius={[4, 4, 0, 0]}>
                  {(byLine ?? []).map((entry, idx) => (
                    <Cell key={idx} fill={LINE_COLORS[entry.name] ?? "#6b7280"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Jobs by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={byStage ?? []} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, count }: any) => `${name}: ${count}`} labelLine={false}>
                  {(byStage ?? []).map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Urgent + Delayed Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              Urgent Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(urgentJobs ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No urgent jobs</p>
            ) : (
              <div className="space-y-2">
                {(urgentJobs ?? []).slice(0, 5).map(job => (
                  <div key={job.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-mono text-sm font-semibold">{job.jobNumber}</p>
                      <p className="text-xs text-muted-foreground">{job.customerName} — {job.productType}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={`text-xs ${PRIORITY_COLORS[job.priority] || ''}`}>{job.priority.replace('_', ' ')}</Badge>
                      <span className="text-xs text-muted-foreground">{job.currentStage}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Delayed Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(delayedJobs ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No delayed jobs</p>
            ) : (
              <div className="space-y-2">
                {(delayedJobs ?? []).slice(0, 5).map(job => (
                  <div key={job.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-mono text-sm font-semibold">{job.jobNumber}</p>
                      <p className="text-xs text-muted-foreground">{job.customerName}</p>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-red-100 text-red-800 text-xs">Delayed</Badge>
                      <p className="text-xs text-muted-foreground mt-1">{job.requiredDeliveryDate}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Machine Load */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Machine Load</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(machineLoad ?? []).map(machine => (
              <div key={machine.id} className="border rounded-lg p-3">
                <p className="font-semibold text-sm truncate">{machine.name}</p>
                <p className="text-xs text-muted-foreground mb-2">{machine.productionLine.replace('_', ' ')}</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[machine.status] || 'bg-gray-100 text-gray-700'}`}>
                  {machine.status}
                </span>
                {machine.currentJobNumber && (
                  <p className="text-xs font-mono text-muted-foreground mt-1">{machine.currentJobNumber}</p>
                )}
              </div>
            ))}
            {(machineLoad ?? []).length === 0 && (
              <div className="col-span-4 text-center py-4 text-sm text-muted-foreground">No machines configured</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
