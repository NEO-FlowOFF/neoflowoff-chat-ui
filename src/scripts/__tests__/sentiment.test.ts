import { describe, it, expect } from "vitest";
import { analyzeSentiment } from "@/scripts/sentiment";

describe("Sentiment Analyzer", () => {
  it("should classify empty or whitespace text as neutral", () => {
    expect(analyzeSentiment("")).toBe("neutral");
    expect(analyzeSentiment("   ")).toBe("neutral");
  });

  it("should classify neutral sentences as neutral", () => {
    expect(analyzeSentiment("Olá, gostaria de saber mais informações.")).toBe("neutral");
    expect(analyzeSentiment("Como posso agendar uma reunião?")).toBe("neutral");
  });

  it("should classify positive sentences as positive", () => {
    expect(analyzeSentiment("O atendimento foi ótimo, muito obrigado!")).toBe("positive");
    expect(analyzeSentiment("Que serviço excelente e rápido.")).toBe("positive");
    expect(analyzeSentiment("Perfeito, funcionou muito bem.")).toBe("positive");
  });

  it("should classify negative sentences as negative", () => {
    expect(analyzeSentiment("O sistema está muito lento e cheio de bugs.")).toBe("negative");
    expect(analyzeSentiment("Tive um problema chato e o suporte é péssimo.")).toBe("negative");
    expect(analyzeSentiment("Horrível, não funcionou nada.")).toBe("negative");
  });

  it("should flip sentiment when preceded by negation modifiers", () => {
    // Negation + positive word = negative sentiment
    expect(analyzeSentiment("Não achei bom.")).toBe("negative");
    expect(analyzeSentiment("Nunca foi legal.")).toBe("negative");

    // Negation + negative word = positive sentiment (e.g. "não é ruim" / "nada chato")
    expect(analyzeSentiment("O serviço não é ruim.")).toBe("positive");
    expect(analyzeSentiment("Não foi péssimo.")).toBe("positive");
  });

  it("should handle accents and mixed capitalization", () => {
    expect(analyzeSentiment("ÓTIMO! MARAVILHA!")).toBe("positive");
    expect(analyzeSentiment("Péssimo e horrível")).toBe("negative");
  });
});
