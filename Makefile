# ═══════════════════════════════════════════
#   NΞØ Protocol — NEØ:One Chat UI
# ═══════════════════════════════════════════

SHELL := /bin/zsh
PM := pnpm

CYAN    := \033[0;36m
GREEN   := \033[0;32m
YELLOW  := \033[0;33m
RED     := \033[0;31m
MAGENTA := \033[0;35m
DIM     := \033[0;90m
WHITE   := \033[1;37m
RESET   := \033[0m

.DEFAULT_GOAL := help

.PHONY: help check-node install dev build preview start clean audit docs test check \
	verify commit repair repair-lockfile update astro-sync check-pwa check-robots \
	check-seo check-js check-manifest

define mini_header
	@printf "$(1)╭──────────────────────────────────────────╮$(RESET)\n"
	@printf "$(1)│$(RESET)  $(WHITE)%-40s$(RESET)$(1)│$(RESET)\n" "$(2)"
	@printf "$(1)│$(RESET)  $(DIM)%-40s$(RESET)$(1)│$(RESET)\n" "$(3)"
	@printf "$(1)╰──────────────────────────────────────────╯$(RESET)\n"
endef

help: ## Exibe os comandos disponíveis
	@printf "$(CYAN)╔══════════════════════════════════════════╗$(RESET)\n"
	@printf "$(CYAN)║$(MAGENTA)▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓$(CYAN)║$(RESET)\n"
	@printf "$(CYAN)║                                          ║$(RESET)\n"
	@printf "$(CYAN)║$(RESET)  $(WHITE)%-40s$(RESET)$(CYAN)║$(RESET)\n" "      NEO-FLOWOFF · NEØ:ONE CHAT"
	@printf "$(CYAN)║$(RESET)  $(MAGENTA)%-40s$(RESET)$(CYAN)║$(RESET)\n" "       ── Agent SDR · Astro ──"
	@printf "$(CYAN)║                                          ║$(RESET)\n"
	@printf "$(CYAN)║$(MAGENTA)▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓$(CYAN)║$(RESET)\n"
	@printf "$(CYAN)╚══════════════════════════════════════════╝$(RESET)\n"
	@printf "$(DIM) ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░$(RESET)\n\n"
	@printf "  Uso: $(CYAN)make$(RESET) $(WHITE)[comando]$(RESET)\n\n"
	@printf "$(DIM)  ·─── AMBIENTE ──────────────────────────────$(RESET)\n"
	@grep -E '^(check-node|install|repair|repair-lockfile|update):.*## ' Makefile | sort | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[0;36m◆ %-16s\033[0m \033[0;90m%s\033[0m\n", $$1, $$2}'
	@printf "\n$(DIM)  ·─── DESENVOLVIMENTO ───────────────────────$(RESET)\n"
	@grep -E '^(dev|build|preview|start|clean|astro-sync):.*## ' Makefile | sort | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[0;36m◆ %-16s\033[0m \033[0;90m%s\033[0m\n", $$1, $$2}'
	@printf "\n$(DIM)  ·─── QUALIDADE & SEGURANÇA ─────────────────$(RESET)\n"
	@grep -E '^(audit|docs|test|check|verify|commit|check-pwa|check-robots|check-seo|check-js|check-manifest):.*## ' Makefile | sort | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[0;36m◆ %-16s\033[0m \033[0;90m%s\033[0m\n", $$1, $$2}'
	@printf "\n$(DIM) ─────────────────────────────────────────────$(RESET)\n"
	@printf "$(DIM) ⬡ NΞØ Protocol // Agent SDR sovereign UI$(RESET)\n\n"

check-node: ## Valida Node.js conforme package.json
	$(call mini_header,$(CYAN),◉  CHECK NODE,Node.js >= 22.12.0)
	@node -e "const v=process.versions.node.split('.').map(Number);const ok=v[0]>22||(v[0]===22&&(v[1]>12||(v[1]===12&&v[2]>=0)));if(!ok){console.error('Node.js >=22.12.0 requerido. Atual: '+process.versions.node);process.exit(1)}"
	@printf "$(GREEN)  ✓ Runtime Node.js aprovado.$(RESET)\n"

install: check-node ## Instala dependências sem alterar o lockfile
	$(call mini_header,$(CYAN),▼  INSTALL,pnpm install --frozen-lockfile)
	$(PM) install --frozen-lockfile
	@printf "$(GREEN)  ✓ Dependências sincronizadas.$(RESET)\n"

dev: check-node ## Inicia o servidor de desenvolvimento
	$(call mini_header,$(CYAN),▶  DEV,pnpm run dev)
	$(PM) run dev

build: check-node ## Gera o build de produção
	$(call mini_header,$(CYAN),⬡  BUILD,pnpm run build)
	$(PM) run build
	@printf "$(GREEN)  ✓ Build concluído.$(RESET)\n"

preview: check-node ## Visualiza o build localmente
	$(call mini_header,$(CYAN),◎  PREVIEW,pnpm run preview)
	$(PM) run preview

start: check-node ## Inicia o servidor de produção já compilado
	$(call mini_header,$(CYAN),▶  START,pnpm run start)
	$(PM) run start

astro-sync: check-node ## Sincroniza tipos gerados pelo Astro
	$(call mini_header,$(CYAN),◉  ASTRO SYNC,pnpm exec astro sync)
	$(PM) exec astro sync
	@printf "$(GREEN)  ✓ Tipos Astro sincronizados.$(RESET)\n"

clean: ## Remove somente artefatos gerados
	$(call mini_header,$(YELLOW),✦  CLEAN,dist/ e .astro/)
	rm -rf -- dist .astro
	@printf "$(GREEN)  ✓ Artefatos removidos.$(RESET)\n"

check: check-node ## Executa diagnóstico estático do Astro
	$(call mini_header,$(CYAN),◉  CHECK,pnpm run check)
	$(PM) run check
	@printf "$(GREEN)  ✓ Diagnóstico estático aprovado.$(RESET)\n"

test: check-node ## Executa a suíte Vitest
	$(call mini_header,$(CYAN),◉  TEST,pnpm test)
	$(PM) test
	@printf "$(GREEN)  ✓ Testes aprovados.$(RESET)\n"

audit: check-node ## Executa auditoria de dependências
	$(call mini_header,$(CYAN),⚑  AUDIT,pnpm audit)
	$(PM) audit
	@printf "$(GREEN)  ✓ Auditoria concluída.$(RESET)\n"

docs: ## Valida documentos e regras canônicas
	$(call mini_header,$(CYAN),✧  DOCS,governança local do repositório)
	@test -f README.md || (printf "$(RED)  ✗ README.md ausente.$(RESET)\n"; exit 1)
	@test -f CLAUDE.md || (printf "$(RED)  ✗ CLAUDE.md ausente.$(RESET)\n"; exit 1)
	@test -f docs/SETUP.md || (printf "$(RED)  ✗ docs/SETUP.md ausente.$(RESET)\n"; exit 1)
	@test -f docs/SKILL.md || (printf "$(RED)  ✗ docs/SKILL.md ausente.$(RESET)\n"; exit 1)
	@test -d .cursor/rules || (printf "$(RED)  ✗ .cursor/rules ausente.$(RESET)\n"; exit 1)
	@printf "$(GREEN)  ✓ Documentação canônica presente.$(RESET)\n"

check-pwa: check-manifest check-js ## Audita o contrato PWA local
	$(call mini_header,$(CYAN),◉  CHECK PWA,manifesto + service worker)
	@test -f public/sw.js
	@rg -q 'serviceWorker' src public
	@printf "$(GREEN)  ✓ Contrato PWA íntegro.$(RESET)\n"

check-manifest: ## Valida manifesto e ícones PWA declarados
	$(call mini_header,$(CYAN),◉  CHECK MANIFEST,public/manifest.json)
	@node -e "const fs=require('node:fs');const m=JSON.parse(fs.readFileSync('public/manifest.json','utf8'));if(!m.name||!m.start_url||!Array.isArray(m.icons)||m.icons.length<2)process.exit(1);for(const i of m.icons){const p='public/'+i.src.replace(/^\//,'');if(!fs.existsSync(p)){console.error('Ícone ausente: '+p);process.exit(1)}}"
	@printf "$(GREEN)  ✓ Manifesto PWA aprovado.$(RESET)\n"

check-robots: ## Verifica o robots.txt público
	$(call mini_header,$(CYAN),◉  CHECK ROBOTS,public/robots.txt)
	@test -s public/robots.txt
	@rg -q '^User-agent:' public/robots.txt
	@rg -q '^Sitemap:' public/robots.txt
	@printf "$(GREEN)  ✓ robots.txt aprovado.$(RESET)\n"

check-seo: ## Verifica SEO básico no layout Astro
	$(call mini_header,$(CYAN),◉  CHECK SEO,metadados e canonical)
	@rg -q '<title>' src/layouts/Base.astro
	@rg -q 'rel="canonical"' src/layouts/Base.astro
	@rg -q 'application/ld\+json' src/layouts/Base.astro
	@printf "$(GREEN)  ✓ Contrato SEO básico aprovado.$(RESET)\n"

check-js: ## Verifica scripts client-side críticos
	$(call mini_header,$(CYAN),◉  CHECK JS,chat UI e service worker)
	@test -s src/scripts/chat-ui.ts
	@test -s public/sw.js
	@rg -q '/api/chat' src/scripts/chat-ui.ts
	@printf "$(GREEN)  ✓ Scripts críticos presentes.$(RESET)\n"

verify: audit docs check-pwa check-robots check-seo check test build ## Executa o pipeline seguro completo
	$(call mini_header,$(CYAN),⬡  VERIFY,diff + qualidade + testes + build)
	@git diff --check
	@printf "$(GREEN)  ✓ Pipeline de verificação aprovado.$(RESET)\n"

repair: clean ## Reinstala dependências preservando o lockfile
	$(call mini_header,$(YELLOW),⚙  REPAIR,reinstalação com lockfile preservado)
	rm -rf -- node_modules
	$(PM) install --frozen-lockfile
	@printf "$(GREEN)  ✓ Dependências reparadas.$(RESET)\n"

repair-lockfile: clean ## Regenera dependências e lockfile em último caso
	$(call mini_header,$(RED),⚠  REPAIR LOCKFILE,operação destrutiva com confirmação)
	@printf "$(RED)  Digite REGENERAR para remover node_modules e pnpm-lock.yaml: $(RESET)"; read -r answer; test "$$answer" = "REGENERAR"
	rm -rf -- node_modules pnpm-lock.yaml
	$(PM) install
	@printf "$(YELLOW)  ! Revise integralmente o novo lockfile.$(RESET)\n"

update: check-node ## Atualiza Astro e dependências conscientemente
	$(call mini_header,$(YELLOW),↑  UPDATE,Astro upgrade + lockfile)
	$(PM) dlx @astrojs/upgrade
	$(PM) install --no-frozen-lockfile
	@printf "$(YELLOW)  ! Revise changelog, diff e testes.$(RESET)\n"

commit: verify ## Cria commit seguro com Conventional Commits
	$(call mini_header,$(MAGENTA),⬡  COMMIT,verify + git commit)
	@git status --short
	@printf "$(YELLOW)  Mensagem (Conventional Commits): $(RESET)"; read -r msg; test -n "$$msg"; git add -A; git commit -m "$$msg"
	@printf "$(GREEN)  ✓ Commit criado; push permanece explícito.$(RESET)\n"
