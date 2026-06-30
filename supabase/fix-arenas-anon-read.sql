-- Permite que visitantes não logados leiam dados públicos das arenas.
-- A policy "arenas_public_read" USING (true) já existia, faltava o GRANT para anon.
-- RODAR NO SQL EDITOR DO SUPABASE.

GRANT SELECT ON arenas          TO anon;
GRANT SELECT ON arena_students  TO anon;
GRANT SELECT ON arena_classes   TO anon;
GRANT SELECT ON arena_photos    TO anon;
GRANT SELECT ON arena_plans     TO anon;
GRANT SELECT ON platform_config TO anon;
