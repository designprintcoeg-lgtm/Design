import { useState } from "react";
import { useListMaterials, useCreateMaterial, useUpdateMaterial, useDeleteMaterial, useGetLowStockAlerts, getListMaterialsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Search, Edit, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { Material } from "@workspace/api-client-react";

function MaterialForm({ initial, onSave, onCancel }: { initial?: Partial<Material>; onSave: (d: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    name: initial?.name ?? "", category: initial?.category ?? "", unit: initial?.unit ?? "",
    currentQuantity: initial?.currentQuantity ?? 0, minimumQuantity: initial?.minimumQuantity ?? 0,
    supplier: initial?.supplier ?? "", costPerUnit: initial?.costPerUnit ?? 0,
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Label>Material Name *</Label><Input value={form.name} onChange={e => set('name', e.target.value)} /></div>
        <div><Label>Category *</Label><Input value={form.category} onChange={e => set('category', e.target.value)} placeholder="e.g. Paper, Ink, Film" /></div>
        <div><Label>Unit *</Label><Input value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="e.g. kg, pcs, roll" /></div>
        <div><Label>Current Quantity</Label><Input type="number" step="0.001" min={0} value={form.currentQuantity} onChange={e => set('currentQuantity', parseFloat(e.target.value) || 0)} /></div>
        <div><Label>Minimum Quantity</Label><Input type="number" step="0.001" min={0} value={form.minimumQuantity} onChange={e => set('minimumQuantity', parseFloat(e.target.value) || 0)} /></div>
        <div><Label>Supplier</Label><Input value={form.supplier} onChange={e => set('supplier', e.target.value)} /></div>
        <div><Label>Cost per Unit (USD)</Label><Input type="number" step="0.0001" min={0} value={form.costPerUnit} onChange={e => set('costPerUnit', parseFloat(e.target.value) || 0)} /></div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={!form.name || !form.category || !form.unit}>Save</Button>
      </DialogFooter>
    </div>
  );
}

export default function Inventory() {
  const { data: materials = [], isLoading } = useListMaterials();
  const { data: lowStock = [] } = useGetLowStockAlerts();
  const create = useCreateMaterial();
  const update = useUpdateMaterial();
  const del = useDeleteMaterial();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: getListMaterialsQueryKey() });

  const filtered = materials.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.category.toLowerCase().includes(search.toLowerCase()) ||
    (m.supplier ?? "").toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate(data: any) {
    try { await create.mutateAsync({ data }); invalidate(); setShowCreate(false); toast.success("Material added"); }
    catch { toast.error("Failed"); }
  }
  async function handleUpdate(data: any) {
    if (!editing) return;
    try { await update.mutateAsync({ id: editing.id, data }); invalidate(); setEditing(null); toast.success("Updated"); }
    catch { toast.error("Failed"); }
  }
  async function handleDelete(id: number) {
    try { await del.mutateAsync({ id }); invalidate(); toast.success("Deleted"); }
    catch { toast.error("Failed"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground">{materials.length} materials · {lowStock.length} low stock</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus className="w-4 h-4" />Add Material</Button>
      </div>

      {lowStock.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">{lowStock.length} material(s) are below minimum stock level: {lowStock.map(m => m.name).join(', ')}</p>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search materials..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              {['Material','Category','Unit','Current Qty','Min Qty','Supplier','Cost/Unit','Status',''].map(h => (
                <th key={h} className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wide text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>}
            {!isLoading && filtered.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No materials</td></tr>}
            {filtered.map(m => (
              <tr key={m.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${m.isLowStock ? 'bg-red-50/60' : ''}`}>
                <td className="px-4 py-3 font-semibold">{m.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{m.category}</td>
                <td className="px-4 py-3 text-muted-foreground">{m.unit}</td>
                <td className={`px-4 py-3 font-mono font-semibold ${m.isLowStock ? 'text-red-600' : ''}`}>{Number(m.currentQuantity).toFixed(2)}</td>
                <td className="px-4 py-3 text-muted-foreground font-mono">{Number(m.minimumQuantity).toFixed(2)}</td>
                <td className="px-4 py-3 text-muted-foreground">{m.supplier ?? "—"}</td>
                <td className="px-4 py-3">{m.costPerUnit != null ? `$${Number(m.costPerUnit).toFixed(4)}` : "—"}</td>
                <td className="px-4 py-3">
                  {m.isLowStock ? (
                    <Badge className="bg-red-100 text-red-800 gap-1 text-xs"><AlertTriangle className="w-3 h-3" />Low Stock</Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-800 text-xs">OK</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(m)}><Edit className="w-3.5 h-3.5" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Delete {m.name}?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(m.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
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
        <DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Add Material</DialogTitle></DialogHeader>
          <MaterialForm onSave={handleCreate} onCancel={() => setShowCreate(false)} />
        </DialogContent>
      </Dialog>
      <Dialog open={!!editing} onOpenChange={v => !v && setEditing(null)}>
        <DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Edit Material</DialogTitle></DialogHeader>
          {editing && <MaterialForm initial={editing} onSave={handleUpdate} onCancel={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
