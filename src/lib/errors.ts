import { toast } from "@/hooks/use-toast";

export class AppError extends Error {
  code: string;
  cause?: unknown;
  constructor(message: string, code = "app_error", cause?: unknown) {
    super(message);
    this.code = code;
    this.cause = cause;
  }
}

export function reportError(err: unknown, fallback = "Something went wrong") {
  const message = err instanceof Error ? err.message : fallback;
  toast({ title: "Error", description: message, variant: "destructive" });
  if (import.meta.env.DEV) console.error("[palm]", err);
}
