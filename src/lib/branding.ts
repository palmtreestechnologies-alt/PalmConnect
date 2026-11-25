// Turns a business's brand colours into theme variables, with readable text and sane dark-mode colours.

export const HEX = /^#[0-9A-Fa-f]{6}$/;

export type Brand = { primary: string | null; accent: string | null };

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHsl([r, g, b]: [number, number, number]): [number, number, number] {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B), d = max - min;
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === R) h = ((G - B) / d) % 6;
    else if (max === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  return [h, Math.round(s * 100), Math.round(l * 100)];
}

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const f = (c: number) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Dark text on light colours, light text on dark ones: whichever reads better. */
export function readableOn(hex: string): "dark" | "light" {
  return contrast(hex, "#FFFFFF") >= contrast(hex, "#0B1F17") ? "light" : "dark";
}

const hsl = (h: number, s: number, l: number) => `${h} ${s}% ${l}%`;

/** CSS variables to set on the root element. Empty object when no valid colour is given. */
export function brandVars(brand: Brand, dark: boolean): Record<string, string> {
  const vars: Record<string, string> = {};

  if (brand.primary && HEX.test(brand.primary)) {
    let [h, s, l] = rgbToHsl(hexToRgb(brand.primary));
    if (dark && l < 45) l = 55; // keep it visible on the dark background
    const glow = hsl(h, s, Math.min(l + 12, 70));
    vars["--primary"] = hsl(h, s, l);
    vars["--primary-glow"] = glow;
    vars["--primary-foreground"] = l > 58 ? "160 40% 8%" : "0 0% 100%";
    vars["--gradient-emerald"] = `linear-gradient(135deg, hsl(${hsl(h, s, Math.max(l - 8, 6))}), hsl(${glow}))`;
    vars["--gradient-hero"] = `linear-gradient(135deg, hsl(${hsl(h, Math.min(s, 60), 6)}) 0%, hsl(${hsl(h, Math.min(s, 55), 12)}) 55%, hsl(${hsl(h, Math.min(s, 50), 20)}) 100%)`;
    vars["--shadow-elegant"] = `0 20px 60px -20px hsl(${hsl(h, s, Math.min(l, 25))} / 0.30)`;
    vars["--sidebar-background"] = hsl(h, Math.min(s, 55), dark ? 6 : 7);
    vars["--sidebar-accent"] = hsl(h, Math.min(s, 40), 13);
    vars["--sidebar-border"] = hsl(h, Math.min(s, 30), 16);
  }

  if (brand.accent && HEX.test(brand.accent)) {
    const [h, s, l0] = rgbToHsl(hexToRgb(brand.accent));
    const l = dark && l0 < 45 ? 55 : l0;
    const light = hsl(h, s, Math.min(l + 10, 75));
    vars["--secondary"] = hsl(h, s, l);
    vars["--accent"] = hsl(h, s, l);
    vars["--secondary-foreground"] = l > 58 ? "160 40% 8%" : "0 0% 100%";
    vars["--accent-foreground"] = vars["--secondary-foreground"];
    vars["--ring"] = hsl(h, s, l);
    vars["--gradient-gold"] = `linear-gradient(135deg, hsl(${hsl(h, s, l)}), hsl(${light}))`;
    vars["--shadow-gold"] = `0 10px 40px -10px hsl(${hsl(h, s, l)} / 0.45)`;
    vars["--sidebar-primary"] = hsl(h, s, l);
    vars["--sidebar-primary-foreground"] = vars["--secondary-foreground"];
    vars["--sidebar-ring"] = hsl(h, s, l);
  }
  return vars;
}

const APPLIED = new Set<string>();

export function applyBrand(brand: Brand, dark: boolean) {
  clearBrand();
  const root = document.documentElement;
  for (const [k, v] of Object.entries(brandVars(brand, dark))) {
    root.style.setProperty(k, v);
    APPLIED.add(k);
  }
}

export function clearBrand() {
  const root = document.documentElement;
  APPLIED.forEach((k) => root.style.removeProperty(k));
  APPLIED.clear();
}

/** Starting points that are already tested for readable text. */
export const PRESETS: { name: string; primary: string; accent: string }[] = [
  { name: "Palm Connect", primary: "#061650", accent: "#E4B24A" },
  { name: "Ocean", primary: "#0B4F6C", accent: "#F2A541" },
  { name: "Sunset", primary: "#7A2E1D", accent: "#F4B942" },
  { name: "Berry", primary: "#5B2A5E", accent: "#F28DB2" },
  { name: "Slate", primary: "#1F2A37", accent: "#38BDF8" },
  { name: "Savanna", primary: "#3F5A1E", accent: "#E9C46A" },
];
