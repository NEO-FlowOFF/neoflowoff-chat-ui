# NEO-FlowOFF Chat UI - Makefile

# Package Manager
PM := pnpm

# Shell configuration
SHELL := /bin/zsh

# Text colors
CYAN    := \033[0;36m
GREEN   := \033[0;32m
RED     := \033[0;31m
YELLOW  := \033[0;33m
MAGENTA := \033[0;35m
RESET   := \033[0m

.DEFAULT_GOAL := help

.PHONY: help install dev build preview clean audit verify commit docs repair repair-lockfile update check-node

check-node: ## Valida runtime Node.js >=22.12.0
	@node -e "const v=process.versions.node.split('.').map(Number);const ok=v[0]>22||(v[0]===22&&(v[1]>12||(v[1]===12&&v[2]>=0)));if(!ok){console.error('ERRO: Node.js >=22.12.0 requerido. Atual: '+process.versions.node);process.exit(1)}"

help: ## Exibe esta mensagem de ajuda
	@echo "$(CYAN)========================================$(RESET)"
	@echo "$(CYAN)    NEO-FlowOFF · ARCHITECT TOOLSET      $(RESET)"
	@echo "$(CYAN)========================================$(RESET)"
	@echo ""
	@echo "Uso: make [comando]"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-15s$(RESET) %s\n", $$1, $$2}'

verify: check-node audit docs ## Executa todas as verificações (node + audit + docs + check + build)
	@echo "$(CYAN)➜ Verificando integridade com astro check...$(RESET)"
	$(PM) run check
	@echo "$(CYAN)➜ Validando build de produção...$(RESET)"
	$(PM) run build
	@echo "$(GREEN)➜ Verificação de protocolo concluída com sucesso!$(RESET)"

docs: ## Verifica a integridade das pastas de documentação e regras
	@echo "$(CYAN)➜ Validando documentos canônicos...$(RESET)"
	@test -d docs || (echo "$(RED)ERRO: Pasta docs/ não encontrada$(RESET)" && exit 1)
	@test -d .cursor/rules || (echo "$(RED)ERRO: Pasta .cursor/rules/ não encontrada$(RESET)" && exit 1)
	@echo "$(GREEN)➜ Estrutura de documentação validada.$(RESET)"

install: ## Instala as dependências do projeto
	@echo "$(CYAN)➜ Sincronizando dependências com $(PM)...$(RESET)"
	$(PM) install

dev: ## Inicia o servidor de desenvolvimento
	@echo "$(CYAN)➜ Iniciando núcleo de desenvolvimento...$(RESET)"
	$(PM) run dev

build: ## Gera o build de produção
	@echo "$(CYAN)➜ Orquestrando build de produção...$(RESET)"
	$(PM) run build

preview: ## Visualiza o build de produção localmente
	@echo "$(CYAN)➜ Iniciando visualização do build...$(RESET)"
	$(PM) run preview

clean: ## Limpa artefatos de build (preserva lockfile)
	@echo "$(CYAN)➜ Limpando artefatos temporários...$(RESET)"
	rm -rf dist/ .astro/

repair: clean ## Limpa node_modules e reinstala (preserva lockfile)
	@echo "$(RED)➜ EXECUTANDO REPARO...$(RESET)"
	rm -rf node_modules/
	$(PM) install
	@echo "$(GREEN)➜ Projeto reparado.$(RESET)"

repair-lockfile: clean ## Limpa TUDO incluindo lockfile (use apenas em último caso)
	@echo "$(RED)➜ REPARO TOTAL COM RESET DO LOCKFILE...$(RESET)"
	rm -rf node_modules/ pnpm-lock.yaml
	$(PM) install
	@echo "$(GREEN)➜ Projeto reparado com lockfile regenerado.$(RESET)"

update: ## Atualiza o Astro e todas as dependências
	@echo "$(CYAN)➜ Atualizando dependências...$(RESET)"
	$(PM) dlx @astrojs/upgrade -y
	$(PM) install --no-frozen-lockfile

audit: ## Executa auditoria de segurança
	@echo "$(CYAN)➜ Executando auditoria de segurança...$(RESET)"
	$(PM) audit

commit: verify ## Fluxo NΞØ Protocol: Verifica, Adiciona, Comita e Faz Push (Branch Atual)
	@echo "$(MAGENTA)========================================$(RESET)"
	@echo "$(MAGENTA)    NΞØ PROTOCOL · SECURE COMMIT        $(RESET)"
	@echo "$(MAGENTA)========================================$(RESET)"
	git status
	@echo "$(CYAN)➜ Adicionando mudanças...$(RESET)"
	git add .
	@echo "$(YELLOW)Digite a mensagem de commit (Conventional Commits):$(RESET)"
	@read msg; git commit -m "$$msg"
	@echo "$(CYAN)➜ Fazendo push para a branch atual...$(RESET)"
	git push origin $$(git rev-parse --abbrev-ref HEAD)
	@echo "$(GREEN)➜ Operação concluída com sucesso.$(RESET)"
