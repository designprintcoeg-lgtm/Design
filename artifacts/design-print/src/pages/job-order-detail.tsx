import { useGetJobOrder, useGetJobCosting, useGetQCChecklist, useAdvanceJobStage, useUpsertJobCosting, useUpsertQCChecklist, getGetJobOrderQueryKey, getGetJobCostingQueryKey, getGetQCChecklistQueryKey, QCChecklistInputResult } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const PRIORITY_COLORS: Record<string, string> = {
  normal: 'bg-gray-100 text-gray-700', urgent: 'bg-orange-100 text-orange-800',
  very_urgent: 'bg-red-100 text-red-800',
};
const STATUS_COLORS: Record<string, string> = {
  waiting: 'bg-gray-100 text-gray-500', in_progress: 'bg-blue-100 text-blue-800',
  done: 'bg-green-100 text-green-800', skipped: 'bg-gray-50 text-gray-400',
  on_hold: 'bg-yellow-100 text-yellow-800',
};
const LINE_LABELS: Record<string, string> = {
  offset_printing: 'Offset Printing', silk_screen: 'Silk Screen', plastic_bags: 'Plastic Bags',
  corrugated_carton: 'Corrugated Carton', flowpack: 'Flowpack',
};

export default function JobOrderDetail({ params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { data: job, isLoading } = useGetJobOrder(id, { query: { queryKey: getGetJobOrderQueryKey(id), enabled: !!id } });
  const { data: costing } = useGetJobCosting(id, { query: { queryKey: getGetJobCostingQueryKey(id), enabled: !!id } });
  const { data: qcData } = useGetQCChecklist(id, { query: { queryKey: getGetQCChecklistQueryKey(id), enabled: !!id } });
  const advance = useAdvanceJobStage();
  const upsertCosting = useUpsertJobCosting();
  const upsertQC = useUpsertQCChecklist();

  const [costForm, setCostForm] = useState({ materialCost: 0, machineCost: 0, laborCost: 0, outsourcingCost: 0, wasteCost: 0, sellingPrice: 0 });
  const [qcForm, setQcForm] = useState<{ colorAccuracy: boolean; sizeAccuracy: boolean; materialQuality: boolean; printingDefects: boolean; finishingQuality: boolean; packingQuality: boolean; finalApproval: boolean; result: QCChecklistInputResult; notes: string }>({ colorAccuracy: false, sizeAccuracy: false, materialQuality: false, printingDefects: false, finishingQuality: false, packingQuality: false, finalApproval: false, result: QCChecklistInputResult.pending, notes: '' });

  const invalidate = () => qc.invalidateQueries({ queryKey: getGetJobOrderQueryKey(id) });

  async function handleAdvance() {
    if (!job?.currentStage) return;
    try {
      await advance.mutateAsync({ id, data: { stageName: job.currentStage } });
      invalidate();
      toast.success("Stage advanced");
    } catch { toast.error("Failed to advance stage"); }
  }

  async function handleSaveCosting() {
    try {
      await upsertCosting.mutateAsync({ id, data: costForm });
      toast.success("Costing saved");
    } catch { toast.error("Failed"); }
  }

  async function handleSaveQC() {
    try {
      await upsertQC.mutateAsync({ id, data: qcForm });
      invalidate();
      toast.success("QC saved");
    } catch { toast.error("Failed"); }
  }

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading...</div>;
  if (!job) return <div className="p-8 text-muted-foreground">Job not found</div>;

  const stages = (job as any).stages ?? [];
  const currentStageIdx = stages.findIndex((s: any) => s.stageName === job.currentStage);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/job-orders')}><ArrowLeft className="w-4 h-4" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono">{job.jobNumber}</h1>
            {job.isDelayed && <Badge className="bg-red-100 text-red-800 gap-1"><AlertTriangle className="w-3 h-3" />Delayed</Badge>}
            <Badge className={PRIORITY_COLORS[job.priority]}>{job.priority.replace('_',' ')}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">{job.customerName} — {job.productType}</p>
        </div>
        {job.status !== 'completed' && job.status !== 'delivered' && job.status !== 'cancelled' && (
          <Button onClick={handleAdvance} disabled={advance.isPending} className="gap-2">
            <ChevronRight className="w-4 h-4" />Advance Stage
          </Button>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Production Line</p>
          <p className="font-semibold mt-1">{LINE_LABELS[job.productionLine]}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Quantity</p>
          <p className="font-semibold mt-1">{job.quantity.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Current Stage</p>
          <p className="font-semibold mt-1">{job.currentStage ?? "—"}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Required Delivery</p>
          <p className="font-semibold mt-1">{job.requiredDeliveryDate ?? "—"}</p>
        </CardContent></Card>
      </div>

      {/* Stage Timeline */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Production Stage Progress</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-0 overflow-x-auto pb-2">
            {stages.map((stage: any, idx: number) => {
              const isDone = stage.status === 'done';
              const isActive = stage.stageName === job.currentStage;
              return (
                <div key={stage.id} className="flex items-center flex-shrink-0">
                  <div className={`flex flex-col items-center ${isActive ? 'opacity-100' : isDone ? 'opacity-100' : 'opacity-40'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                      isDone ? 'bg-green-500 border-green-500 text-white' :
                      isActive ? 'bg-primary border-primary text-white' :
                      'bg-white border-gray-300 text-gray-500'
                    }`}>{idx + 1}</div>
                    <p className={`text-xs mt-1 max-w-16 text-center leading-tight ${isActive ? 'font-bold text-primary' : isDone ? 'text-green-700' : 'text-muted-foreground'}`}>
                      {stage.stageName}
                    </p>
                  </div>
                  {idx < stages.length - 1 && (
                    <div className={`h-0.5 w-8 flex-shrink-0 ${isDone ? 'bg-green-400' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="stages">
        <TabsList>
          <TabsTrigger value="stages">Stages</TabsTrigger>
          <TabsTrigger value="costing">Job Costing</TabsTrigger>
          <TabsTrigger value="qc">QC Checklist</TabsTrigger>
        </TabsList>

        <TabsContent value="stages" className="mt-4">
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>{['#','Stage','Status','Start','End','Machine','Waste','Output','Notes'].map(h => (
                  <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {stages.map((s: any) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-2 text-muted-foreground">{s.stageOrder}</td>
                    <td className="px-3 py-2 font-medium">{s.stageName}</td>
                    <td className="px-3 py-2"><Badge className={`text-xs ${STATUS_COLORS[s.status]}`}>{s.status.replace('_',' ')}</Badge></td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{s.startTime ? new Date(s.startTime).toLocaleString() : "—"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{s.endTime ? new Date(s.endTime).toLocaleString() : "—"}</td>
                    <td className="px-3 py-2 text-xs">{s.machineName ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{s.wasteQuantity ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{s.actualOutput ?? "—"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground max-w-[120px] truncate">{s.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="costing" className="mt-4">
          <Card><CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[['materialCost','Material Cost'],['machineCost','Machine Cost'],['laborCost','Labor Cost'],['outsourcingCost','Outsourcing'],['wasteCost','Waste Cost'],['sellingPrice','Selling Price']].map(([k, label]) => (
                <div key={k}>
                  <Label>{label} (USD)</Label>
                  <Input type="number" step="0.01" min={0}
                    value={(costForm as any)[k] || (costing as any)?.[k] || 0}
                    onChange={e => setCostForm(f => ({ ...f, [k]: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              ))}
            </div>
            {costing && (
              <div className="grid grid-cols-3 gap-3 p-4 bg-muted/50 rounded-lg">
                <div><p className="text-xs text-muted-foreground">Total Est. Cost</p><p className="font-bold">${Number(costing.totalEstimatedCost || 0).toFixed(2)}</p></div>
                <div><p className="text-xs text-muted-foreground">Gross Profit</p><p className="font-bold text-green-600">${Number(costing.grossProfit || 0).toFixed(2)}</p></div>
                <div><p className="text-xs text-muted-foreground">Margin</p><p className="font-bold">{Number(costing.grossMarginPercent || 0).toFixed(1)}%</p></div>
              </div>
            )}
            <Button onClick={handleSaveCosting} disabled={upsertCosting.isPending}>Save Costing</Button>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="qc" className="mt-4">
          <Card><CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[['colorAccuracy','Color Accuracy'],['sizeAccuracy','Size Accuracy'],['materialQuality','Material Quality'],['printingDefects','No Printing Defects'],['finishingQuality','Finishing Quality'],['packingQuality','Packing Quality'],['finalApproval','Final Approval']].map(([k, label]) => (
                <div key={k} className="flex items-center gap-3 py-2 border-b">
                  <Checkbox
                    checked={(qcForm as any)[k] || (qcData as any)?.[k] || false}
                    onCheckedChange={v => setQcForm(f => ({ ...f, [k]: !!v }))}
                  />
                  <Label className="cursor-pointer">{label}</Label>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Result</Label>
                <Select value={qcForm.result || qcData?.result || 'pending'} onValueChange={v => setQcForm(f => ({ ...f, result: v as QCChecklistInputResult }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['pending','passed','rework','rejected'].map(r => <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Input value={qcForm.notes || qcData?.notes || ''} onChange={e => setQcForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>
            <Button onClick={handleSaveQC} disabled={upsertQC.isPending}>Save QC</Button>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
