CREATE TABLE IF NOT EXISTS clientes_leads (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    telefone VARCHAR(30),
    empresa VARCHAR(150),
    score_qualificacao INT DEFAULT 0,
    status_atendimento VARCHAR(50) DEFAULT 'pendente',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_leads_score ON clientes_leads(score_qualificacao DESC);
