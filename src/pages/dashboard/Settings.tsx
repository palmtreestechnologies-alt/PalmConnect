import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings as SettingsIcon, Wifi, Upload, Loader2, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Link } from "react-router-dom";

type BusinessSettings = {
  name: string;
  email: string | null;
  phone: string | null;
  primary_color: string | null;
  logo_url: string | null;
  welcome_message: string | null;
  support_phone: string | null;
  support_email: string | null;
  terms_and_conditions: string | null;
  hotspot_username_prefix: string;
  captive_portal_template: string;
  captive_portal_language: string;
  voucher_expiry_days: number | null;
  redirect_url_after_purchase: string | null;
  prune_inactive_after_days: number | null;
};

const empty: BusinessSettings = {
  name: "",
  email: "",
  phone: "",
  primary_color: "#0F5132",
  logo_url: null,
  welcome_message: "",
  support_phone: "",
  support_email: "",
  terms_and_conditions: "",
  hotspot_username_prefix: "P",
  captive_portal_template: "monochrome",
  captive_portal_language: "en",
  voucher_expiry_days: null,
  redirect_url_after_purchase: "",
  prune_inactive_after_days: 30,
};

export default function Settings() {
  const { businessId } = useAuth();
  const [form, setForm] = useState<BusinessSettings>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!businessId) return;
      const { data, error } = await supabase
        .from("businesses")
        .select(
          "name,email,phone,primary_color,logo_url,welcome_message,support_phone,support_email,terms_and_conditions,hotspot_username_prefix,captive_portal_template,captive_portal_language,voucher_expiry_days,redirect_url_after_purchase,prune_inactive_after_days"
        )
        .eq("id", businessId)
        .maybeSingle();
      if (error) toast.error(error.message);
      else if (data) setForm({ ...empty, ...data });
      setLoading(false);
    })();
  }, [businessId]);

  function update<K extends keyof BusinessSettings>(k: K, v: BusinessSettings[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    if (!businessId) return;
    setSaving(true);
    const { error } = await supabase
      .from("businesses")
      .update({
        name: form.name,
        email: form.email,
        phone: form.phone,
        welcome_message: form.welcome_message,
        support_phone: form.support_phone,
        support_email: form.support_email,
        terms_and_conditions: form.terms_and_conditions,
        hotspot_username_prefix: form.hotspot_username_prefix || "P",
        captive_portal_template: form.captive_portal_template,
        captive_portal_language: form.captive_portal_language,
        voucher_expiry_days: form.voucher_expiry_days,
        redirect_url_after_purchase: form.redirect_url_after_purchase,
        prune_inactive_after_days: form.prune_inactive_after_days,
      })
      .eq("id", businessId);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Settings saved");
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="grid place-items-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-[1100px] mx-auto space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Configure your business profile, branding, and hotspot defaults.
            </p>
          </div>
          <Button variant="hero" onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Save changes
          </Button>
        </div>

        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general" className="gap-1.5">
              <SettingsIcon className="h-3.5 w-3.5" /> General
            </TabsTrigger>
            <TabsTrigger value="hotspot" className="gap-1.5">
              <Wifi className="h-3.5 w-3.5" /> Hotspot
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-1.5">
              <CreditCard className="h-3.5 w-3.5" /> Payments
            </TabsTrigger>
          </TabsList>

          {/* GENERAL */}
          <TabsContent value="general" className="space-y-5">
            <Card className="p-6 bg-card-grad space-y-5">
              <div>
                <h2 className="font-display font-semibold text-lg">Appearance</h2>
                <p className="text-xs text-muted-foreground">
                  Logo and brand color used across the dashboard and captive portal.
                </p>
              </div>

              <p className="text-sm">
                Logo and colors now live on the <Link to="/dashboard/branding" className="font-medium underline underline-offset-2">Branding page</Link>.
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Business name</Label>
                  <Input value={form.name} onChange={(e) => update("name", e.target.value)} />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card-grad space-y-5">
              <div>
                <h2 className="font-display font-semibold text-lg">Contact</h2>
                <p className="text-xs text-muted-foreground">
                  Shown to your guests on the captive portal and in support links.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Business email</Label>
                  <Input
                    type="email"
                    value={form.email ?? ""}
                    onChange={(e) => update("email", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Business phone</Label>
                  <Input
                    value={form.phone ?? ""}
                    onChange={(e) => update("phone", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Customer support phone</Label>
                  <Input
                    value={form.support_phone ?? ""}
                    onChange={(e) => update("support_phone", e.target.value)}
                    placeholder="0710808394"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Customer support email</Label>
                  <Input
                    type="email"
                    value={form.support_email ?? ""}
                    onChange={(e) => update("support_email", e.target.value)}
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card-grad space-y-3">
              <div>
                <h2 className="font-display font-semibold text-lg">Terms & Conditions</h2>
                <p className="text-xs text-muted-foreground">
                  Shown to guests before they connect.
                </p>
              </div>
              <Textarea
                rows={6}
                value={form.terms_and_conditions ?? ""}
                onChange={(e) => update("terms_and_conditions", e.target.value)}
                placeholder="By connecting to this WiFi network you agree to..."
              />
            </Card>
          </TabsContent>

          {/* HOTSPOT */}
          <TabsContent value="hotspot" className="space-y-5">
            <Card className="p-6 bg-card-grad space-y-5">
              <div>
                <h2 className="font-display font-semibold text-lg">Hotspot defaults</h2>
                <p className="text-xs text-muted-foreground">
                  Applied when generating new vouchers and hotspot users.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Username prefix</Label>
                  <Input
                    value={form.hotspot_username_prefix}
                    maxLength={6}
                    onChange={(e) => update("hotspot_username_prefix", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Used when generating usernames (e.g. <code>P</code> → <code>P-a3f9</code>).
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>Captive portal template</Label>
                  <Select
                    value={form.captive_portal_template}
                    onValueChange={(v) => update("captive_portal_template", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monochrome">Monochrome</SelectItem>
                      <SelectItem value="emerald">Emerald (branded)</SelectItem>
                      <SelectItem value="photo">Photo background</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Portal language</Label>
                  <Select
                    value={form.captive_portal_language}
                    onValueChange={(v) => update("captive_portal_language", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="sw">Swahili</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Prune inactive users after (days)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.prune_inactive_after_days ?? ""}
                    onChange={(e) =>
                      update(
                        "prune_inactive_after_days",
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Expire unused vouchers after (days)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.voucher_expiry_days ?? ""}
                    onChange={(e) =>
                      update(
                        "voucher_expiry_days",
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                    placeholder="Never"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank if unused vouchers should never expire.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>Redirect URL after purchase</Label>
                  <Input
                    value={form.redirect_url_after_purchase ?? ""}
                    onChange={(e) => update("redirect_url_after_purchase", e.target.value)}
                    placeholder="https://www.google.com"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card-grad space-y-3">
              <div>
                <h2 className="font-display font-semibold text-lg">Welcome message</h2>
                <p className="text-xs text-muted-foreground">
                  Greeting shown on the captive portal.
                </p>
              </div>
              <Textarea
                rows={3}
                value={form.welcome_message ?? ""}
                onChange={(e) => update("welcome_message", e.target.value)}
                placeholder="Karibu! Enjoy fast WiFi on us."
              />
            </Card>
          </TabsContent>

          {/* PAYMENTS */}
          <TabsContent value="payments" className="space-y-5">
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
