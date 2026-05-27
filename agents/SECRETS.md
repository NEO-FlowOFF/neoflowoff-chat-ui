# Secrets Management

## Estrutura

- secrets/.env.local - Variáveis principais
- secrets/.venice-api-key - Venice API key
- secrets/.venice-model - Venice model
- secrets/.vt-api-key - VoiceTune API key
- secrets/mcp/.env - MCP configs

## Permissões

Pastas: 700 (apenas dono)
Arquivos: 600 (apenas dono leitura/escrita)

## Como carregar

source ~/neomello/load-secrets.sh

## Segurança

- Não commitar secrets no git
- Permissões restritas
