import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const functionName = "document-audit";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Eventos documentais auditáveis. O código da ação é fixo e validado no servidor.
const allowedActions = new Set([
  "PASTA_ABERTA",
  "FOTO_VISUALIZADA",
  "DOCUMENTO_VISUALIZADO",
  "DOCUMENTO_BAIXADO",
  "DOCUMENTO_ABERTO_NOVA_ABA",
]);
const documentActions = new Set(["DOCUMENTO_VISUALIZADO", "DOCUMENTO_BAIXADO", "DOCUMENTO_ABERTO_NOVA_ABA"]);
const allowedTargetRoles = new Set(["ALUNO", "INSTRUTOR", "COORDENADOR"]);

function requestIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  const candidate = forwarded || realIp;
  if (!candidate || candidate.length > 45) return null;
  if (!/^[0-9a-fA-F:.]+$/.test(candidate)) return null;
  return candidate;
}

async function sha256Hex(payload: Record<string, unknown>) {
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

    // Operador sempre derivado do JWT no servidor; nunca informado pelo navegador.
    const token = authorization.replace("Bearer ", "");
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
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
    const { data: operator, error: operatorError } = await adminClient
      .from("profiles")
      .select("legacy_id, role, nome_completo")
      .eq("id", callerData.user.id)
      .maybeSingle();
    if (operatorError || !operator || !["GESTOR", "EQUIPE"].includes(operator.role)) {
      return new Response(JSON.stringify({ error: "Permissão insuficiente" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json() as Record<string, unknown>;
    const action = typeof body.acao === "string" ? body.acao.trim() : "";
    const targetUserId = typeof body.alvo_id === "string" ? body.alvo_id.trim() : "";
    const documentoId = typeof body.documento_id === "string" ? body.documento_id.trim() : "";
    const grantId = typeof body.grant_id === "string" ? body.grant_id.trim() : "";

    if (!allowedActions.has(action) || !targetUserId || !grantId) {
      return new Response(JSON.stringify({ error: "Evento de auditoria inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (documentActions.has(action) !== Boolean(documentoId)) {
      return new Response(JSON.stringify({ error: "Evento inconsistente com o documento informado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Usuário-alvo validado no servidor (aluno/instrutor/coordenador real).
    const { data: target, error: targetError } = await adminClient
      .from("profiles")
      .select("legacy_id, role, nome_completo")
      .eq("legacy_id", targetUserId)
      .maybeSingle();
    if (targetError || !target || !allowedTargetRoles.has(target.role)) {
      return new Response(JSON.stringify({ error: "Usuário-alvo não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // A autorização temporária deve existir, pertencer ao operador, casar com o
    // alvo e estar dentro da validade — amarrando o evento à reautenticação.
    const { data: grant, error: grantError } = await adminClient
      .from("document_access_grants")
      .select("id, operator_id, target_user_id, expires_at")
      .eq("id", grantId)
      .maybeSingle();
    if (grantError || !grant) {
      return new Response(JSON.stringify({ error: "Autorização de acesso não encontrada" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (grant.operator_id !== operator.legacy_id || grant.target_user_id !== target.legacy_id) {
      return new Response(JSON.stringify({ error: "Autorização de acesso não pertence a este operador" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (new Date(grant.expires_at).getTime() <= Date.now()) {
      return new Response(JSON.stringify({ error: "Autorização de acesso expirada" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Hash e versão SEMPRE lidos do banco pelo servidor; o navegador não fornece.
    let documentRow: { id: string; usuario_id: string; tipo_documento: string; hash_sha256: string; versao: number; arquivo_nome: string } | null = null;
    if (documentActions.has(action)) {
      const { data: fetchedDocument, error: documentError } = await adminClient
        .from("documentos")
        .select("id, usuario_id, tipo_documento, hash_sha256, versao, arquivo_nome")
        .eq("id", documentoId)
        .maybeSingle();
      if (documentError || !fetchedDocument) {
        return new Response(JSON.stringify({ error: "Documento não encontrado" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (fetchedDocument.usuario_id !== target.legacy_id) {
        return new Response(JSON.stringify({ error: "Documento não pertence ao usuário-alvo" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      documentRow = fetchedDocument;
    }

    const timestamp = new Date().toISOString();
    const ip = requestIp(req);
    const documentTipo = action === "FOTO_VISUALIZADA" ? "foto" : documentRow?.tipo_documento ?? null;

    const auditPayload = {
      operador_id: operator.legacy_id,
      alvo_id: target.legacy_id,
      acao: action,
      documento_id: documentRow?.id ?? null,
      documento_tipo: documentTipo,
      documento_hash: documentRow?.hash_sha256 ?? null,
      versao: documentRow?.versao ?? null,
      autorizacao_id: grant.id,
      ip,
      data_hora: timestamp,
    };
    const auditHash = await sha256Hex(auditPayload);

    const { data: log, error: insertError } = await adminClient
      .from("auditoria_logs")
      .insert({
        id: `audit-${crypto.randomUUID()}`,
        usuario_id: operator.legacy_id,
        acao: action,
        tabela_afetada: "documentos",
        registro_id: documentRow?.id ?? target.legacy_id,
        alvo_id: target.legacy_id,
        documento_id: documentRow?.id ?? null,
        documento_tipo: documentTipo,
        documento_hash: documentRow?.hash_sha256 ?? null,
        versao: documentRow?.versao ?? null,
        autorizacao_id: grant.id,
        ip_address: ip,
        data_hora: timestamp,
        hash_sha256: auditHash,
      })
      .select()
      .single();
    if (insertError) throw insertError;

    console.info(`[${functionName}] evento registrado`, {
      acao: action,
      operadorId: operator.legacy_id,
      alvoId: target.legacy_id,
      documentoId: documentRow?.id ?? null,
    });
    return new Response(JSON.stringify({ log }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[${functionName}] falha ao registrar evento`, {
      error: error instanceof Error ? error.message : "erro desconhecido",
    });
    return new Response(JSON.stringify({ error: "Não foi possível registrar o evento de auditoria" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
