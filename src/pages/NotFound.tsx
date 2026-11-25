import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFound = () => (
  <div className="min-h-screen grid place-items-center bg-background p-6">
    <div className="text-center max-w-md">
      <p className="font-display text-6xl font-bold text-primary">404</p>
      <h1 className="font-display text-2xl font-semibold mt-4">Page not found</h1>
      <p className="text-muted-foreground mt-2">The page you're looking for doesn't exist.</p>
      <Button asChild variant="hero" className="mt-6"><Link to="/">Back home</Link></Button>
    </div>
  </div>
);

export default NotFound;
