import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  // The emailed link signs the visitor in with a short-lived recovery session; without one the link is expired or already used.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) setReady("ok");
    });
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      setReady(data.session ? "ok" : "invalid");
    }, 1500);
    return () => { sub.subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { toast.error("Use at least 8 characters."); return; }
    if (password !== confirm) { toast.error("The two passwords don't match."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated");
    navigate("/dashboard", { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md bg-card-grad p-8 shadow-card">
        <div className="mb-6"><Logo /></div>
        {ready === "checking" && <div className="grid place-items-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
        {ready === "invalid" && (
          <div className="space-y-4 text-center">
            <h1 className="font-display text-2xl font-bold">This link has expired</h1>
            <p className="text-sm text-muted-foreground">Reset links work once and expire quickly. Request a new one and use it straight away.</p>
            <Button asChild variant="hero" className="w-full"><Link to="/forgot-password">Get a new link</Link></Button>
          </div>
        )}
        {ready === "ok" && (
          <>
            <h1 className="font-display text-2xl font-bold">Choose a new password</h1>
            <p className="mt-1 text-sm text-muted-foreground">Use at least 8 characters.</p>
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div className="space-y-1.5"><Label htmlFor="np">New password</Label><PasswordInput id="np" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /></div>
              <div className="space-y-1.5"><Label htmlFor="np2">Confirm new password</Label><PasswordInput id="np2" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} /></div>
              <Button type="submit" variant="hero" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
