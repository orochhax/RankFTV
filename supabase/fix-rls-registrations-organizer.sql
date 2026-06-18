-- Permite que o organizador veja TODAS as inscrições dos seus campeonatos.
-- Sem isso, o painel de Inscrições só mostrava as inscrições do próprio Carlos.

DROP POLICY IF EXISTS registrations_select_organizer ON registrations;

CREATE POLICY registrations_select_organizer ON registrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM championships c
      WHERE c.id = championship_id
        AND c.organizador_id = auth.uid()
    )
  );
