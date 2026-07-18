export const COMMERCIAL_INTENTS = [
  "no_signal",
  "curiosity",
  "problem_identified",
  "solution_interest",
  "commercial_interest",
  "action_request",
  "urgent_action",
] as const;

export type CommercialIntent = (typeof COMMERCIAL_INTENTS)[number];

const INTENT_SCORES: Record<CommercialIntent, number> = {
  no_signal: 0,
  curiosity: 20,
  problem_identified: 40,
  solution_interest: 60,
  commercial_interest: 75,
  action_request: 90,
  urgent_action: 100,
};

export interface LeadSignals {
  nome?: string | null;
  email?: string | null;
  telefone?: string | null;
  empresa?: string | null;
  cargo?: string | null;
  dorPrincipal?: string | null;
  necessidadeDetectada?: string | null;
  produtoInteresse?: string | null;
  urgencia?: string | null;
  utmSource?: string | null;
  utmCampaign?: string | null;
  commercialIntent?: CommercialIntent | null;
  poiDetected?: boolean;
  poiEvidence?: string | null;
}

export interface LeadScoreResult {
  leadScore: number;
  intentScore: number;
  poiDetected: boolean;
  qualified: boolean;
  handoffReady: boolean;
  components: Record<string, number>;
}

const present = (value?: string | null) => !!value?.trim();

export function isValidEmail(value?: string | null): boolean {
  return !!value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidPhone(value?: string | null): boolean {
  if (!value) return false;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export function scoreLead(signals: LeadSignals): LeadScoreResult {
  const commercialIntent = signals.commercialIntent ?? "no_signal";
  const intentScore = INTENT_SCORES[commercialIntent];
  const hasEvidence = present(signals.poiEvidence);
  const poiDetected = !!signals.poiDetected && hasEvidence && intentScore >= 75;

  const components = {
    identity: present(signals.nome) ? 20 : 0,
    contact:
      isValidEmail(signals.email) || isValidPhone(signals.telefone) ? 25 : 0,
    company: present(signals.empresa) || present(signals.cargo) ? 10 : 0,
    need:
      present(signals.dorPrincipal) || present(signals.necessidadeDetectada)
        ? 15
        : 0,
    product: present(signals.produtoInteresse) ? 15 : 0,
    urgency: present(signals.urgencia) ? 10 : 0,
    attribution:
      present(signals.utmSource) || present(signals.utmCampaign) ? 5 : 0,
  };

  const leadScore = Math.min(
    100,
    Object.values(components).reduce((total, value) => total + value, 0),
  );
  const hasContact =
    isValidEmail(signals.email) || isValidPhone(signals.telefone);
  const qualified =
    present(signals.nome) &&
    hasContact &&
    (intentScore >= 60 || poiDetected) &&
    leadScore >= 60;
  const handoffReady =
    qualified && isValidPhone(signals.telefone) && intentScore >= 75;

  return {
    leadScore,
    intentScore,
    poiDetected,
    qualified,
    handoffReady,
    components,
  };
}
