import * as fs from "node:fs/promises";
import * as path from "node:path";

/**
 * Utilitário para carregar o contexto do ecossistema (RAG Lite)
 * Lê os manifestos da raiz do projeto NEO-FlowOFF
 */
export async function getEcosystemContext() {
  try {
    // Caminho para a pasta de manifests (subindo um nível do app para a raiz do monorepo)
    const manifestsPath = path.join(process.cwd(), "..", "manifests");

    const files = ["workspace.json", "repos.json", "integrations.json"];
    let context = "\n--- ECOSYSTEM KNOWLEDGE BASE ---\n";

    for (const file of files) {
      try {
        const filePath = path.join(manifestsPath, file);
        const content = await fs.readFile(filePath, "utf-8");
        context += `\nFILE: ${file}\n${content}\n`;
      } catch (e) {
        console.warn(`[RAG] Não foi possível ler ${file}`);
      }
    }

    context += "\n--- END OF KNOWLEDGE BASE ---\n";
    return context;
  } catch (error) {
    console.error("[RAG ERROR]", error);
    return "";
  }
}
