-- Galeria de fotos da arena (espaço físico).
-- RODAR NO SQL EDITOR DO SUPABASE.

CREATE TABLE IF NOT EXISTS arena_photos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id   uuid NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  url        text NOT NULL,
  ordem      int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS arena_photos_arena ON arena_photos (arena_id);

ALTER TABLE arena_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "arena_photos_public_read" ON arena_photos;
DROP POLICY IF EXISTS "arena_photos_dono"        ON arena_photos;

CREATE POLICY "arena_photos_public_read" ON arena_photos
  FOR SELECT USING (true);

CREATE POLICY "arena_photos_dono" ON arena_photos
  FOR ALL USING (
    arena_id IN (SELECT id FROM arenas WHERE dono_id = auth.uid())
  ) WITH CHECK (
    arena_id IN (SELECT id FROM arenas WHERE dono_id = auth.uid())
  );

GRANT SELECT ON arena_photos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON arena_photos TO authenticated;

NOTIFY migrations, 'add-arena-photos done';
