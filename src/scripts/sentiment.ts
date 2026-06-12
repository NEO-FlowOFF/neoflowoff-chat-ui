/**
 * Analisador de sentimento leve (client-side) para o idioma Português.
 * Classifica o texto em 'positive', 'negative' ou 'neutral'.
 */

const POSITIVE_WORDS = new Set([
  "otimo", "bom", "legal", "excelente", "perfeito", "maravilha", "parabens",
  "gostei", "amei", "ajudou", "lindo", "sucesso", "rapido", "facil",
  "incrivel", "show", "top", "valeu", "espetacular", "satisfatorio",
  "recomendo", "obrigado", "obrigada", "feliz", "contente", "sensacional",
  "fantastico", "maravilhoso", "gostando", "curti", "bacana"
]);

const NEGATIVE_WORDS = new Set([
  "ruim", "pessimo", "pessima", "lento", "demora", "erro", "falha", "bug",
  "problema", "dificil", "chato", "pior", "odiei", "horrivel", "caro",
  "reclamar", "reclamacao", "suporte", "estranho", "errado", "quebrou",
  "inutil", "descontente", "insatisfeito", "frustrado", "frustrada",
  "complicado", "confuso", "bosta", "droga", "merda", "lixo"
]);

const NEGATION_MODIFIERS = new Set(["nao", "nunca", "jamais", "nada", "sem"]);

/**
 * Normaliza uma string removendo acentuação e pontuação, convertendo para minúsculas.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, " ") // Substitui pontuação por espaço
    .trim();
}

/**
 * Analisa o sentimento de um texto em português.
 */
export function analyzeSentiment(text: string): "positive" | "negative" | "neutral" {
  if (!text || !text.trim()) return "neutral";

  const normalized = normalizeText(text);
  const words = normalized.split(/\s+/).filter(Boolean);
  
  let score = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let wordScore = 0;

    if (POSITIVE_WORDS.has(word)) {
      wordScore = 1;
    } else if (NEGATIVE_WORDS.has(word)) {
      wordScore = -1;
    }

    if (wordScore !== 0) {
      // Verifica modificador de negação nas últimas 2 palavras anteriores
      let hasNegation = false;
      if (i > 0 && NEGATION_MODIFIERS.has(words[i - 1])) {
        hasNegation = true;
      } else if (i > 1 && NEGATION_MODIFIERS.has(words[i - 2])) {
        hasNegation = true;
      }

      if (hasNegation) {
        wordScore = -wordScore; // Inverte o sentimento
      }
      score += wordScore;
    }
  }

  if (score > 0) return "positive";
  if (score < 0) return "negative";
  return "neutral";
}
