import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { GoogleButton, OrDivider } from "@/components/auth/GoogleButton";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";

const schema = z.object({
  full_name: z.string().trim().min(2).max(100),
  business_name: z.string().trim().min(2).max(120),
  business_type: z.string(),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email().max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
});

const types = [
  { v: "bnb", l: "BNB" },
  { v: "villa", l: "Villa" },
  { v: "hotel", l: "Hotel" },
  { v: "lodge", l: "Lodge" },
  { v: "restaurant", l: "Restaurant" },
  { v: "cafe", l: "Café" },
  { v: "lounge", l: "Lounge" },
  { v: "school", l: "School" },
  { v: "hospital", l: "Hospital" },
];

export default function Register() {
  const [form, setForm] = useState({ full_name: "", business_name: "", business_type: "restaurant", phone: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    const plan = params.get("plan");
    if (plan) localStorage.setItem("pendingPlan", plan);
  }, [params]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: form.full_name, business_name: form.business_name, business_type: form.business_type, phone: form.phone },
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    // Auto-confirmed: session exists -> straight to checkout. Otherwise -> verify email.
    if (data.session) {
      toast.success("Welcome to Palm Hospitality");
      navigate("/dashboard");
    } else {
      toast.success("Account created — check your email to verify, then log in to start your 10-day free trial.");
      navigate("/login");
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex bg-hero relative overflow-hidden p-12 flex-col justify-between">
        <Logo variant="light" />
        <div>
          <h2 className="font-display text-4xl font-bold text-background leading-tight max-w-md">Start in minutes. Stop password sharing today.</h2>
          <ul className="mt-6 space-y-2 text-background/80 text-sm">
            <li>✓ Free for your first 10 days</li>
            <li>✓ Unlimited vouchers during trial</li>
            <li>✓ MikroTik RouterOS v7 ready</li>
          </ul>
        </div>
        <p className="text-background/50 text-xs">© Palm Connect</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8 bg-card-grad shadow-card">
          <div className="lg:hidden mb-6"><Logo /></div>
          <h1 className="font-display text-2xl font-bold text-foreground">Create your business</h1>
          <p className="text-sm text-muted-foreground mt-1">You'll be the Business Owner.</p>
          <div className="mt-6"><GoogleButton label="Sign up with Google" /></div>
          <p className="mt-2 text-center text-xs text-muted-foreground">You'll add your business details on the next step.</p>
          <OrDivider />
          <form onSubmit={onSubmit} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Your name</Label><Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} required /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+254..." /></div>
            </div>
            <div className="space-y-1.5"><Label>Business name</Label><Input value={form.business_name} onChange={(e) => set("business_name", e.target.value)} required /></div>
            <div className="space-y-1.5">
              <Label>Business type</Label>
              <Select value={form.business_type} onValueChange={(v) => set("business_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{types.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required /></div>
            <div className="space-y-1.5"><Label htmlFor="reg-password">Password</Label><PasswordInput id="reg-password" autoComplete="new-password" value={form.password} onChange={(e) => set("password", e.target.value)} required minLength={8}/></div>
            <Button type="submit" className="w-full" variant="hero" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : "Create account"}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground text-center mt-5">
            Already have an account? <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
