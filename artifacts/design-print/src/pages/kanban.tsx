import { useListJobOrders, useAdvanceJobStage, getListJobOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { AlertTriangle, ChevronRight, Eye } from "lucide-react";
import { toast } from "sonner";
import type { JobOrder } from "@workspace/api-client-react";

const PRIORITY_COLORS: Record<string, string> = {
  normal: 'bg-gray-100 text-gray-700', urgent: 'bg-orange-100 text-orange-800',
  very_urgent: 'bg-red-100 text-red-800',
};
const LINE_COLORS: Record<string, string> = {
  offset_printing: 'bg-blue-100 text-blue-800', silk_screen: 'bg-purple-100 text-purple-800',
  plastic_bags: 'bg-teal-100 text-teal-800', corrugated_carton: 'bg-amber-100 text-amber-800',
  flowpack: 'bg-cyan-100 text-cyan-800',
};
const LINE_LABELS: Record<string, string> = {
  offset_printing: 'Offset', silk_screen: 'Silk Screen', plastic_bags: 'Plastic Bags',
  corrugated_carton: 'Corrugated', flowpack: 'Flowpack',
};

function JobCard({ job, onAdvance, onView }: { job: JobOrder; onAdvance: (j: JobOrder) => void; onView: (j: JobOrder) => void }) {
  return (
    <div className={`bg-card border rounded-lg p-3 space-y-2 shadow-sm hover:shadow-md transition-shadow ${job.isDelayed ? 'border-l-4 border-l-red-500' : job.priority === 'very_urgent' ? 'border-l-4 border-l-red-700' : job.priority === 'urgent' ? 'border-l-4 border-l-orange-400' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <span className="font-mono font-bold text-primary text-sm">{job.jobNumber}</span>
          {job.isDelayed && <AlertTriangle className="inline w-3 h-3 text-red-500 ml-1" />}
        </div>
        <Badge className={`text-xs ${PRIORITY_COLORS[job.priority]}`}>{job.priority.replace('_',' ')}</Badge>
      </div>
      <p className="text-sm font-medium truncate">{job.customerName}</p>
      <p className="text-xs text-muted-foreground truncate">{job.productType}</p>
      <div className="flex items-center justify-between">
        <Badge className={`text-xs ${LINE_COLORS[job.productionLine]}`}>{LINE_LABELS[job.productionLine]}</Badge>
        {job.requiredDeliveryDate && <span className="text-xs text-muted-foreground">{job.requiredDeliveryDate}</span>}
      </div>
      <div className="flex gap-1 pt-1 border-t">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onView(job)}><Eye className="w-3.5 h-3.5" /></Button>
        {job.status !== 'completed' && job.status !== 'delivered' && job.status !== 'cancelled' && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" title="Advance stage" onClick={() => onAdvance(job)}>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function Kanban() {
  const { data: jobs = [], isLoading } = useListJobOrders();
  const advance = useAdvanceJobStage();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const invalidate = () => qc.invalidateQueries({ queryKey: getListJobOrdersQueryKey() });

  const activeJobs = jobs.filter(j => j.status !== 'cancelled' && j.status !== 'delivered');

  // Group by current stage
  const stages = [...new Set(activeJobs.map(j => j.currentStage).filter(Boolean) as string[])];

  // Add pending (no stage yet)
  const pendingJobs = activeJobs.filter(j => !j.currentStage);
  const completedJobs = jobs.filter(j => j.status === 'completed');

  async function handleAdvance(job: JobOrder) {
    if (!job.currentStage) return;
    try {
      await advance.mutateAsync({ id: job.id, data: { stageName: job.currentStage } });
      invalidate();
      toast.success(`${job.jobNumber} advanced`);
    } catch { toast.error("Failed to advance stage"); }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kanban Board</h1>
        <p className="text-sm text-muted-foreground">Jobs grouped by current production stage</p>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {/* Pending column */}
          {pendingJobs.length > 0 && (
            <div className="flex-shrink-0 w-64">
              <div className="bg-gray-100 rounded-t-lg px-3 py-2 flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Pending</span>
                <Badge variant="secondary" className="text-xs">{pendingJobs.length}</Badge>
              </div>
              <div className="space-y-2">
                {pendingJobs.map(j => <JobCard key={j.id} job={j} onAdvance={handleAdvance} onView={j2 => navigate(`/job-orders/${j2.id}`)} />)}
              </div>
            </div>
          )}

          {/* Stage columns */}
          {stages.map(stage => {
            const stageJobs = activeJobs.filter(j => j.currentStage === stage);
            return (
              <div key={stage} className="flex-shrink-0 w-64">
                <div className="bg-blue-50 border border-blue-100 rounded-t-lg px-3 py-2 flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-blue-900 truncate">{stage}</span>
                  <Badge className="text-xs bg-blue-100 text-blue-800">{stageJobs.length}</Badge>
                </div>
                <div className="space-y-2">
                  {stageJobs.map(j => <JobCard key={j.id} job={j} onAdvance={handleAdvance} onView={j2 => navigate(`/job-orders/${j2.id}`)} />)}
                  {stageJobs.length === 0 && <div className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-lg">Empty</div>}
                </div>
              </div>
            );
          })}

          {/* Completed column */}
          <div className="flex-shrink-0 w-64">
            <div className="bg-green-50 border border-green-100 rounded-t-lg px-3 py-2 flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-green-900">Completed</span>
              <Badge className="text-xs bg-green-100 text-green-800">{completedJobs.length}</Badge>
            </div>
            <div className="space-y-2">
              {completedJobs.slice(0, 5).map(j => <JobCard key={j.id} job={j} onAdvance={handleAdvance} onView={j2 => navigate(`/job-orders/${j2.id}`)} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
