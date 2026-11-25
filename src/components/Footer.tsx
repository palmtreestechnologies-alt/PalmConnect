import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/40 py-4 px-6 mt-auto">
      <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="hover:text-foreground transition-colors">
            Documentation
          </Link>
          <a
            href="https://wa.me/254000000000"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground transition-colors"
          >
            WhatsApp Support
          </a>
          <Link to="/dashboard/settings" className="hover:text-foreground transition-colors">
            Legal
          </Link>
        </div>
        <p>© {new Date().getFullYear()} Palm Connect. Smart Wi-Fi. Better Business.</p>
      </div>
    </footer>
  );
}
