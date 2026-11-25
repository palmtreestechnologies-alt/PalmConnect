import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Package as PackageIcon, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function Packages() {
  const { businessId } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", duration_minutes: "60", download_kbps: "5120", upload_kbps: "2048", data_limit_mb: "", device_limit: "1" });

  async function load() {
    if (!businessId) return;
    const { data } = await supabase.from("packages").select("*").eq("business_id", businessId).order("created_at", { ascending: false });
    setItems(data ?? []);
  }
  useEffect(() => { load(); }, [businessId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("packages").insert({
      business_id: businessId, name: f.name,
      duration_minutes: +f.duration_minutes, download_kbps: +f.download_kbps || null, upload_kbps: +f.upload_kbps || null,
      data_limit_mb: f.data_limit_mb ? +f.data_limit_mb : null, device_limit: +f.device_limit,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Package created"); setOpen(false); load();
  }

  async function toggle(id: string, active: boolean) {
    await supabase.from("packages").update({ active }).eq("id", id);
    load();
  }
  async function remove(id: string) {
    if (!confirm("Delete?")) return;
    await supabase.from("packages").delete().eq("id", id); load();
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">WiFi Packages</h1>
            <p className="text-sm text-muted-foreground">Define what guests get when they connect.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button variant="hero"><Plus className="h-4 w-4"/>New Package</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create WiFi package</DialogTitle></DialogHeader>
              <form onSubmit={add} className="space-y-3">
                <div className="space-y-1.5"><Label>Name</Label><Input value={f.name} onChange={(e)=>setF({...f,name:e.target.value})} placeholder="1 Hour Free" required/></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Duration (minutes)</Label><Input type="number" value={f.duration_minutes} onChange={(e)=>setF({...f,duration_minutes:e.target.value})}/></div>
                  <div className="space-y-1.5"><Label>Devices allowed</Label><Input type="number" value={f.device_limit} onChange={(e)=>setF({...f,device_limit:e.target.value})}/></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Download (kbps)</Label><Input type="number" value={f.download_kbps} onChange={(e)=>setF({...f,download_kbps:e.target.value})}/></div>
                  <div className="space-y-1.5"><Label>Upload (kbps)</Label><Input type="number" value={f.upload_kbps} onChange={(e)=>setF({...f,upload_kbps:e.target.value})}/></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Data cap (MB)</Label><Input type="number" value={f.data_limit_mb} onChange={(e)=>setF({...f,data_limit_mb:e.target.value})} placeholder="Unlimited"/></div>
                </div>
                <Button type="submit" className="w-full" variant="hero">Create</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {items.length === 0 ? (
          <Card className="p-12 bg-card-grad text-center">
            <PackageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3"/>
            <h3 className="font-display font-semibold text-lg">No packages yet</h3>
            <p className="text-sm text-muted-foreground">Create your first WiFi package to start issuing vouchers.</p>
          </Card>
        ) : (
          <Card className="bg-card-grad overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Duration</TableHead><TableHead>Speed</TableHead><TableHead>Data</TableHead><TableHead>Devices</TableHead><TableHead>Active</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-semibold">{p.name}</TableCell>
                    <TableCell>{p.duration_minutes >= 60 ? `${(p.duration_minutes/60).toFixed(0)}h` : `${p.duration_minutes}m`}</TableCell>
                    <TableCell className="font-mono text-xs">{p.download_kbps ?? "—"}/{p.upload_kbps ?? "—"} kbps</TableCell>
                    <TableCell>{p.data_limit_mb ? `${p.data_limit_mb} MB` : "Unlimited"}</TableCell>
                    <TableCell>{p.device_limit}</TableCell>
                    <TableCell><Switch checked={p.active} onCheckedChange={(v) => toggle(p.id, v)}/></TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
