import { useState } from "react";
import { useListJobOrders, useListCustomers, useCreateJobOrder, useUpdateJobOrder, getListJobOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { JobOrder } from "@workspace/api-client-react";

const PRODUCTION_LINES = ['offset_printing','silk_screen','plastic_bags','corrugated_carton','flowpack'];
const LINE_LABELS: Record<string, string> = {
  offset_printing: 'Offset Printing', silk_screen: 'Silk Screen', plastic_bags: 'Plastic Bags',
  corrugated_carton: 'Corrugated Carton', flowpack: 'Flowpack',
};
const LINE_COLORS: Record<string, string> = {
  offset_printing: 'bg-blue-100 text-blue-800', silk_screen: 'bg-purple-100 text-purple-800',
  plastic_bags: 'bg-teal-100 text-teal-800', corrugated_carton: 'bg-amber-100 text-amber-800',
  flowpack: 'bg-cyan-100 text-cyan-800',
};
const PRIORITY_COLORS: Record<string, string> = {
  normal: 'bg-gray-100 text-gray-700', urgent: 'bg-orange-100 text-orange-800',
  very_urgent: 'bg-red-100 text-red-800',
};
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700', in_progress: 'bg-blue-100 text-blue-800',
  on_hold: 'bg-yellow-100 text-yellow-800', completed: 'bg-green-100 text-green-800',
  delivered: 'bg-teal-100 text-teal-800', cancelled: 'bg-red-100 text-red-700',
};

function JobOrderForm({ initial, customers, onSave, onCancel }: { initial?: Partial<JobOrder>; customers: any[]; onSave: (d: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    customerId: initial?.customerId ?? 0,
    productType: initial?.productType ?? "",
    productionLine: initial?.productionLine ?? "offset_printing",
    quantity: initial?.quantity ?? 1,
    priority: initial?.priority ?? "normal",
    designFileStatus: initial?.designFileStatus ?? "pending",
    requiredDeliveryDate: initial?.requiredDeliveryDate ?? "",
    assignedDepartment: initial?.assignedDepartment ?? "",
    notes: initial?.notes ?? "",
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Customer *</Label>
          <Select value={String(form.customerId)} onValueChange={v => set('customerId', parseInt(v))}>
            <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
            <SelectContent>{customers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Product Type *</Label><Input value={form.productType} onChange={e => set('productType', e.target.value)} /></div>
        <div>
          <Label>Production Line *</Label>
          <Select value={form.productionLine} onValueChange={v => set('productionLine', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PRODUCTION_LINES.map(l => <SelectItem key={l} value={l}>{LINE_LABELS[l]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Quantity *</Label><Input type="number" value={form.quantity} onChange={e => set('quantity', parseInt(e.target.value) || 0)} /></div>
        <div>
          <Label>Priority</Label>
          <Select value={form.priority} onValueChange={v => set('priority', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{['normal','urgent','very_urgent'].map(p => <SelectItem key={p} value={p}>{p.replace('_',' ')}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Design File Status</Label>
          <Select value={form.designFileStatus} onValueChange={v => set('designFileStatus', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{['pending','in_review','approved','rejected'].map(s => <SelectItem key={s} value={s}>{s.replace('_',' ')}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Required Delivery</Label><Input type="date" value={form.requiredDeliveryDate} onChange={e => set('requiredDeliveryDate', e.target.value)} /></div>
        <div><Label>Department</Label><Input value={form.assignedDepartment} onChange={e => set('assignedDepartment', e.target.value)} placeholder="e.g. Offset Dept." /></div>
        <div className="col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={!form.customerId || !form.productType}>Save</Button>
      </DialogFooter>
    </div>
  );
}

export default function JobOrders() {
  const { data: jobs = [], isLoading } = useListJobOrders();
  const { data: customers = [] } = useListCustomers();
  const create = useCreateJobOrder();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [lineFilter, setLineFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: getListJobOrdersQueryKey() });

  const filtered = jobs.filter(j =>
    (statusFilter === "all" || j.status === statusFilter) &&
    (lineFilter === "all" || j.productionLine === lineFilter) &&
    (priorityFilter === "all" || j.priority === priorityFilter) &&
    (j.jobNumber.toLowerCase().includes(search.toLowerCase()) || (j.customerName ?? "").toLowerCase().includes(search.toLowerCase()) || j.productType.toLowerCase().includes(search.toLowerCase()))
  );

  async function handleCreate(data: any) {
    try { await create.mutateAsync({ data }); invalidate(); setShowCreate(false); toast.success("Job order created"); }
    catch { toast.error("Failed"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Job Orders</h1>
          <p className="text-sm text-muted-foreground">{jobs.length} total</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus className="w-4 h-4" />New Job</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search jobs..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {['pending','in_progress','on_hold','completed','delivered','cancelled'].map(s => <SelectItem key={s} value={s}>{s.replace('_',' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={lineFilter} onValueChange={setLineFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Lines</SelectItem>
            {PRODUCTION_LINES.map(l => <SelectItem key={l} value={l}>{LINE_LABELS[l]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            {['normal','urgent','very_urgent'].map(p => <SelectItem key={p} value={p}>{p.replace('_',' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              {['Job #','Customer','Product','Line','Qty','Priority','Stage','Delivery','Status',''].map(h => (
                <th key={h} className="text-left px-3 py-3 font-semibold text-muted-foreground uppercase tracking-wide text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>}
            {!isLoading && filtered.length === 0 && <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">No jobs found</td></tr>}
            {filtered.map(j => (
              <tr key={j.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${j.isDelayed ? 'bg-red-50/40' : ''}`}>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    {j.isDelayed && <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                    <span className="font-mono font-semibold text-primary">{j.jobNumber}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-sm">{j.customerName}</td>
                <td className="px-3 py-3 max-w-[120px] truncate text-sm">{j.productType}</td>
                <td className="px-3 py-3"><Badge className={`text-xs ${LINE_COLORS[j.productionLine]}`}>{LINE_LABELS[j.productionLine]}</Badge></td>
                <td className="px-3 py-3 text-sm">{j.quantity.toLocaleString()}</td>
                <td className="px-3 py-3"><Badge className={`text-xs ${PRIORITY_COLORS[j.priority]}`}>{j.priority.replace('_',' ')}</Badge></td>
                <td className="px-3 py-3 text-xs text-muted-foreground">{j.currentStage ?? "—"}</td>
                <td className="px-3 py-3 text-xs text-muted-foreground">{j.requiredDeliveryDate ?? "—"}</td>
                <td className="px-3 py-3"><Badge className={`text-xs ${STATUS_COLORS[j.status]}`}>{j.status.replace('_',' ')}</Badge></td>
                <td className="px-3 py-3">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/job-orders/${j.id}`)}>
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>New Job Order</DialogTitle></DialogHeader>
          <JobOrderForm customers={customers} onSave={handleCreate} onCancel={() => setShowCreate(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
