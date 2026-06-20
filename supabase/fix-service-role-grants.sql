-- =============================================================
-- FIX — service_role sem permissão de escrita ("permission denied
-- for table ...") apesar de ser usado pelo admin client.
--
-- Sintoma: o admin client (service_role) consegue SELECT mas falha
-- em UPDATE/DELETE/INSERT com "permission denied for table X".
-- Causa: o role service_role ficou sem os GRANTs de escrita no schema
-- public (some quando se mexe em grants/migrações).
--
-- Roda no SQL Editor do Supabase. Seguro rodar mais de uma vez.
-- =============================================================

-- Concede tudo no que já existe hoje
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- Garante que tabelas/sequences criadas no futuro também já nasçam liberadas
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

-- (Opcional, mas recomendado) reaplica os papéis padrão do Supabase
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Recarrega o cache do PostgREST
NOTIFY pgrst, 'reload schema';
