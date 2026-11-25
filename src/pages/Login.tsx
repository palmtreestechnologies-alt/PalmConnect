import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { GoogleButton, OrDivider } from "@/components/auth/GoogleButton";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";

const schema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "At least 6 characters").max(72),
});

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Welcome back");
    const pending = localStorage.getItem("pendingPlan");
    if (pending) {
      localStorage.removeItem("pendingPlan");
      navigate(`/checkout?plan=${encodeURIComponent(pending)}`);
    } else {
      navigate("/dashboard");
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex bg-hero relative overflow-hidden p-12 flex-col justify-between">
        <Logo variant="light" />
        <div>
          <h2 className="font-display text-4xl font-bold text-background leading-tight max-w-md">Manage every guest, every device, every voucher — from one dashboard.</h2>
          <p className="text-background/70 mt-4 max-w-md">Built for MikroTik. Trusted by restaurants, hotels and villas.</p>
        </div>
        <p className="text-background/50 text-xs">© Palm Connect</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8 bg-card-grad shadow-card">
          <div className="lg:hidden mb-6"><Logo /></div>
          <h1 className="font-display text-2xl font-bold text-foreground">Sign in</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back to Palm Connect.</p>
          <div className="mt-6"><GoogleButton /></div>
          <OrDivider />
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">Forgot password?</Link>
              </div>
              <PasswordInput id="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" variant="hero" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : "Sign in"}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground text-center mt-6">
            New here? <Link to="/register" className="text-primary font-semibold hover:underline">Create a business account</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
