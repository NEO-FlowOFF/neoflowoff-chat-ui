import workspace from "../../../manifests/workspace.json";
import repos from "../../../manifests/repos.json";
import integrations from "../../../manifests/integrations.json";

/**
 * Utilitário para carregar o contexto do ecossistema (RAG Lite)
 * Retorna os manifestos estáticos embutidos no build
 */
export function getEcosystemContext(): string {
  try {
    let context = "\n--- ECOSYSTEM KNOWLEDGE BASE ---\n";
    context += `\nFILE: workspace.json\n${JSON.stringify(workspace, null, 2)}\n`;
    context += `\nFILE: repos.json\n${JSON.stringify(repos, null, 2)}\n`;
    context += `\nFILE: integrations.json\n${JSON.stringify(integrations, null, 2)}\n`;
    context += "\n--- END OF KNOWLEDGE BASE ---\n";
    return context;
  } catch (error) {
    console.error("[RAG ERROR]", error);
    return "";
  }
}
