import { useState } from "react";
import { useListCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer, getListCustomersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import type { Customer } from "@workspace/api-client-react";

function CustomerForm({ initial, onSave, onCancel }: { initial?: Partial<Customer>; onSave: (data: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    name: initial?.name ?? "", companyName: initial?.companyName ?? "", phone: initial?.phone ?? "",
    whatsapp: initial?.whatsapp ?? "", email: initial?.email ?? "", address: initial?.address ?? "",
    customerType: initial?.customerType ?? "", source: initial?.source ?? "", notes: initial?.notes ?? "",
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Name *</Label><Input value={form.name} onChange={set('name')} /></div>
        <div><Label>Company</Label><Input value={form.companyName} onChange={set('companyName')} /></div>
        <div><Label>Phone</Label><Input value={form.phone} onChange={set('phone')} /></div>
        <div><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={set('whatsapp')} /></div>
        <div><Label>Email</Label><Input type="email" value={form.email} onChange={set('email')} /></div>
        <div><Label>Customer Type</Label><Input value={form.customerType} onChange={set('customerType')} placeholder="e.g. VIP, Regular" /></div>
        <div><Label>Source</Label><Input value={form.source} onChange={set('source')} placeholder="e.g. Referral, Walk-in" /></div>
        <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={set('address')} /></div>
        <div className="col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={set('notes')} /></div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={!form.name}>Save Customer</Button>
      </DialogFooter>
    </div>
  );
}

export default function Customers() {
  const { data: customers = [], isLoading } = useListCustomers();
  const create = useCreateCustomer();
  const update = useUpdateCustomer();
  const del = useDeleteCustomer();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: getListCustomersQueryKey() });

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.companyName ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate(data: any) {
    try {
      await create.mutateAsync({ data });
      invalidate();
      setShowCreate(false);
      toast.success("Customer created");
    } catch { toast.error("Failed to create customer"); }
  }

  async function handleUpdate(data: any) {
    if (!editing) return;
    try {
      await update.mutateAsync({ id: editing.id, data });
      invalidate();
      setEditing(null);
      toast.success("Customer updated");
    } catch { toast.error("Failed to update customer"); }
  }

  async function handleDelete(id: number) {
    try {
      await del.mutateAsync({ id });
      invalidate();
      toast.success("Customer deleted");
    } catch { toast.error("Failed to delete customer"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">{customers.length} total customers</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus className="w-4 h-4" />Add Customer</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wide text-xs">Name</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wide text-xs">Company</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wide text-xs">Contact</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wide text-xs">Type</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wide text-xs">Source</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No customers found</td></tr>
            )}
            {filtered.map(c => (
              <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-semibold">{c.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.companyName ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="space-y-0.5">
                    {c.phone && <div className="flex items-center gap-1 text-xs"><Phone className="w-3 h-3" />{c.phone}</div>}
                    {c.email && <div className="flex items-center gap-1 text-xs"><Mail className="w-3 h-3" />{c.email}</div>}
                  </div>
                </td>
                <td className="px-4 py-3">{c.customerType ? <Badge variant="secondary">{c.customerType}</Badge> : "—"}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{c.source ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(c)}><Edit className="w-3.5 h-3.5" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
                          <AlertDialogDescription>This will permanently delete {c.name}.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(c.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>New Customer</DialogTitle></DialogHeader>
          <CustomerForm onSave={handleCreate} onCancel={() => setShowCreate(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={v => !v && setEditing(null)}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Edit Customer</DialogTitle></DialogHeader>
          {editing && <CustomerForm initial={editing} onSave={handleUpdate} onCancel={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
