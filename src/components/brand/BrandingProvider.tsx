import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { applyBrand, clearBrand, HEX } from "@/lib/branding";

export const BRANDING_EVENT = "palm-branding-changed";

type BrandInfo = { name: string | null; logoUrl: string | null; primary: string | null; accent: string | null };
const EMPTY: BrandInfo = { name: null, logoUrl: null, primary: null, accent: null };
const Ctx = createContext<BrandInfo>(EMPTY);
export const useBrand = () => useContext(Ctx);

/** Loads the signed-in business's branding and applies its colours inside the dashboard only. */
export function BrandingProvider({ children }: { children: ReactNode }) {
  const { businessId } = useAuth();
  const { pathname } = useLocation();
  const [brand, setBrand] = useState<BrandInfo>(EMPTY);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const inDashboard = pathname.startsWith("/dashboard");

  useEffect(() => {
    if (!businessId) { setBrand(EMPTY); return; }
    let live = true;
    const load = async () => {
      const { data } = await supabase.from("businesses").select("name, logo_url, primary_color, accent_color").eq("id", businessId).maybeSingle();
      if (!live) return;
      setBrand({
        name: data?.name ?? null,
        logoUrl: data?.logo_url ?? null,
        primary: data?.primary_color && HEX.test(data.primary_color) ? data.primary_color : null,
        accent: data?.accent_color && HEX.test(data.accent_color) ? data.accent_color : null,
      });
    };
    load();
    window.addEventListener(BRANDING_EVENT, load);
    return () => { live = false; window.removeEventListener(BRANDING_EVENT, load); };
  }, [businessId]);

  // Follow light/dark switches.
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setDark(el.classList.contains("dark")));
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (inDashboard && (brand.primary || brand.accent)) applyBrand(brand, dark);
    else clearBrand();
  }, [brand, dark, inDashboard]);
  useEffect(() => clearBrand, []);

  return <Ctx.Provider value={brand}>{children}</Ctx.Provider>;
}
