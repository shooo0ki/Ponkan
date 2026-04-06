-- Migration 001: Initial Schema
-- Created: 2026-04-07
-- Description: 全テーブル・インデックス・トリガーの初期作成

CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  is_phone_staff BOOLEAN NOT NULL DEFAULT false,
  is_leader BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS freshmen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  alldc_flag BOOLEAN NOT NULL DEFAULT false,
  status_line_done BOOLEAN NOT NULL DEFAULT false,
  apo_label VARCHAR(20) CHECK (apo_label IN ('アポ獲得', '後日電話', '後日カフェ', '音信不通')),
  apo_date DATE,
  apo_time VARCHAR(5) CHECK (apo_time IN ('20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00')),
  ketsu_done BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES members(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_freshmen_alldc_flag ON freshmen(alldc_flag);
CREATE INDEX IF NOT EXISTS idx_freshmen_apo_label ON freshmen(apo_label);
CREATE INDEX IF NOT EXISTS idx_freshmen_ketsu_done ON freshmen(ketsu_done);

CREATE TABLE IF NOT EXISTS evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freshman_id UUID NOT NULL REFERENCES freshmen(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id),
  feature_text TEXT,
  score_atmosphere SMALLINT CHECK (score_atmosphere BETWEEN 1 AND 5),
  score_looks SMALLINT CHECK (score_looks BETWEEN 1 AND 5),
  score_commitment SMALLINT CHECK (score_commitment BETWEEN 1 AND 5),
  score_want_in SMALLINT CHECK (score_want_in BETWEEN 1 AND 5),
  memo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(freshman_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_evaluations_freshman_id ON evaluations(freshman_id);

CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freshman_id UUID NOT NULL REFERENCES freshmen(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(freshman_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_assignments_member_id ON assignments(member_id);
CREATE INDEX IF NOT EXISTS idx_assignments_freshman_id ON assignments(freshman_id);

CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freshman_id_1 UUID NOT NULL REFERENCES freshmen(id) ON DELETE CASCADE,
  freshman_id_2 UUID NOT NULL REFERENCES freshmen(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(freshman_id_1, freshman_id_2),
  CHECK (freshman_id_1 < freshman_id_2)
);

CREATE TABLE IF NOT EXISTS line_screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freshman_id UUID NOT NULL REFERENCES freshmen(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES members(id),
  image_url VARCHAR(500) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_line_screenshots_freshman_id ON line_screenshots(freshman_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_freshmen_updated_at
  BEFORE UPDATE ON freshmen
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_evaluations_updated_at
  BEFORE UPDATE ON evaluations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
