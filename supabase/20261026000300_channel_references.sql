begin;

alter table public.yt_channel_references
  add column if not exists name text;

delete from public.yt_channel_references
where url not in (
  'https://www.youtube.com/@iamAImaster/videos',
  'https://www.youtube.com/@BenAI92/videos',
  'https://www.youtube.com/@BrockMesarich/videos',
  'https://www.youtube.com/@obrunookamoto/videos',
  'https://www.youtube.com/@deborahfolloni/videos',
  'https://www.youtube.com/@harry.the.marketer/videos',
  'https://www.youtube.com/@ImanGadzhi/videos',
  'https://www.youtube.com/@Orafavoss/videos',
  'https://www.youtube.com/@Sanji_Chien/videos',
  'https://www.youtube.com/@VictorBaggio-AI/videos',
  'https://www.youtube.com/@maestrosdaia/videos'
);

insert into public.yt_channel_references(name, url, kind, notes) values
  ('AI Master', 'https://www.youtube.com/@iamAImaster/videos', 'channel', 'Canal de referência definido pelo proprietário.'),
  ('Ben AI', 'https://www.youtube.com/@BenAI92/videos', 'channel', 'Canal de referência definido pelo proprietário.'),
  ('Brock Mesarich | AI for Non Techies', 'https://www.youtube.com/@BrockMesarich/videos', 'channel', 'Canal de referência definido pelo proprietário.'),
  ('Bruno Okamoto', 'https://www.youtube.com/@obrunookamoto/videos', 'channel', 'Canal de referência definido pelo proprietário.'),
  ('Deborah Folloni', 'https://www.youtube.com/@deborahfolloni/videos', 'channel', 'Canal de referência definido pelo proprietário.'),
  ('Harry Long', 'https://www.youtube.com/@harry.the.marketer/videos', 'channel', 'Canal de referência definido pelo proprietário.'),
  ('Iman Gadzhi', 'https://www.youtube.com/@ImanGadzhi/videos', 'channel', 'Canal de referência definido pelo proprietário.'),
  ('Rafa Voss | IA na Prática', 'https://www.youtube.com/@Orafavoss/videos', 'channel', 'Canal de referência definido pelo proprietário.'),
  ('Sanji Nai-Chien', 'https://www.youtube.com/@Sanji_Chien/videos', 'channel', 'Canal de referência definido pelo proprietário.'),
  ('Victor Baggio | IA para Vendas', 'https://www.youtube.com/@VictorBaggio-AI/videos', 'channel', 'Canal de referência definido pelo proprietário.'),
  ('Maestros da IA', 'https://www.youtube.com/@maestrosdaia/videos', 'channel', 'Canal de referência definido pelo proprietário.')
on conflict (url) do update set
  name = excluded.name,
  kind = excluded.kind,
  notes = excluded.notes;

alter table public.yt_channel_references
  alter column name set not null;

commit;

notify pgrst, 'reload schema';
