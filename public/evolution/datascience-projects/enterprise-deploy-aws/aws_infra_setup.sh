#!/usr/bin/env bash
set -euo pipefail

echo "Configurando infraestrutura para servicos de IA na AWS..."
AWS_REGION="us-east-1"
APP_NAME="evolution-ai-platform"

# Criar bucket S3 para dados e artefatos de IA
aws s3 mb s3://${APP_NAME}-artifacts-${AWS_REGION} --region ${AWS_REGION} || true

echo "Infraestrutura provisionada com sucesso."
