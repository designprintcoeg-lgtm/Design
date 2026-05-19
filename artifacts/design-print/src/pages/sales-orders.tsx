import { useState } from "react";
import { useListSalesOrders, useListCustomers, useCreateSalesOrder, useUpdateSalesOrder, useGenerateJobOrder, getListSalesOrdersQueryKey, getListJobOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Cpu } from "lucide-react";
import { toast } from "sonner";
import type { SalesOrder } from "@workspace/api-client-react";

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  confirmed: "bg-blue-100 text-blue-800",
  in_production: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  delivered: "bg-teal-100 text-teal-800",
  cancelled: "bg-red-100 text-red-700",
};

const PAYMENT_COLORS: Record<string, string> = {
  unpaid: "bg-red-50 text-red-700",
  partial: "bg-yellow-50 text-yellow-700",
  paid: "bg-green-50 text-green-700",
};

function OrderForm({ initial, customers, onSave, onCancel }: { initial?: Partial<SalesOrder>; customers: any[]; onSave: (d: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    customerId: initial?.customerId ?? 0,
    productType: initial?.productType ?? "",
    quantity: initial?.quantity ?? 1,
    deliveryDate: initial?.deliveryDate ?? "",
    paymentStatus: initial?.paymentStatus ?? "unpaid",
    orderStatus: initial?.orderStatus ?? "pending",
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
        <div><Label>Quantity *</Label><Input type="number" value={form.quantity} onChange={e => set('quantity', parseInt(e.target.value) || 0)} /></div>
        <div><Label>Delivery Date</Label><Input type="date" value={form.deliveryDate} onChange={e => set('deliveryDate', e.target.value)} /></div>
        <div>
          <Label>Payment Status</Label>
          <Select value={form.paymentStatus} onValueChange={v => set('paymentStatus', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{['unpaid','partial','paid'].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Order Status</Label>
          <Select value={form.orderStatus} onValueChange={v => set('orderStatus', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{['pending','confirmed','in_production','completed','delivered','cancelled'].map(s => <SelectItem key={s} value={s}>{s.replace('_',' ')}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={!form.customerId || !form.productType}>Save</Button>
      </DialogFooter>
    </div>
  );
}

export default function SalesOrders() {
  const { data: orders = [], isLoading } = useListSalesOrders();
  const { data: customers = [] } = useListCustomers();
  const create = useCreateSalesOrder();
  const update = useUpdateSalesOrder();
  const generateJob = useGenerateJobOrder();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<SalesOrder | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: getListSalesOrdersQueryKey() });

  const filtered = orders.filter(o =>
    (statusFilter === "all" || o.orderStatus === statusFilter) &&
    (o.orderNumber.toLowerCase().includes(search.toLowerCase()) || (o.customerName ?? "").toLowerCase().includes(search.toLowerCase()))
  );

  async function handleCreate(data: any) {
    try { await create.mutateAsync({ data }); invalidate(); setShowCreate(false); toast.success("Sales order created"); }
    catch { toast.error("Failed"); }
  }
  async function handleUpdate(data: any) {
    if (!editing) return;
    try { await update.mutateAsync({ id: editing.id, data }); invalidate(); setEditing(null); toast.success("Updated"); }
    catch { toast.error("Failed"); }
  }
  async function handleGenerateJob(id: number) {
    try {
      await generateJob.mutateAsync({ id });
      invalidate();
      qc.invalidateQueries({ queryKey: getListJobOrdersQueryKey() });
      toast.success("Job order generated");
    } catch { toast.error("Failed to generate job order"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales Orders</h1>
          <p className="text-sm text-muted-foreground">{orders.length} total</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus className="w-4 h-4" />New Order</Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {['pending','confirmed','in_production','completed','delivered','cancelled'].map(s => <SelectItem key={s} value={s}>{s.replace('_',' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              {['Order #','Customer','Product','Qty','Delivery','Payment','Status',''].map(h => (
                <th key={h} className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wide text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>}
            {!isLoading && filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No orders</td></tr>}
            {filtered.map(o => (
              <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-mono font-semibold text-primary">{o.orderNumber}</td>
                <td className="px-4 py-3">{o.customerName}</td>
                <td className="px-4 py-3 max-w-[140px] truncate">{o.productType}</td>
                <td className="px-4 py-3">{o.quantity.toLocaleString()}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{o.deliveryDate ?? "—"}</td>
                <td className="px-4 py-3"><Badge className={`text-xs ${PAYMENT_COLORS[o.paymentStatus]}`}>{o.paymentStatus}</Badge></td>
                <td className="px-4 py-3"><Badge className={`text-xs ${ORDER_STATUS_COLORS[o.orderStatus]}`}>{o.orderStatus.replace('_',' ')}</Badge></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(o)}><Edit className="w-3.5 h-3.5" /></Button>
                    {o.orderStatus === 'confirmed' && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-purple-600" title="Generate Job Order" onClick={() => handleGenerateJob(o.id)}>
                        <Cpu className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-xl"><DialogHeader><DialogTitle>New Sales Order</DialogTitle></DialogHeader>
          <OrderForm customers={customers} onSave={handleCreate} onCancel={() => setShowCreate(false)} />
        </DialogContent>
      </Dialog>
      <Dialog open={!!editing} onOpenChange={v => !v && setEditing(null)}>
        <DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Edit Sales Order</DialogTitle></DialogHeader>
          {editing && <OrderForm initial={editing} customers={customers} onSave={handleUpdate} onCancel={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
