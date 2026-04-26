# NEO-FlowOFF Chat UI - Makefile

# Package Manager
PM := npm

# Shell configuration
SHELL := /bin/zsh

# Text colors
CYAN  := \033[0;36m
GREEN := \033[0;32m
RED   := \033[0;31m
RESET := \033[0m

.DEFAULT_GOAL := help

.PHONY: help install dev build preview clean audit verify commit

help: ## Exibe esta mensagem de ajuda
	@echo "$(CYAN)NEO-FlowOFF Chat UI - Gerenciamento de Automação$(RESET)"
	@echo ""
	@echo "Uso: make [comando]"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-15s$(RESET) %s\n", $$1, $$2}'

verify: audit build ## Executa todas as verificações de segurança e integridade (audit + build + check)
	@echo "$(CYAN)➜ Verificando tipos com astro check...$(RESET)"
	$(PM) run check
	@echo "$(GREEN)➜ Verificação concluída com sucesso!$(RESET)"

install: ## Instala as dependências do projeto
	@echo "$(CYAN)➜ Instalando dependências com $(PM)...$(RESET)"
	$(PM) install

dev: ## Inicia o servidor de desenvolvimento do Astro
	@echo "$(CYAN)➜ Iniciando servidor dev...$(RESET)"
	$(PM) run dev

build: ## Gera o build de produção
	@echo "$(CYAN)➜ Gerando build de produção...$(RESET)"
	$(PM) run build

preview: ## Visualiza o build de produção localmente
	@echo "$(CYAN)➜ Visualizando build...$(RESET)"
	$(PM) run preview

clean: ## Limpa artefatos de build e dependências
	@echo "$(CYAN)➜ Limpando projeto...$(RESET)"
	rm -rf dist/ .astro/ node_modules/ pnpm-lock.yaml package-lock.json

update: ## Atualiza o Astro e todas as dependências para as versões mais seguras
	@echo "$(CYAN)➜ Atualizando Astro e dependências...$(RESET)"
	$(PM) dlx @astrojs/upgrade -y
	$(PM) install

repair: clean install ## Limpa cache/node_modules e reinstala do zero (corrige erros de store)

audit: ## Executa auditoria de segurança
	@echo "$(CYAN)➜ Executando $(PM) audit...$(RESET)"
	$(PM) audit

commit: verify ## Executa o fluxo NΞØ Protocol Commit & Push Seguro (Requer verificação total)
	@echo "$(CYAN)➜ Iniciando Commit & Push Seguro...$(RESET)"
	@echo "$(GREEN)Dica: Utilize o comando 'make commit' para garantir que nada quebrado suba para o main.$(RESET)"
	git add .
	@echo "$(CYAN)➜ Digite a mensagem de commit (ex: feat: layout finalizado):$(RESET)"
	@read msg; git commit -m "$$msg"
	git push origin main
