import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockUpsertLead } = vi.hoisted(() => ({ mockUpsertLead: vi.fn() }));

vi.mock("../leads", () => ({ upsertLead: mockUpsertLead }));

import { updateRegisLead } from "../regis";

describe("Regis extraction contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ASI1_API_KEY = "test-key";
    mockUpsertLead.mockResolvedValue(null);
  });

  it("persists structured facts and accepts verbatim POI evidence", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  nome: "Ana",
                  email: null,
                  telefone: "11999999999",
                  empresa: "Acme",
                  visitor_intent: "agents_empresa",
                  resumo_conversa: "Quer implantar um Agent SDR.",
                  dor_principal: "Perde leads fora do horário.",
                  necessidade_detectada: "Atendimento contínuo.",
                  produto_interesse: "Agent SDR",
                  urgencia: "este mês",
                  commercial_intent: "action_request",
                  poi_detected: true,
                  poi_evidence: "quero uma proposta",
                }),
              },
            },
          ],
        }),
      }),
    );

    await updateRegisLead("session-1", [
      { role: "user", content: "quero uma proposta para Agent SDR" },
    ]);

    expect(mockUpsertLead).toHaveBeenCalledWith(
      expect.objectContaining({
        commercialIntent: "action_request",
        poiDetected: true,
        poiEvidence: "quero uma proposta",
        urgencia: "este mês",
        ultimaMensagem: "quero uma proposta para Agent SDR",
      }),
    );
  });

  it("rejects POI evidence that is not present in a visitor message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  visitor_intent: "curioso",
                  commercial_intent: "commercial_interest",
                  poi_detected: true,
                  poi_evidence: "quero contratar agora",
                }),
              },
            },
          ],
        }),
      }),
    );

    await updateRegisLead("session-2", [
      { role: "user", content: "estou apenas conhecendo" },
    ]);

    expect(mockUpsertLead).toHaveBeenCalledWith(
      expect.objectContaining({ poiDetected: false, poiEvidence: null }),
    );
  });
});
