#!/bin/bash

# Script para limpar base de dados em produção
# Uso: ./clear-db-production.sh [token]

TOKEN="${1:-change-this-token-in-production}"
SERVER_URL="${2:-http://localhost:3000}"

echo "🧹 A limpar base de dados em produção..."
echo "📍 Servidor: $SERVER_URL"

# Limpar via API
RESPONSE=$(curl -s -X DELETE "$SERVER_URL/api/scores/clear?token=$TOKEN")

if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✅ Base de dados limpa com sucesso!"
    echo "$RESPONSE" | grep -o '"singleCount":[0-9]*' | sed 's/"singleCount"://'
    echo "$RESPONSE" | grep -o '"multiCount":[0-9]*' | sed 's/"multiCount"://'
else
    echo "❌ Erro ao limpar base de dados:"
    echo "$RESPONSE"
    exit 1
fi

