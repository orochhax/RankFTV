#!/usr/bin/env bash
set -euo pipefail

AWS_REGION="us-east-1"
ECR_REPO="fde-ai-platform"
ECS_CLUSTER="fde-production-cluster"

echo "1. Autenticando no Amazon ECR e enviando imagem verificada..."
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
docker build -t "$ECR_REPO:latest" .
docker tag "$ECR_REPO:latest" "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:latest"
docker push "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:latest"

echo "2. Atualizando serviço serverless no Amazon ECS Fargate com Rolling Update..."
aws ecs update-service --cluster "$ECS_CLUSTER" --service "fde-ai-api-service" --force-new-deployment --region "$AWS_REGION"
