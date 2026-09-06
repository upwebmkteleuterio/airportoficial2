import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const functionName = "document-access";
const grantLifetimeSeconds = 300;
const allowedTargetRoles = new Set(["ALUNO", "INSTRUTOR", "COORDENADOR"]);
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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
    if (callerError || !callerData.user?.email) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: callerProfile, error: callerProfileError } = await adminClient
      .from("profiles")
      .select("legacy_id, role")
      .eq("id", callerData.user.id)
      .maybeSingle();
    if (callerProfileError || !callerProfile || !["GESTOR", "EQUIPE"].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: "Permissão insuficiente" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json() as Record<string, unknown>;
    const targetUserId = typeof body.target_user_id === "string" ? body.target_user_id.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!targetUserId || !password) {
      return new Response(JSON.stringify({ error: "Dados de acesso inválidos" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: targetProfile, error: targetError } = await adminClient
      .from("profiles")
      .select("legacy_id, nome_completo, role")
      .eq("legacy_id", targetUserId)
      .maybeSingle();
    if (targetError || !targetProfile || !allowedTargetRoles.has(targetProfile.role)) {
      return new Response(JSON.stringify({ error: "Usuário documental não encontrado" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const verificationClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: passwordError } = await verificationClient.auth.signInWithPassword({
      email: callerData.user.email,
      password,
    });
    if (passwordError) {
      return new Response(JSON.stringify({ error: "Senha inválida" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const expiresAt = new Date(Date.now() + grantLifetimeSeconds * 1000).toISOString();
    const { data: grant, error: grantError } = await adminClient
      .from("document_access_grants")
      .insert({
        operator_id: callerProfile.legacy_id,
        target_user_id: targetProfile.legacy_id,
        expires_at: expiresAt,
      })
      .select("id, target_user_id, expires_at")
      .single();
    if (grantError || !grant) throw grantError ?? new Error("Não foi possível criar a autorização temporária");

    console.info(`[${functionName}] acesso documental autorizado`, {
      operatorId: callerProfile.legacy_id,
      targetUserId: targetProfile.legacy_id,
      expiresAt,
    });
    return new Response(JSON.stringify({ grant }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error(`[${functionName}] falha ao autorizar acesso`, {
      message: error instanceof Error ? error.message : "erro desconhecido",
    });
    return new Response(JSON.stringify({ error: "Não foi possível autorizar o acesso documental" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
