import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const functionName = "audit-log";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const maxTextLength = 5000;

function textValue(value: unknown, required = false) {
  if (typeof value !== "string") {
    if (required) throw new Error("Campo obrigatório inválido");
    return undefined;
  }
  const valueTrimmed = value.trim();
  if (required && !valueTrimmed) throw new Error("Campo obrigatório ausente");
  return valueTrimmed.slice(0, maxTextLength);
}

function requestIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  const candidate = forwarded || realIp;
  if (!candidate || candidate.length > 45) return null;
  if (!/^[0-9a-fA-F:.]+$/.test(candidate)) return null;
  return candidate;
}

async function hashPayload(payload: Record<string, unknown>) {
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error("Configuração segura ausente");

    const token = authorization.replace("Bearer ", "");
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: callerData, error: callerError } = await callerClient.auth.getUser(token);
    if (callerError || !callerData.user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: callerProfile, error: profileError } = await adminClient
      .from("profiles")
      .select("legacy_id, role")
      .eq("id", callerData.user.id)
      .maybeSingle();
    if (profileError || !callerProfile || !["GESTOR", "EQUIPE"].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: "Permissão insuficiente" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json() as Record<string, unknown>;
    const action = textValue(body.acao, true);
    const table = textValue(body.tabela_afetada, true);
    const recordId = textValue(body.registro_id, true);
    const documentId = textValue(body.documento_id);
    const documentHash = textValue(body.documento_hash);
    const reason = textValue(body.motivo);
    const version = typeof body.versao === "number" && Number.isInteger(body.versao) && body.versao > 0
      ? body.versao
      : undefined;

    const auditPayload = {
      actor: callerProfile.legacy_id,
      action,
      table,
      recordId,
      documentId,
      documentHash,
      reason,
      version,
      ip: requestIp(req),
      timestamp: new Date().toISOString(),
    };
    const hash = await hashPayload(auditPayload);
    const actionDetails = [
      action,
      reason ? `Motivo: ${reason}` : "",
      documentHash ? `Hash: ${documentHash}` : "",
      typeof version === "number" ? `Versão: ${version}` : "",
    ].filter(Boolean).join(" | ");

    const { data: log, error: insertError } = await adminClient
      .from("auditoria_logs")
      .insert({
        usuario_id: callerProfile.legacy_id,
        acao: actionDetails,
        tabela_afetada: table,
        registro_id: documentId || recordId,
        ip_address: auditPayload.ip,
        data_hora: auditPayload.timestamp,
        hash_sha256: hash,
      })
      .select()
      .single();
    if (insertError) throw insertError;

    console.info(`[${functionName}] log registrado`, { recordId, table });
    return new Response(JSON.stringify({ log }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[${functionName}] falha ao registrar log`, {
      error: error instanceof Error ? error.message : "erro desconhecido",
    });
    return new Response(JSON.stringify({ error: "Não foi possível registrar a auditoria" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
