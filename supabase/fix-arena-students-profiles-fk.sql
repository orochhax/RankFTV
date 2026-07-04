-- CORREÇÃO DE BUG: o painel do dono da arena não mostrava alunos nem pedidos
-- de entrada. A query usa o embed profiles(nome, username, ...) mas não havia
-- foreign key entre arena_students.user_id e profiles.id — o PostgREST
-- rejeitava a query inteira ("Could not find a relationship").
--
-- profiles.id é o mesmo uuid de auth.users.id (padrão Supabase), então a FK
-- extra é segura: todo aluno tem profile (verificado: 32 vínculos, 0 órfãos).
--
-- RODAR NO SQL EDITOR DO SUPABASE.

ALTER TABLE arena_students
  DROP CONSTRAINT IF EXISTS arena_students_user_id_profiles_fkey;

ALTER TABLE arena_students
  ADD CONSTRAINT arena_students_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Recarrega o cache de schema do PostgREST para o embed passar a funcionar
-- imediatamente, sem esperar o reload automático.
NOTIFY pgrst, 'reload schema';
