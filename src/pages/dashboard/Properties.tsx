import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Building2, Plus, Trash2, Pencil, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const TYPES = ["bnb", "villa", "guest_house", "lodge", "boutique_hotel", "hotel", "resort", "restaurant", "cafe", "lounge", "school", "hospital"];

export default function Properties() {
  const { businessId } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ name: "", property_type: "hotel", room_count: 0, address: "" });

  async function load() {
    if (!businessId) return;
    setLoading(true);
    const { data } = await supabase.from("properties").select("*").eq("business_id", businessId).order("created_at", { ascending: false });
    setRows(data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [businessId]);

  function startNew() {
    setEditing(null);
    setForm({ name: "", property_type: "hotel", room_count: 0, address: "" });
    setOpen(true);
  }
  function startEdit(r: any) {
    setEditing(r);
    setForm({ name: r.name, property_type: r.property_type, room_count: r.room_count, address: r.address ?? "" });
    setOpen(true);
  }

  async function save() {
    if (!businessId || !form.name.trim()) return;
    const payload = { ...form, business_id: businessId, room_count: Number(form.room_count) || 0 };
    const { error } = editing
      ? await supabase.from("properties").update(payload).eq("id", editing.id)
      : await supabase.from("properties").insert(payload);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: editing ? "Property updated" : "Property added" });
    setOpen(false);
    load();
  }
  async function remove(id: string) {
    if (!confirm("Delete this property?")) return;
    const { error } = await supabase.from("properties").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    load();
  }

  const totalRooms = rows.reduce((s, r) => s + (r.room_count || 0), 0);

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">Properties</h1>
            <p className="text-sm text-muted-foreground">Manage rooms and properties — your plan adjusts automatically.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button onClick={startNew}><Plus className="h-4 w-4"/>Add property</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Edit property" : "New property"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Palm Villa Diani" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Type</Label>
                    <Select value={form.property_type} onValueChange={(v) => setForm({ ...form, property_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Rooms</Label><Input type="number" min={0} value={form.room_count} onChange={(e) => setForm({ ...form, room_count: Number(e.target.value) })} /></div>
                </div>
                <div><Label>Address (optional)</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={save}>{editing ? "Save" : "Create"}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="p-5 bg-card-grad"><p className="text-xs text-muted-foreground uppercase tracking-widest">Properties</p><p className="font-display text-3xl font-bold mt-1">{rows.length}</p></Card>
          <Card className="p-5 bg-card-grad"><p className="text-xs text-muted-foreground uppercase tracking-widest">Total rooms</p><p className="font-display text-3xl font-bold mt-1">{totalRooms}</p></Card>
          <Card className="p-5 bg-card-grad"><p className="text-xs text-muted-foreground uppercase tracking-widest">Active</p><p className="font-display text-3xl font-bold mt-1">{rows.filter(r => r.active).length}</p></Card>
        </div>

        {loading ? <Card className="p-12 text-center"><Loader2 className="h-6 w-6 mx-auto animate-spin text-primary"/></Card> : rows.length === 0 ? (
          <Card className="p-12 bg-card-grad text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-display font-semibold text-lg">No properties yet</h3>
            <p className="text-sm text-muted-foreground">Add your first property to get started.</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map((r) => (
              <Card key={r.id} className="p-5 bg-card-grad">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display font-semibold">{r.name}</h3>
                    <Badge variant="secondary" className="mt-1 capitalize">{r.property_type.replace("_", " ")}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => startEdit(r)}><Pencil className="h-4 w-4"/></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                  </div>
                </div>
                <p className="text-3xl font-display font-bold mt-3">{r.room_count} <span className="text-sm font-normal text-muted-foreground">rooms</span></p>
                {r.address && <p className="text-xs text-muted-foreground mt-2">{r.address}</p>}
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
