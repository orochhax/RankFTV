-- Políticas de storage para o bucket 'arenas'.
-- RODAR NO SQL EDITOR DO SUPABASE.

-- Leitura pública (qualquer um pode ver as fotos)
DROP POLICY IF EXISTS "arenas_public_read" ON storage.objects;
CREATE POLICY "arenas_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'arenas');

-- Upload: dono autenticado pode fazer upload nas pastas da sua arena
-- O path tem o formato: {arena_id}/avatar.jpg  ou  {arena_id}/photos/xxx.jpg
-- Verifica que o arena_id no path pertence ao usuário logado
DROP POLICY IF EXISTS "arenas_owner_insert" ON storage.objects;
CREATE POLICY "arenas_owner_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'arenas'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT id FROM arenas WHERE dono_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "arenas_owner_update" ON storage.objects;
CREATE POLICY "arenas_owner_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'arenas'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT id FROM arenas WHERE dono_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "arenas_owner_delete" ON storage.objects;
CREATE POLICY "arenas_owner_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'arenas'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT id FROM arenas WHERE dono_id = auth.uid()
    )
  );
