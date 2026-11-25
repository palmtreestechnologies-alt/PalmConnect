import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import { z } from "zod";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z.string().trim().email("Enter a valid email address").max(255).safeParse(email);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, { redirectTo: `${window.location.origin}/reset-password` });
    setLoading(false);
    // Same message whether or not the account exists, so the form can't be used to check who has an account.
    if (error && error.status !== 400) { toast.error("We couldn't send the email right now. Please try again in a few minutes."); return; }
    setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md bg-card-grad p-8 shadow-card">
        <div className="mb-6"><Logo /></div>
        {sent ? (
          <div className="space-y-4 text-center">
            <MailCheck className="mx-auto h-10 w-10 text-primary" />
            <h1 className="font-display text-2xl font-bold">Check your email</h1>
            <p className="text-sm text-muted-foreground">If an account exists for <span className="font-medium text-foreground">{email.trim()}</span>, we've sent a link to reset your password. It can take a minute, and may land in spam.</p>
            <Button asChild variant="outline" className="w-full"><Link to="/login">Back to sign in</Link></Button>
          </div>
        ) : (
          <>
            <h1 className="font-display text-2xl font-bold">Reset your password</h1>
            <p className="mt-1 text-sm text-muted-foreground">Enter your email and we'll send you a link to choose a new password.</p>
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fp-email">Email</Label>
                <Input id="fp-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <Button type="submit" variant="hero" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Remembered it? <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
