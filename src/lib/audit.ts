import { supabase } from "@/integrations/supabase/client";

export async function logAudit(params: {
  action: string;
  resourceType?: string;
  resourceId?: string;
  organizationId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("audit_events").insert({
    actor_id: user.id,
    action: params.action,
    resource_type: params.resourceType ?? null,
    resource_id: params.resourceId ?? null,
    organization_id: params.organizationId ?? null,
    metadata: (params.metadata as any) ?? {},
  });
}
