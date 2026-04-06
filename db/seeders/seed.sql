-- ぽんかん2026 メンバー初期データ
-- Supabase SQL Editor で実行

INSERT INTO members (name, is_phone_staff, is_leader) VALUES
  ('しょーき', false, true),
  ('ここね',   true,  true),
  ('ほりこう', false, false),
  ('かながわ', false, false),
  ('なぎさ',   true,  false),
  ('しおり',   true,  false),
  ('めいな',   true,  false),
  ('ゆうな',   true,  false),
  ('ゆうみ',   true,  false)
ON CONFLICT (name) DO NOTHING;
