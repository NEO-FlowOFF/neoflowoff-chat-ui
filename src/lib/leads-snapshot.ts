export interface LeadSnapshotRow {
  sessionRef: string;
  createdAtUtc: string;
  updatedAtUtc: string;
  temNome: "sim" | "não";
  temEmail: "sim" | "não";
  temTelefone: "sim" | "não";
  temEmpresa: "sim" | "não";
  qualificado: "sim" | "não";
  handoffSent: "sim" | "não";
  visitorIntent: string;
  observacoesChars: number;
}

export const leadSnapshotDate = "2026-05-27";

export const leadSnapshotRows: LeadSnapshotRow[] = [
  {
    sessionRef: "d1e69461...",
    createdAtUtc: "2026-05-23 15:23",
    updatedAtUtc: "2026-05-23 15:29",
    temNome: "sim",
    temEmail: "sim",
    temTelefone: "não",
    temEmpresa: "sim",
    qualificado: "sim",
    handoffSent: "não",
    visitorIntent: "sem_intencao",
    observacoesChars: 141,
  },
  {
    sessionRef: "c8a4bafe...",
    createdAtUtc: "2026-05-23 14:31",
    updatedAtUtc: "2026-05-23 14:32",
    temNome: "não",
    temEmail: "não",
    temTelefone: "não",
    temEmpresa: "não",
    qualificado: "não",
    handoffSent: "não",
    visitorIntent: "sem_intencao",
    observacoesChars: 209,
  },
  {
    sessionRef: "2f9b9020...",
    createdAtUtc: "2026-05-17 21:07",
    updatedAtUtc: "2026-05-17 21:07",
    temNome: "não",
    temEmail: "não",
    temTelefone: "não",
    temEmpresa: "não",
    qualificado: "não",
    handoffSent: "não",
    visitorIntent: "sem_intencao",
    observacoesChars: 134,
  },
  {
    sessionRef: "bf4d87c1...",
    createdAtUtc: "2026-05-06 20:02",
    updatedAtUtc: "2026-05-06 20:02",
    temNome: "não",
    temEmail: "não",
    temTelefone: "não",
    temEmpresa: "não",
    qualificado: "não",
    handoffSent: "não",
    visitorIntent: "sem_intencao",
    observacoesChars: 173,
  },
  {
    sessionRef: "e0197b76...",
    createdAtUtc: "2026-04-29 18:23",
    updatedAtUtc: "2026-04-29 18:23",
    temNome: "não",
    temEmail: "não",
    temTelefone: "não",
    temEmpresa: "não",
    qualificado: "não",
    handoffSent: "não",
    visitorIntent: "sem_intencao",
    observacoesChars: 73,
  },
  {
    sessionRef: "549a16ba...",
    createdAtUtc: "2026-04-28 14:20",
    updatedAtUtc: "2026-04-28 17:08",
    temNome: "não",
    temEmail: "não",
    temTelefone: "não",
    temEmpresa: "não",
    qualificado: "não",
    handoffSent: "não",
    visitorIntent: "sem_intencao",
    observacoesChars: 118,
  },
  {
    sessionRef: "e7e3be24...",
    createdAtUtc: "2026-04-28 14:23",
    updatedAtUtc: "2026-04-28 14:23",
    temNome: "não",
    temEmail: "não",
    temTelefone: "não",
    temEmpresa: "não",
    qualificado: "não",
    handoffSent: "não",
    visitorIntent: "sem_intencao",
    observacoesChars: 280,
  },
  {
    sessionRef: "1eae109f...",
    createdAtUtc: "2026-04-28 10:33",
    updatedAtUtc: "2026-04-28 10:34",
    temNome: "não",
    temEmail: "não",
    temTelefone: "não",
    temEmpresa: "não",
    qualificado: "não",
    handoffSent: "não",
    visitorIntent: "sem_intencao",
    observacoesChars: 179,
  },
  {
    sessionRef: "85ef2c45...",
    createdAtUtc: "2026-04-28 05:35",
    updatedAtUtc: "2026-04-28 05:38",
    temNome: "não",
    temEmail: "não",
    temTelefone: "não",
    temEmpresa: "não",
    qualificado: "não",
    handoffSent: "não",
    visitorIntent: "sem_intencao",
    observacoesChars: 158,
  },
  {
    sessionRef: "484c0e82...",
    createdAtUtc: "2026-04-28 05:33",
    updatedAtUtc: "2026-04-28 05:33",
    temNome: "não",
    temEmail: "não",
    temTelefone: "não",
    temEmpresa: "não",
    qualificado: "não",
    handoffSent: "não",
    visitorIntent: "sem_intencao",
    observacoesChars: 169,
  },
];

export const leadIntentSummary = [
  {
    visitorIntent: "sem_intencao",
    total: 10,
    qualificados: 1,
  },
];

const csvHeader = [
  "session_ref",
  "created_at_utc",
  "updated_at_utc",
  "tipo_contato",
  "tipo_identidade",
  "tipo_qualificacao",
  "tipo_handoff",
  "tipo_followup",
  "tipo_observacao",
  "tem_nome",
  "tem_email",
  "tem_telefone",
  "tem_empresa",
  "qualificado",
  "handoff_sent",
  "visitor_intent",
  "observacoes_chars",
];

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function getContactType(row: LeadSnapshotRow) {
  if (row.temEmail === "sim" && row.temTelefone === "sim") {
    return "email_e_telefone";
  }

  if (row.temEmail === "sim") return "email";
  if (row.temTelefone === "sim") return "telefone";

  return "sem_contato";
}

function getIdentityType(row: LeadSnapshotRow) {
  if (row.temNome === "sim" && row.temEmpresa === "sim") {
    return "nome_e_empresa";
  }

  if (row.temNome === "sim") return "nome";
  if (row.temEmpresa === "sim") return "empresa";

  return "sem_identidade";
}

function getObservationType(row: LeadSnapshotRow) {
  if (row.observacoesChars >= 200) return "contexto_longo";
  if (row.observacoesChars > 0) return "contexto_curto";

  return "sem_contexto";
}

export function getLeadSnapshotCsv() {
  const lines = [
    csvHeader.join(","),
    ...leadSnapshotRows.map((row) =>
      [
        row.sessionRef,
        row.createdAtUtc,
        row.updatedAtUtc,
        getContactType(row),
        getIdentityType(row),
        row.qualificado === "sim" ? "qualificado" : "nao_qualificado",
        row.handoffSent === "sim" ? "handoff_enviado" : "handoff_pendente",
        row.qualificado === "sim" ? "ready" : "pending",
        getObservationType(row),
        row.temNome,
        row.temEmail,
        row.temTelefone,
        row.temEmpresa,
        row.qualificado,
        row.handoffSent,
        row.visitorIntent,
        row.observacoesChars,
      ]
        .map(csvCell)
        .join(","),
    ),
  ];

  return `${lines.join("\n")}\n`;
}
