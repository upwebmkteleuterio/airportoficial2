import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const functionName = "document-access";
const grantLifetimeSeconds = 300;
const allowedTargetRoles = new Set(["ALUNO", "INSTRUTOR", "COORDENADOR"]);
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Não autorizado" }, 401);

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
    if (callerError || !callerData.user?.email) return json({ error: "Sessão inválida" }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: callerProfile, error: callerProfileError } = await adminClient
      .from("profiles")
      .select("legacy_id, role")
      .eq("id", callerData.user.id)
      .maybeSingle();
    if (callerProfileError || !callerProfile || !["GESTOR", "EQUIPE"].includes(callerProfile.role)) {
      return json({ error: "Permissão insuficiente" }, 403);
    }

    const body = await req.json() as Record<string, unknown>;
    const targetId = typeof body.target_user_id === "string" ? body.target_user_id.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!targetId || !password) return json({ error: "Dados de acesso inválidos" }, 400);

    const { data: person, error: personError } = await adminClient
      .from("pessoas")
      .select("id, profile_legacy_id, papel, ativo")
      .eq("id", targetId)
      .maybeSingle();
    if (personError) throw personError;

    let targetPersonId = person?.id ?? null;
    let targetProfileLegacyId = person?.profile_legacy_id ?? null;
    let targetRole = person?.papel ?? null;
    if (!person) {
      const { data: legacyProfile, error: legacyError } = await adminClient
        .from("profiles")
        .select("legacy_id, role, status")
        .eq("legacy_id", targetId)
        .maybeSingle();
      if (legacyError || !legacyProfile) return json({ error: "Usuário documental não encontrado" }, 404);
      targetProfileLegacyId = legacyProfile.legacy_id;
      targetRole = legacyProfile.role;
    }
    if (!targetRole || !allowedTargetRoles.has(targetRole) || person?.ativo === false) {
      return json({ error: "Usuário documental não encontrado" }, 404);
    }

    const verificationClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: passwordError } = await verificationClient.auth.signInWithPassword({
      email: callerData.user.email,
      password,
    });
    if (passwordError) return json({ error: "Senha inválida" }, 401);

    const expiresAt = new Date(Date.now() + grantLifetimeSeconds * 1000).toISOString();
    const { data: grant, error: grantError } = await adminClient
      .from("document_access_grants")
      .insert({
        operator_id: callerProfile.legacy_id,
        target_person_id: targetPersonId,
        target_user_id: targetProfileLegacyId,
        expires_at: expiresAt,
      })
      .select("id, target_person_id, target_user_id, expires_at")
      .single();
    if (grantError || !grant) throw grantError ?? new Error("Não foi possível criar a autorização temporária");

    console.info(`[${functionName}] acesso documental autorizado`, {
      operatorId: callerProfile.legacy_id,
      targetPersonId,
      expiresAt,
    });
    return json({ grant });
  } catch (error) {
    console.error(`[${functionName}] falha ao autorizar acesso`, {
      message: error instanceof Error ? error.message : "erro desconhecido",
    });
    return json({ error: "Não foi possível autorizar o acesso documental" }, 500);
  }
});
