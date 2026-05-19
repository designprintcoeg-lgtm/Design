import { useState } from "react";
import { useListQuotations, useListCustomers, useCreateQuotation, useUpdateQuotation, useDeleteQuotation, useConvertQuotationToOrder, getListQuotationsQueryKey, getListSalesOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import type { Quotation } from "@workspace/api-client-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

function QuotationForm({ initial, customers, onSave, onCancel }: { initial?: Partial<Quotation>; customers: any[]; onSave: (d: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    customerId: initial?.customerId ?? 0,
    productType: initial?.productType ?? "",
    quantity: initial?.quantity ?? 1,
    unitPrice: initial?.unitPrice ?? 0,
    paymentTerms: initial?.paymentTerms ?? "",
    deliveryDate: initial?.deliveryDate ?? "",
    status: initial?.status ?? "draft",
    notes: initial?.notes ?? "",
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const total = (form.quantity * form.unitPrice).toFixed(2);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Customer *</Label>
          <Select value={String(form.customerId)} onValueChange={v => set('customerId', parseInt(v))}>
            <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
            <SelectContent>{customers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name} {c.companyName ? `(${c.companyName})` : ''}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Product Type *</Label><Input value={form.productType} onChange={e => set('productType', e.target.value)} placeholder="e.g. Corrugated Box A3" /></div>
        <div><Label>Quantity *</Label><Input type="number" value={form.quantity} onChange={e => set('quantity', parseInt(e.target.value) || 0)} min={1} /></div>
        <div><Label>Unit Price (USD) *</Label><Input type="number" value={form.unitPrice} onChange={e => set('unitPrice', parseFloat(e.target.value) || 0)} step="0.01" min={0} /></div>
        <div><Label>Total Price</Label><Input value={`$${total}`} readOnly className="bg-muted" /></div>
        <div><Label>Payment Terms</Label><Input value={form.paymentTerms} onChange={e => set('paymentTerms', e.target.value)} placeholder="e.g. Net 30" /></div>
        <div><Label>Delivery Date</Label><Input type="date" value={form.deliveryDate} onChange={e => set('deliveryDate', e.target.value)} /></div>
        <div>
          <Label>Status</Label>
          <Select value={form.status} onValueChange={v => set('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['draft','sent','approved','rejected'].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Notes</Label><Input value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={!form.customerId || !form.productType}>Save</Button>
      </DialogFooter>
    </div>
  );
}

export default function Quotations() {
  const { data: quotations = [], isLoading } = useListQuotations();
  const { data: customers = [] } = useListCustomers();
  const create = useCreateQuotation();
  const update = useUpdateQuotation();
  const convert = useConvertQuotationToOrder();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Quotation | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: getListQuotationsQueryKey() });

  const filtered = quotations.filter(q =>
    (statusFilter === "all" || q.status === statusFilter) &&
    (q.quotationNumber.toLowerCase().includes(search.toLowerCase()) || (q.customerName ?? "").toLowerCase().includes(search.toLowerCase()) || q.productType.toLowerCase().includes(search.toLowerCase()))
  );

  async function handleCreate(data: any) {
    try { await create.mutateAsync({ data }); invalidate(); setShowCreate(false); toast.success("Quotation created"); }
    catch { toast.error("Failed to create quotation"); }
  }
  async function handleUpdate(data: any) {
    if (!editing) return;
    try { await update.mutateAsync({ id: editing.id, data }); invalidate(); setEditing(null); toast.success("Updated"); }
    catch { toast.error("Failed to update"); }
  }
  async function handleConvert(id: number) {
    try {
      await convert.mutateAsync({ id });
      invalidate();
      qc.invalidateQueries({ queryKey: getListSalesOrdersQueryKey() });
      toast.success("Converted to Sales Order");
    } catch { toast.error("Failed to convert"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quotations</h1>
          <p className="text-sm text-muted-foreground">{quotations.length} total</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus className="w-4 h-4" />New Quotation</Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {['draft','sent','approved','rejected'].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              {['Quotation #','Customer','Product','Qty','Total','Payment Terms','Delivery','Status',''].map(h => (
                <th key={h} className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wide text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>}
            {!isLoading && filtered.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No quotations</td></tr>}
            {filtered.map(q => (
              <tr key={q.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-mono font-semibold text-primary">{q.quotationNumber}</td>
                <td className="px-4 py-3">{q.customerName}</td>
                <td className="px-4 py-3 max-w-[150px] truncate">{q.productType}</td>
                <td className="px-4 py-3">{q.quantity.toLocaleString()}</td>
                <td className="px-4 py-3 font-semibold">${Number(q.totalPrice).toLocaleString()}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{q.paymentTerms ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{q.deliveryDate ?? "—"}</td>
                <td className="px-4 py-3"><Badge className={`text-xs ${STATUS_COLORS[q.status]}`}>{q.status}</Badge></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(q)}><Edit className="w-3.5 h-3.5" /></Button>
                    {q.status === 'approved' && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700" title="Convert to Sales Order" onClick={() => handleConvert(q.id)}>
                        <ArrowRight className="w-3.5 h-3.5" />
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
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>New Quotation</DialogTitle></DialogHeader>
          <QuotationForm customers={customers} onSave={handleCreate} onCancel={() => setShowCreate(false)} />
        </DialogContent>
      </Dialog>
      <Dialog open={!!editing} onOpenChange={v => !v && setEditing(null)}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Edit Quotation</DialogTitle></DialogHeader>
          {editing && <QuotationForm initial={editing} customers={customers} onSave={handleUpdate} onCancel={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
