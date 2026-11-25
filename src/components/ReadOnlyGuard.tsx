import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";

// When trial has expired, intercept clicks/submits on buttons and inputs in <main>
// except those marked data-allow-readonly. Read-only views (tables, links) stay usable.
export function ReadOnlyGuard() {
  const { isReadOnly } = useSubscription();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isReadOnly) return;
    function blockedTarget(t: EventTarget | null): HTMLElement | null {
      if (!(t instanceof HTMLElement)) return null;
      const el = t.closest<HTMLElement>(
        "button, [role=button], input:not([type=search]):not([type=hidden]), textarea, select, a[href*='?']"
      );
      if (!el) return null;
      if (el.closest("[data-allow-readonly]")) return null;
      // allow nav links, sidebar, dropdowns, theme toggle, signout, banner button
      if (el.closest("aside, header, [data-sidebar], [role=menu], [role=dialog] [data-dismiss]")) return null;
      // allow plain anchor links without forms
      if (el.tagName === "A") return null;
      // only restrict elements inside <main>
      if (!el.closest("main")) return null;
      return el;
    }
    function handler(ev: Event) {
      const el = blockedTarget(ev.target);
      if (!el) return;
      // Allow buttons that only select tabs (radix tabs)
      if (el.getAttribute("role") === "tab") return;
      ev.preventDefault();
      ev.stopPropagation();
      toast.error("Your free trial has ended", {
        description: "Subscribe to resume creating and editing records.",
        action: { label: "Subscribe", onClick: () => navigate("/checkout") },
      });
    }
    document.addEventListener("click", handler, true);
    document.addEventListener("submit", handler, true);
    return () => {
      document.removeEventListener("click", handler, true);
      document.removeEventListener("submit", handler, true);
    };
  }, [isReadOnly, navigate]);

  return null;
}
