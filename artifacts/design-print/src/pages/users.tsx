import { useState } from "react";
import { useListUsers, useCreateUser, useUpdateUser, useDeleteUser, getListUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@workspace/api-client-react";

const ROLES = ['admin','sales','operations','designer','finalizer','production_manager','machine_operator','qc','warehouse','finance','delivery'];
const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-800', sales: 'bg-blue-100 text-blue-800',
  operations: 'bg-purple-100 text-purple-800', designer: 'bg-pink-100 text-pink-800',
  finalizer: 'bg-indigo-100 text-indigo-800', production_manager: 'bg-orange-100 text-orange-800',
  machine_operator: 'bg-teal-100 text-teal-800', qc: 'bg-yellow-100 text-yellow-800',
  warehouse: 'bg-cyan-100 text-cyan-800', finance: 'bg-green-100 text-green-800',
  delivery: 'bg-gray-100 text-gray-700',
};

function UserForm({ initial, isNew, onSave, onCancel }: { initial?: Partial<User>; isNew?: boolean; onSave: (d: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    username: (initial as any)?.username ?? "",
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    role: initial?.role ?? "sales",
    password: "",
    isActive: initial?.isActive ?? true,
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {isNew && <div><Label>Username *</Label><Input value={form.username} onChange={e => set('username', e.target.value)} /></div>}
        <div className={isNew ? '' : 'col-span-2'}><Label>Full Name *</Label><Input value={form.name} onChange={e => set('name', e.target.value)} /></div>
        <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
        <div>
          <Label>Role *</Label>
          <Select value={form.role} onValueChange={v => set('role', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r.replace('_',' ')}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>{isNew ? 'Password *' : 'New Password (leave blank to keep)'}</Label><Input type="password" value={form.password} onChange={e => set('password', e.target.value)} /></div>
        {!isNew && (
          <div className="flex items-center gap-3 pt-4">
            <Switch checked={form.isActive} onCheckedChange={v => set('isActive', v)} />
            <Label>Active</Label>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={!form.name || !form.role || (isNew && (!form.username || !form.password))}>Save</Button>
      </DialogFooter>
    </div>
  );
}

export default function Users() {
  const { data: users = [], isLoading } = useListUsers();
  const create = useCreateUser();
  const update = useUpdateUser();
  const del = useDeleteUser();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: getListUsersQueryKey() });

  async function handleCreate(data: any) {
    const payload = { username: data.username, password: data.password, name: data.name, email: data.email, role: data.role };
    try { await create.mutateAsync({ data: payload }); invalidate(); setShowCreate(false); toast.success("User created"); }
    catch { toast.error("Failed to create user"); }
  }
  async function handleUpdate(data: any) {
    if (!editing) return;
    const payload: Record<string, any> = { name: data.name, email: data.email, role: data.role, isActive: data.isActive };
    if (data.password) payload.password = data.password;
    try { await update.mutateAsync({ id: editing.id, data: payload }); invalidate(); setEditing(null); toast.success("Updated"); }
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
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground">{users.length} users · Admin only</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus className="w-4 h-4" />Add User</Button>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>{['Name','Username','Email','Role','Status',''].map(h => (
              <th key={h} className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wide text-xs">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>}
            {!isLoading && users.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No users</td></tr>}
            {users.map(u => (
              <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-semibold">{u.name}</td>
                <td className="px-4 py-3 font-mono text-muted-foreground">{(u as any).username ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.email ?? "—"}</td>
                <td className="px-4 py-3"><Badge className={`text-xs ${ROLE_COLORS[u.role] ?? 'bg-gray-100'}`}>{u.role.replace('_',' ')}</Badge></td>
                <td className="px-4 py-3"><Badge className={`text-xs ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>{u.isActive ? 'Active' : 'Inactive'}</Badge></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(u)}><Edit className="w-3.5 h-3.5" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Delete {u.name}?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(u.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
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
        <DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Create User</DialogTitle></DialogHeader>
          <UserForm isNew onSave={handleCreate} onCancel={() => setShowCreate(false)} />
        </DialogContent>
      </Dialog>
      <Dialog open={!!editing} onOpenChange={v => !v && setEditing(null)}>
        <DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          {editing && <UserForm initial={editing} onSave={handleUpdate} onCancel={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
