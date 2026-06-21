import { defineMiddleware } from "astro:middleware";
import { ensureLeadsTable, ensureSuspiciousEventsTable } from "./lib/db";
import { logger } from "./lib/logger";

// Flag para garantir que a inicialização só roda uma vez
let initialized = false;

export const onRequest = defineMiddleware(async (context, next) => {
  // Inicializa as tables na primeira requisição
  if (!initialized) {
    initialized = true;
    logger.info("INIT", "Inicializando banco de dados...");
    
    try {
      await ensureLeadsTable();
      await ensureSuspiciousEventsTable();
      logger.info("INIT", "Banco de dados inicializado com sucesso!");
    } catch (error) {
      logger.error("INIT", "Erro ao inicializar banco de dados", error);
      // Continua mesmo com erro, para não bloquear o servidor
    }
  }

  return next();
});

