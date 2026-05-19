import { useState } from "react";
import { useListMachines, useCreateMachine, useUpdateMachine, useDeleteMachine, getListMachinesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Machine } from "@workspace/api-client-react";

const STATUS_COLORS: Record<string, string> = {
  available: "bg-green-100 text-green-800", running: "bg-blue-100 text-blue-800",
  maintenance: "bg-yellow-100 text-yellow-800", stopped: "bg-red-100 text-red-700",
};
const LINE_LABELS: Record<string, string> = {
  offset_printing: 'Offset Printing', silk_screen: 'Silk Screen', plastic_bags: 'Plastic Bags',
  corrugated_carton: 'Corrugated Carton', flowpack: 'Flowpack',
};
const PRODUCTION_LINES = Object.keys(LINE_LABELS);

function MachineForm({ initial, onSave, onCancel }: { initial?: Partial<Machine>; onSave: (d: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    productionLine: initial?.productionLine ?? "offset_printing",
    status: initial?.status ?? "available",
    notes: initial?.notes ?? "",
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Label>Machine Name *</Label><Input value={form.name} onChange={e => set('name', e.target.value)} /></div>
        <div>
          <Label>Production Line *</Label>
          <Select value={form.productionLine} onValueChange={v => set('productionLine', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PRODUCTION_LINES.map(l => <SelectItem key={l} value={l}>{LINE_LABELS[l]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select value={form.status} onValueChange={v => set('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{['available','running','maintenance','stopped'].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={!form.name}>Save</Button>
      </DialogFooter>
    </div>
  );
}

export default function Machines() {
  const { data: machines = [], isLoading } = useListMachines();
  const create = useCreateMachine();
  const update = useUpdateMachine();
  const del = useDeleteMachine();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Machine | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: getListMachinesQueryKey() });

  const byLine = PRODUCTION_LINES.reduce((acc, line) => {
    acc[line] = machines.filter(m => m.productionLine === line);
    return acc;
  }, {} as Record<string, Machine[]>);

  async function handleCreate(data: any) {
    try { await create.mutateAsync({ data }); invalidate(); setShowCreate(false); toast.success("Machine added"); }
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Machine Management</h1>
          <p className="text-sm text-muted-foreground">{machines.length} machines across {PRODUCTION_LINES.length} production lines</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus className="w-4 h-4" />Add Machine</Button>
      </div>

      {isLoading ? <div className="text-muted-foreground">Loading...</div> : (
        <div className="space-y-6">
          {PRODUCTION_LINES.map(line => {
            const lineMachines = byLine[line] ?? [];
            if (lineMachines.length === 0) return null;
            return (
              <div key={line}>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{LINE_LABELS[line]}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {lineMachines.map(m => (
                    <div key={m.id} className="border bg-card rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{m.name}</p>
                          {m.currentJobNumber && <p className="text-xs font-mono text-muted-foreground">{m.currentJobNumber}</p>}
                        </div>
                        <Badge className={`text-xs ${STATUS_COLORS[m.status]}`}>{m.status}</Badge>
                      </div>
                      {m.operatorName && <p className="text-xs text-muted-foreground">Operator: {m.operatorName}</p>}
                      {m.notes && <p className="text-xs text-muted-foreground italic truncate">{m.notes}</p>}
                      <div className="flex gap-2 pt-2 border-t">
                        <Button variant="ghost" size="sm" className="gap-1 h-7" onClick={() => setEditing(m)}><Edit className="w-3 h-3" />Edit</Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-1 h-7 text-destructive hover:text-destructive"><Trash2 className="w-3 h-3" />Delete</Button>
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
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {machines.length === 0 && <div className="text-center py-8 text-muted-foreground">No machines configured</div>}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Add Machine</DialogTitle></DialogHeader>
          <MachineForm onSave={handleCreate} onCancel={() => setShowCreate(false)} />
        </DialogContent>
      </Dialog>
      <Dialog open={!!editing} onOpenChange={v => !v && setEditing(null)}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Edit Machine</DialogTitle></DialogHeader>
          {editing && <MachineForm initial={editing} onSave={handleUpdate} onCancel={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
