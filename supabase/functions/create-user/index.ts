import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const functionName = "create-user";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const creatableRoles = new Set(["ALUNO", "INSTRUTOR", "COORDENADOR"]);
const allowedOrigins = new Set(["interno", "b2b", "migracao"]);
const allowedStatuses = new Set(["pendente", "ativo", "recusado"]);

const isStrongPassword = (password: string) =>
  password.length >= 8 &&
  /[a-z]/.test(password) &&
  /[A-Z]/.test(password) &&
  /\d/.test(password) &&
  /[^A-Za-z0-9]/.test(password);

const optionalText = (value: unknown) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
};

const normalizeCpf = (value: unknown) => optionalText(value)?.replace(/\D/g, '').slice(0, 11) || null;

const normalizeOptionalDate = (value: unknown): string | null => {
  const normalized = optionalText(value);
  if (!normalized) return null;

  const datePart = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(normalized);
  if (!datePart) return null;

  const [, year, month, day] = datePart;
  const calendarDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const isValidDate = calendarDate.getUTCFullYear() === Number(year) &&
    calendarDate.getUTCMonth() === Number(month) - 1 &&
    calendarDate.getUTCDate() === Number(day);
  if (!isValidDate) return null;

  if (normalized !== `${year}-${month}-${day}` && Number.isNaN(Date.parse(normalized))) return null;
  return normalized;
};

const errorDetails = (error: unknown) => {
  const structured = (error && typeof error === "object" ? error : {}) as {
    message?: unknown;
    code?: unknown;
    details?: unknown;
    hint?: unknown;
  };
  return {
    message: structured.message ?? (error instanceof Error ? error.message : "erro desconhecido"),
    code: structured.code,
    details: structured.details,
    hint: structured.hint,
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let createdAuthUserId: string | null = null;
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
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("Configuração segura do Supabase ausente");
    }

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
      .select("role")
      .eq("id", callerData.user.id)
      .maybeSingle();

    if (profileError || !callerProfile || !["GESTOR", "EQUIPE"].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: "Permissão insuficiente" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json() as Record<string, unknown>;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = typeof body.role === "string" ? body.role : "";
    const nomeCompleto = typeof body.nome_completo === "string" ? body.nome_completo.trim() : "";
    const cpf = normalizeCpf(body.cpf);
    const initialPassword = typeof body.password === "string" ? body.password : "";
    const hasOrigin = Object.prototype.hasOwnProperty.call(body, "origem_cadastro");
    const hasStatus = Object.prototype.hasOwnProperty.call(body, "status");
    const requestedOrigin = optionalText(body.origem_cadastro);
    const requestedStatus = optionalText(body.status);
    if (
      !email ||
      !email.includes("@") ||
      !creatableRoles.has(role) ||
      !nomeCompleto ||
      !isStrongPassword(initialPassword) ||
      (hasOrigin && (requestedOrigin === null || !allowedOrigins.has(requestedOrigin))) ||
      (hasStatus && (requestedStatus === null || !allowedStatuses.has(requestedStatus)))
    ) {
      return new Response(JSON.stringify({ error: "Dados de usuário inválidos ou senha inicial fraca" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requestedPersonId = optionalText(body.person_id);
    let legacyId = typeof body.id === "string" && body.id.trim() ? body.id.trim() : `user-${crypto.randomUUID()}`;
    if (requestedPersonId) {
      const { data: canonicalPerson, error: canonicalPersonError } = await adminClient
        .from("pessoas")
        .select("id, profile_legacy_id, papel, ativo")
        .eq("id", requestedPersonId)
        .maybeSingle();
      if (canonicalPersonError || !canonicalPerson || !canonicalPerson.ativo) {
        return new Response(JSON.stringify({ error: "Pessoa canônica não encontrada" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (role === "ALUNO" && canonicalPerson.papel && canonicalPerson.papel !== "ALUNO") {
        return new Response(JSON.stringify({ error: "A pessoa canônica pertence a outro papel" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (canonicalPerson.profile_legacy_id && canonicalPerson.profile_legacy_id !== requestedPersonId) {
        return new Response(JSON.stringify({ error: "A pessoa já está associada a outro usuário" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      legacyId = requestedPersonId;
    }
    const origin = requestedOrigin ?? "interno";
    const status = role === "ALUNO" ? (requestedPersonId ? "ativo" : "pendente") : "ativo";
    const companyId = optionalText(body.empresa_id);
    const pendingClassId = origin === "b2b" ? optionalText(body.turma_id_pendente) : null;
    const fotoPath = typeof body.foto_url === "string" && body.foto_url.trim().startsWith(`avatars/${legacyId}/`)
      ? body.foto_url.trim()
      : null;

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: initialPassword,
      email_confirm: true,
      user_metadata: {
        legacy_id: legacyId,
        nome_completo: nomeCompleto,
        cpf: cpf ?? "",
        telefone: optionalText(body.telefone) ?? "",
        termo_lgpd_aceite: body.termo_lgpd_aceite === true,
        data_aceite_lgpd: normalizeOptionalDate(body.data_aceite_lgpd),
        data_nascimento: normalizeOptionalDate(body.data_nascimento),
        nome_mae: optionalText(body.nome_mae),
        nome_pai: optionalText(body.nome_pai),
        rg: optionalText(body.rg),
        orgao_expedicao_rg: optionalText(body.orgao_expedicao_rg),
        grau_ensino: optionalText(body.grau_ensino),
        cep: optionalText(body.cep),
        endereco: optionalText(body.endereco),
        numero: optionalText(body.numero),
        bairro: optionalText(body.bairro),
        cidade: optionalText(body.cidade),
        estado: optionalText(body.estado),
        trabalha_aviacao_civil: optionalText(body.trabalha_aviacao_civil),
        trabalha_seguranca_avsec: optionalText(body.trabalha_seguranca_avsec),
        certificacao_avsec: ["ISCR", "IOAD", "IOAR"].includes(String(body.certificacao_avsec))
          ? body.certificacao_avsec
          : "",
        empresa_id: companyId,
        tipo_documento_selecionado: body.tipo_documento_selecionado === "identidade_sem_cpf" || body.tipo_documento_selecionado === "cnh"
          ? body.tipo_documento_selecionado
          : "identidade_cpf",
        turma_id_pendente: pendingClassId,
        origem_cadastro: origin,
        foto_url: fotoPath,
      },
    });

    if (created.user) createdAuthUserId = created.user.id;
    if (createError) throw createError;
    if (!created.user) {
      return new Response(JSON.stringify({ error: "Não foi possível criar o usuário" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: profileUpdateError } = await adminClient
      .from("profiles")
      .update({
        role,
        status,
        origem_cadastro: origin,
        empresa_id: companyId,
        turma_id_pendente: pendingClassId,
      })
      .eq("id", created.user.id);

    if (profileUpdateError) {
      throw profileUpdateError;
    }

    if (requestedPersonId) {
      const { error: personLinkError } = await adminClient
        .from("pessoas")
        .update({ profile_legacy_id: requestedPersonId, papel: role, ativo: status === "ativo", visivel_diretorio: true })
        .eq("id", requestedPersonId);
      if (personLinkError) throw personLinkError;
    } else if (role === "ALUNO") {
      const { error: personCreateError } = await adminClient
        .from("pessoas")
        .insert({
          id: legacyId,
          nome: nomeCompleto,
          cpf,
          papel: role,
          ativo: status === "ativo",
          visivel_diretorio: true,
          profile_legacy_id: legacyId,
        });
      if (personCreateError) throw personCreateError;
    }

    const { data: profile, error: createdProfileError } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", created.user.id)
      .single();

    if (createdProfileError || !profile) {
      throw createdProfileError ?? new Error("Perfil não foi criado pelo trigger");
    }

    const profileMatchesRequestedRole = profile.role === role;
    const profileMatchesWorkflow = profile.status === status && profile.origem_cadastro === origin;
    const profileMatchesRelatedFields = profile.empresa_id === companyId && profile.turma_id_pendente === pendingClassId;
    if (!profileMatchesRequestedRole || !profileMatchesWorkflow || !profileMatchesRelatedFields) {
      console.error(`[${functionName}] perfil inconsistente após criação`, {
        legacyId,
        authUserId: created.user.id,
        requestedRole: role,
        returnedRole: profile.role,
        requestedStatus: status,
        returnedStatus: profile.status,
        requestedOrigin: origin,
        returnedOrigin: profile.origem_cadastro,
        requestedCompanyId: companyId,
        returnedCompanyId: profile.empresa_id,
        requestedPendingClassId: pendingClassId,
        returnedPendingClassId: profile.turma_id_pendente,
      });
      throw new Error("Perfil criado com dados inconsistentes; o usuário não foi cadastrado");
    }

    console.info(`[${functionName}] usuário criado`, { legacyId, role });
    return new Response(JSON.stringify({ user: profile }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    if (createdAuthUserId) {
      try {
        const cleanupUrl = Deno.env.get("SUPABASE_URL");
        const cleanupServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (!cleanupUrl || !cleanupServiceRoleKey) throw new Error("Configuração segura do Supabase ausente");
        const cleanupClient = createClient(cleanupUrl, cleanupServiceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { error: cleanupError } = await cleanupClient.auth.admin.deleteUser(createdAuthUserId);
        if (cleanupError) {
          console.error(`[${functionName}] falha na limpeza do usuário Auth`, {
            authUserId: createdAuthUserId,
            cleanupError: errorDetails(cleanupError),
          });
        }
      } catch (cleanupError) {
        console.error(`[${functionName}] exceção na limpeza do usuário Auth`, {
          authUserId: createdAuthUserId,
          cleanupError: errorDetails(cleanupError),
        });
      }
    }
    console.error(`[${functionName}] falha ao criar usuário`, {
      ...errorDetails(error),
      authUserId: createdAuthUserId,
    });
    return new Response(JSON.stringify({ error: "Não foi possível concluir o cadastro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
