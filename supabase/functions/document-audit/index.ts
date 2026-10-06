import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const functionName = "document-audit";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const allowedActions = new Set(["PASTA_ABERTA", "FOTO_VISUALIZADA", "DOCUMENTO_VISUALIZADO", "DOCUMENTO_BAIXADO", "DOCUMENTO_ABERTO_NOVA_ABA"]);
const documentActions = new Set(["DOCUMENTO_VISUALIZADO", "DOCUMENTO_BAIXADO", "DOCUMENTO_ABERTO_NOVA_ABA"]);
const allowedTargetRoles = new Set(["ALUNO", "INSTRUTOR", "COORDENADOR"]);

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function requestIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  const candidate = forwarded || realIp;
  if (!candidate || candidate.length > 45 || !/^[0-9a-fA-F:.]+$/.test(candidate)) return null;
  return candidate;
}

async function sha256Hex(payload: Record<string, unknown>) {
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return response({ error: "Não autorizado" }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error("Configuração segura ausente");

    const token = authorization.replace("Bearer ", "");
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: callerData, error: callerError } = await callerClient.auth.getUser(token);
    if (callerError || !callerData.user) return response({ error: "Sessão inválida" }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: operator, error: operatorError } = await adminClient
      .from("profiles")
      .select("legacy_id, role, nome_completo")
      .eq("id", callerData.user.id)
      .maybeSingle();
    if (operatorError || !operator || !["GESTOR", "EQUIPE"].includes(operator.role)) return response({ error: "Permissão insuficiente" }, 403);

    const body = await req.json() as Record<string, unknown>;
    const action = typeof body.acao === "string" ? body.acao.trim() : "";
    const targetId = typeof body.alvo_id === "string" ? body.alvo_id.trim() : "";
    const documentoId = typeof body.documento_id === "string" ? body.documento_id.trim() : "";
    const grantId = typeof body.grant_id === "string" ? body.grant_id.trim() : "";
    if (!allowedActions.has(action) || !targetId || !grantId) return response({ error: "Evento de auditoria inválido" }, 400);
    if (documentActions.has(action) !== Boolean(documentoId)) return response({ error: "Evento inconsistente com o documento informado" }, 400);

    const { data: person, error: personError } = await adminClient
      .from("pessoas")
      .select("id, profile_legacy_id, papel, ativo")
      .eq("id", targetId)
      .maybeSingle();
    if (personError) throw personError;

    let targetPersonId = person?.id ?? targetId;
    let targetProfileLegacyId = person?.profile_legacy_id ?? null;
    let targetRole = person?.papel ?? null;
    if (!person) {
      const { data: legacyProfile, error: legacyError } = await adminClient
        .from("profiles")
        .select("legacy_id, role")
        .eq("legacy_id", targetId)
        .maybeSingle();
      if (legacyError || !legacyProfile) return response({ error: "Usuário-alvo não encontrado" }, 404);
      targetPersonId = legacyProfile.legacy_id;
      targetProfileLegacyId = legacyProfile.legacy_id;
      targetRole = legacyProfile.role;
    }
    if (!targetRole || !allowedTargetRoles.has(targetRole) || person?.ativo === false) return response({ error: "Usuário-alvo não encontrado" }, 404);

    const { data: grant, error: grantError } = await adminClient
      .from("document_access_grants")
      .select("id, operator_id, target_person_id, target_user_id, turma_id, expires_at")
      .eq("id", grantId)
      .maybeSingle();
    if (grantError || !grant) return response({ error: "Autorização de acesso não encontrada" }, 403);
    const grantMatchesTarget = grant.target_person_id
      ? grant.target_person_id === targetPersonId && (!grant.target_user_id || grant.target_user_id === targetProfileLegacyId)
      : Boolean(targetProfileLegacyId) && grant.target_user_id === targetProfileLegacyId;
    if (grant.operator_id !== operator.legacy_id || !grantMatchesTarget) {
      return response({ error: "Autorização de acesso não pertence a este operador" }, 403);
    }
    if (new Date(grant.expires_at).getTime() <= Date.now()) return response({ error: "Autorização de acesso expirada" }, 403);

    let documentRow: { id: string; pessoa_id: string | null; usuario_id: string | null; turma_id: string | null; tipo_documento: string; hash_sha256: string; versao: number; arquivo_nome: string } | null = null;
    if (documentActions.has(action)) {
      const { data: fetchedDocument, error: documentError } = await adminClient
        .from("documentos")
        .select("id, pessoa_id, usuario_id, turma_id, tipo_documento, hash_sha256, versao, arquivo_nome")
        .eq("id", documentoId)
        .maybeSingle();
      if (documentError || !fetchedDocument) return response({ error: "Documento não encontrado" }, 404);
      if (fetchedDocument.pessoa_id !== targetPersonId && fetchedDocument.usuario_id !== targetProfileLegacyId) return response({ error: "Documento não pertence ao usuário-alvo" }, 403);
      if (grant.turma_id && fetchedDocument.turma_id !== grant.turma_id) return response({ error: "Documento não pertence à turma autorizada" }, 403);
      documentRow = fetchedDocument;
    }

    const timestamp = new Date().toISOString();
    const ip = requestIp(req);
    const documentTipo = action === "FOTO_VISUALIZADA" ? "foto" : documentRow?.tipo_documento ?? null;
    const auditPayload = {
      operador_id: operator.legacy_id,
      alvo_id: targetPersonId,
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
        registro_id: documentRow?.id ?? targetPersonId,
        alvo_id: targetProfileLegacyId,
        alvo_pessoa_id: targetPersonId,
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

    console.info(`[${functionName}] evento registrado`, { acao: action, operadorId: operator.legacy_id, alvoPessoaId: targetPersonId, documentoId: documentRow?.id ?? null });
    return response({ log });
  } catch (error) {
    console.error(`[${functionName}] falha ao registrar evento`, { error: error instanceof Error ? error.message : "erro desconhecido" });
    return response({ error: "Não foi possível registrar o evento de auditoria" }, 500);
  }
});
