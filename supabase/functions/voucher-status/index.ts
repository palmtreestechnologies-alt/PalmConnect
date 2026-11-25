// Public voucher status lookup. No JWT — uses service role to bypass RLS
// and only returns non-sensitive fields needed for the self-care page.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { username, password } = await req.json();
    if (!username || !password || typeof username !== "string" || typeof password !== "string") {
      return new Response(JSON.stringify({ error: "username and password required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Try voucher first
    const { data: voucher } = await supabase
      .from("vouchers")
      .select("status, expires_at, used_at, business_id, packages(name, duration_minutes, data_limit_mb)")
      .eq("username", username.trim())
      .eq("password", password.trim())
      .maybeSingle();

    let business_id: string | null = null;
    let result: any = null;

    if (voucher) {
      business_id = voucher.business_id;
      const expiresAt = voucher.expires_at ? new Date(voucher.expires_at) : null;
      const expired = expiresAt ? expiresAt.getTime() < Date.now() : false;
      const remaining = expiresAt ? Math.max(0, expiresAt.getTime() - Date.now()) : null;
      result = {
        type: "voucher",
        status: expired ? "expired" : voucher.status,
        package: voucher.packages?.name ?? null,
        data_limit_mb: voucher.packages?.data_limit_mb ?? null,
        expires_at: voucher.expires_at,
        used_at: voucher.used_at,
        remaining_ms: remaining,
      };
    } else {
      const { data: hsUser } = await supabase
        .from("hotspot_users")
        .select("enabled, expires_at, business_id, packages(name, duration_minutes, data_limit_mb)")
        .eq("username", username.trim())
        .eq("password", password.trim())
        .maybeSingle();
      if (hsUser) {
        business_id = hsUser.business_id;
        const expiresAt = hsUser.expires_at ? new Date(hsUser.expires_at) : null;
        const expired = expiresAt ? expiresAt.getTime() < Date.now() : false;
        const remaining = expiresAt ? Math.max(0, expiresAt.getTime() - Date.now()) : null;
        result = {
          type: "user",
          status: !hsUser.enabled ? "disabled" : expired ? "expired" : "active",
          package: hsUser.packages?.name ?? null,
          data_limit_mb: hsUser.packages?.data_limit_mb ?? null,
          expires_at: hsUser.expires_at,
          remaining_ms: remaining,
        };
      }
    }

    if (!result) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let business: any = null;
    if (business_id) {
      const { data: biz } = await supabase
        .from("businesses")
        .select("name, logo_url, primary_color, redirect_url_after_purchase, support_phone, support_email")
        .eq("id", business_id)
        .maybeSingle();
      business = biz;
    }

    return new Response(JSON.stringify({ ...result, business }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
