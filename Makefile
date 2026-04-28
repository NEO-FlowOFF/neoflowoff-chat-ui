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

.PHONY: help install dev build preview clean audit verify commit docs

help: ## Exibe esta mensagem de ajuda
	@echo "$(CYAN)========================================$(RESET)"
	@echo "$(CYAN)    NEO-FlowOFF · ARCHITECT TOOLSET      $(RESET)"
	@echo "$(CYAN)========================================$(RESET)"
	@echo ""
	@echo "Uso: make [comando]"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-15s$(RESET) %s\n", $$1, $$2}'

verify: audit docs build ## Executa todas as verificações (audit + docs + build + check)
	@echo "$(CYAN)➜ Verificando integridade com astro check...$(RESET)"
	$(PM) run check
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

repair: clean ## Limpa cache/node_modules e reinstala do zero
	@echo "$(RED)➜ EXECUTANDO REPARO TOTAL...$(RESET)"
	rm -rf node_modules/ pnpm-lock.yaml
	$(PM) install
	@echo "$(GREEN)➜ Projeto reparado.$(RESET)"

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

