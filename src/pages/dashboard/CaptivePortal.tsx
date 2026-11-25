import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TemplateGallery } from "@/components/portal/TemplateGallery";
import { PortalPreview } from "@/components/portal/PortalPreview";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Save, Send, Loader2, Palette } from "lucide-react";

type Biz = {
  name: string;
  logo_url: string | null;
  primary_color: string;
  welcome_message: string | null;
  terms_and_conditions: string | null;
  redirect_url_after_purchase: string | null;
  captive_portal_template: string;
  captive_portal_language: string;
};

const DEFAULTS: Biz = {
  name: "My Business",
  logo_url: null,
  primary_color: "#0B3B2B",
  welcome_message: "",
  terms_and_conditions: "",
  redirect_url_after_purchase: "",
  captive_portal_template: "monochrome",
  captive_portal_language: "en",
};

export default function CaptivePortal() {
  const { businessId } = useAuth();
  const [biz, setBiz] = useState<Biz>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushing, setPushing] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    supabase
      .from("businesses")
      .select("name, logo_url, primary_color, welcome_message, terms_and_conditions, redirect_url_after_purchase, captive_portal_template, captive_portal_language")
      .eq("id", businessId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setBiz({ ...DEFAULTS, ...data, primary_color: data.primary_color || DEFAULTS.primary_color });
        setLoading(false);
      });
  }, [businessId]);

  async function save() {
    if (!businessId) return;
    setSaving(true);
    const { error } = await supabase.from("businesses").update({
      welcome_message: biz.welcome_message,
      terms_and_conditions: biz.terms_and_conditions,
      redirect_url_after_purchase: biz.redirect_url_after_purchase,
      captive_portal_template: biz.captive_portal_template,
      captive_portal_language: biz.captive_portal_language,
    }).eq("id", businessId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Captive portal saved");
  }

  async function pushToRouters() {
    toast.message("Not available yet", { description: "Installing this page on your routers comes with the next router update. Your settings are saved and will be used then." });
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">Captive Portal</h1>
            <p className="text-sm text-muted-foreground">Customize what guests see when they connect.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={pushToRouters} disabled={pushing}>
              {pushing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Push to routers
            </Button>
            <Button variant="hero" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-6">
            <Card className="p-5 bg-card-grad space-y-4">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-secondary" />
                <h3 className="font-semibold">Template</h3>
              </div>
              <TemplateGallery
                value={biz.captive_portal_template}
                onChange={(v) => setBiz({ ...biz, captive_portal_template: v })}
              />
            </Card>

            <Card className="p-5 bg-card-grad space-y-4">
              <h3 className="font-semibold">Content</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Welcome headline</Label>
                  <Input
                    value={biz.welcome_message ?? ""}
                    onChange={(e) => setBiz({ ...biz, welcome_message: e.target.value })}
                    placeholder="Welcome to Palm Connect"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Language</Label>
                  <Select
                    value={biz.captive_portal_language}
                    onValueChange={(v) => setBiz({ ...biz, captive_portal_language: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="sw">Swahili</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Logo and colors</Label>
                  <p className="text-sm text-muted-foreground">Set on the <Link to="/dashboard/branding" className="font-medium underline underline-offset-2">Branding page</Link>.</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Redirect URL after login</Label>
                  <Input
                    value={biz.redirect_url_after_purchase ?? ""}
                    onChange={(e) => setBiz({ ...biz, redirect_url_after_purchase: e.target.value })}
                    placeholder="https://yourbusiness.com/welcome"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Terms & conditions</Label>
                <Textarea
                  rows={4}
                  value={biz.terms_and_conditions ?? ""}
                  onChange={(e) => setBiz({ ...biz, terms_and_conditions: e.target.value })}
                  placeholder="Shown beneath the login button on the captive portal."
                />
              </div>
            </Card>
          </div>

          <Card className="p-5 bg-card-grad lg:sticky lg:top-6 h-fit">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Live preview</div>
            <PortalPreview
              template={biz.captive_portal_template}
              primaryColor={biz.primary_color}
              logoUrl={biz.logo_url}
              businessName={biz.name}
              welcomeMessage={biz.welcome_message}
              language={biz.captive_portal_language}
            />
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
