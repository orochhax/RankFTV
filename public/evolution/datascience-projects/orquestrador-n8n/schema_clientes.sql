CREATE TABLE IF NOT EXISTS fde_tenants (
    tenant_id VARCHAR(50) PRIMARY KEY,
    nome_empresa VARCHAR(150) NOT NULL,
    segmento VARCHAR(80) NOT NULL,
    sla_maximo_minutos INT DEFAULT 15,
    custo_hora_operador_brl NUMERIC(10,2) DEFAULT 65.00
);

CREATE TABLE IF NOT EXISTS fde_atendimentos_operacionais (
    id SERIAL PRIMARY KEY,
    protocolo VARCHAR(40) UNIQUE NOT NULL,
    tenant_id VARCHAR(50) REFERENCES fde_tenants(tenant_id),
    cliente_nome VARCHAR(150) NOT NULL,
    cliente_telefone VARCHAR(30) NOT NULL,
    categoria_demanda VARCHAR(80) NOT NULL,
    valor_envolvido_brl NUMERIC(12,2) DEFAULT 0,
    confianca_classificacao NUMERIC(4,2) NOT NULL,
    resolvido_automaticamente BOOLEAN DEFAULT FALSE,
    escalado_humano BOOLEAN DEFAULT FALSE,
    tempo_resolucao_segundos INT NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Query Analítica com Window Function para Auditoria de SLA e Cálculo de ROI FDE:
CREATE OR REPLACE VIEW vw_fde_roi_por_tenant AS
SELECT
    t.tenant_id,
    t.nome_empresa,
    COUNT(a.id) AS total_chamados,
    SUM(CASE WHEN a.resolvido_automaticamente THEN 1 ELSE 0 END) AS resolvidos_ia,
    ROUND(AVG(a.tempo_resolucao_segundos) / 60.0, 2) AS tempo_medio_minutos,
    RANK() OVER (ORDER BY SUM(CASE WHEN a.resolvido_automaticamente THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(a.id), 0) DESC) AS ranking_automacao
FROM fde_tenants t
LEFT JOIN fde_atendimentos_operacionais a ON a.tenant_id = t.tenant_id
GROUP BY t.tenant_id, t.nome_empresa;
