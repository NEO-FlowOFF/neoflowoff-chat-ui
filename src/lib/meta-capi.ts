/**
 * meta-capi.ts — Meta Conversions API (CAPI) server-side client
 *
 * Envia eventos para a Graph API com PII hasheada (SHA-256).
 * O event_id deve ser o mesmo gerado pelo browser Pixel para deduplicação.
 *
 * Referência: https://developers.facebook.com/docs/marketing-api/conversions-api
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────

/**
 * Dados do usuário enviados para o Meta.
 * Todos os campos de PII (em, ph) DEVEM vir já normalizados e serão
 * hasheados em SHA-256 aqui antes de sair do servidor.
 * Campos não-PII (ip, ua) vão em texto puro, como exige o Meta.
 */
export interface CapiUserData {
  /** E-mail normalizado (minúsculo, sem espaços) — será hasheado */
  email?: string | null;
  /** Telefone normalizado (somente dígitos com DDI: ex. "5562982344801") — será hasheado */
  phone?: string | null;
  /** IP do cliente (texto puro — não é PII para o Meta) */
  clientIpAddress?: string | null;
  /** User-Agent do cliente (texto puro) */
  clientUserAgent?: string | null;
  /** fbclid capturado via UTM — texto puro */
  fbc?: string | null;
  /** Cookie _fbp do browser — texto puro */
  fbp?: string | null;
}

export interface CapiCustomData {
  /** Valor estimado da conversão (ex.: ticket médio) */
  value?: number;
  currency?: string;
  /** UTMs e identificadores de campanha */
  content_name?: string;
  [key: string]: string | number | undefined;
}

export interface CapiEvent {
  /** Nome do evento (ex.: "Lead", "CompleteRegistration") */
  event_name: string;
  /** Unix timestamp em segundos */
  event_time: number;
  /** action_source obrigatório — sempre "website" para apps web */
  action_source: "website";
  /** URL onde o evento ocorreu */
  event_source_url?: string;
  /**
   * ID único do evento — deve ser o MESMO gerado pelo browser Pixel
   * para que o Meta deduplicle e não conte em dobro.
   */
  event_id?: string;
  user_data: CapiUserData;
  custom_data?: CapiCustomData;
}

// ─── SHA-256 helper ───────────────────────────────────────────────────────────

/**
 * Normaliza e hasheia uma string com SHA-256 (hex).
 * Retorna null se o valor for nulo/vazio.
 *
 * Normalização seguindo as exigências do Meta:
 *  - e-mail: minúsculas + trim
 *  - telefone: apenas dígitos (0-9)
 */
async function sha256(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashEmail(email: string | null | undefined): Promise<string | undefined> {
  if (!email?.trim()) return undefined;
  return sha256(email.trim().toLowerCase());
}

async function hashPhone(phone: string | null | undefined): Promise<string | undefined> {
  if (!phone?.trim()) return undefined;
  // Remove tudo que não for dígito antes de hashear
  const normalized = phone.replace(/\D/g, "");
  if (!normalized) return undefined;
  return sha256(normalized);
}

// ─── Payload builder ──────────────────────────────────────────────────────────

async function buildUserData(userData: CapiUserData): Promise<Record<string, string | undefined>> {
  const [em, ph] = await Promise.all([
    hashEmail(userData.email),
    hashPhone(userData.phone),
  ]);

  return {
    ...(em && { em }),
    ...(ph && { ph }),
    ...(userData.clientIpAddress && { client_ip_address: userData.clientIpAddress }),
    ...(userData.clientUserAgent && { client_user_agent: userData.clientUserAgent }),
    ...(userData.fbc && { fbc: userData.fbc }),
    ...(userData.fbp && { fbp: userData.fbp }),
  };
}

// ─── Função principal ─────────────────────────────────────────────────────────

/**
 * Envia um evento para a Conversions API do Meta.
 *
 * @param event - Dados do evento (sem hash — a função faz o hash internamente)
 * @returns true se o evento foi aceito (events_received >= 1), false caso contrário
 */
export async function sendCapiEvent(event: CapiEvent): Promise<boolean> {
  const pixelId = process.env.PUBLIC_META_PIXEL_ID;
  const capiToken = process.env.META_CAPI_TOKEN;

  // Sem credenciais → silencioso (não bloqueia o fluxo principal)
  if (!pixelId || !capiToken) return false;

  try {
    const hashedUserData = await buildUserData(event.user_data);

    const payload = {
      data: [
        {
          event_name: event.event_name,
          event_time: event.event_time,
          action_source: event.action_source,
          ...(event.event_source_url && { event_source_url: event.event_source_url }),
          ...(event.event_id && { event_id: event.event_id }),
          user_data: hashedUserData,
          ...(event.custom_data && { custom_data: event.custom_data }),
        },
      ],
      // Test Events Mode — ativo apenas se META_TEST_EVENT_CODE estiver definido
      ...(process.env.META_TEST_EVENT_CODE && {
        test_event_code: process.env.META_TEST_EVENT_CODE,
      }),
    };

    const url = `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${capiToken}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[CAPI] HTTP ${res.status}:`, errBody);
      return false;
    }

    const json = (await res.json()) as { events_received?: number; messages?: string[] };

    if (json.messages?.length) {
      console.warn("[CAPI] Avisos do Meta:", json.messages);
    }

    return (json.events_received ?? 0) >= 1;
  } catch (err) {
    // Nunca bloqueia o fluxo principal — CAPI é fire-and-forget
    console.error("[CAPI] Falha ao enviar evento:", err);
    return false;
  }
}
