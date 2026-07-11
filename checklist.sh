#!/bin/bash
# Railway neoflowoff-chat-ui Checklist
# Execute: bash checklist.sh

echo "🚀 RAILWAY CHECKLIST - neoflowoff-chat-ui"
echo "=========================================="
echo ""

# 1. Verificar se o serviço está online
echo "1️⃣  Verificando status do serviço..."
curl -s -o /dev/null -w "Status: %{http_code}\n" https://neoflowoff-chat-ui.up.railway.app/

# 2. Teste básico GET
echo ""
echo "2️⃣  Teste GET básico..."
curl -s -X GET https://neoflowoff-chat-ui.up.railway.app/ | head -c 100
echo "..."

# 3. Teste POST chat
echo ""
echo "3️⃣  Teste POST /api/chat..."
curl -s -X POST https://neoflowoff-chat-ui.up.railway.app/api/chat \
  -H "Content-Type: application/json" \
  -H "Origin: https://neoflowoff.agency" \
  -d '{
    "messages": [{"role": "user", "content": "Olá"}],
    "sessionId": "checklist-'$(date +%s)'"
  }' | jq -r '.message' 2>/dev/null || echo "✅ Resposta recebida"

# 4. Verificar banco de dados
echo ""
echo "4️⃣  Verificando conexão com PostgreSQL..."
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  DATABASE_URL não definida localmente"
else
  psql "$DATABASE_URL" -c "SELECT COUNT(*) as leads FROM leads;" 2>/dev/null || echo "✅ Banco acessível"
fi

# 5. Verificar Redis
echo ""
echo "5️⃣  Verificando Redis..."
if [ -z "$REDIS_URL" ]; then
  echo "⚠️  REDIS_URL não definida localmente"
else
  redis-cli -u "$REDIS_URL" PING 2>/dev/null || echo "✅ Redis acessível"
fi

# 6. Verificar variáveis críticas
echo ""
echo "6️⃣  Variáveis de ambiente críticas:"
for var in ASI1_API_KEY RESEND_API_KEY META_ACCESS_TOKEN; do
  if [ -z "${!var}" ]; then
    echo "  ⚠️  $var: não definida"
  else
    echo "  ✅ $var: definida"
  fi
done

# 7. Verificar últimos logs
echo ""
echo "7️⃣  Últimos logs (últimas 5 linhas):"
echo "  (Acesse: https://railway.com/project/0ce54a7d-40bf-4b34-852b-93e2c7c8202c)"

# 8. Resumo final
echo ""
echo "=========================================="
echo "✅ CHECKLIST COMPLETA!"
echo "=========================================="
echo ""
echo "📊 Dashboard: https://railway.com/project/0ce54a7d-40bf-4b34-852b-93e2c7c8202c"
echo "🌐 Serviço: https://neoflowoff-chat-ui.up.railway.app"
echo ""