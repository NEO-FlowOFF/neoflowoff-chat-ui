#!/bin/bash
echo "🔍 Verificando possíveis vazamentos de secrets..."
grep -r "sk-[a-zA-Z0-9]" --exclude-dir=secrets --exclude-dir=.git ~/neomello/ 2>/dev/null
grep -r "ghp_[a-zA-Z0-9]" --exclude-dir=secrets --exclude-dir=.git ~/neomello/ 2>/dev/null
echo "✅ Verificação concluída"
