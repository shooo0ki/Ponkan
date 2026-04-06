export type ApoLabel = 'LINE送信済み' | 'アポ獲得' | '後日カフェ' | '音信不通';
export type ApoTime =
  | '10:00' | '10:30' | '11:00' | '11:30' | '12:00' | '12:30' | '13:00' | '13:30'
  | '14:00' | '14:30' | '15:00' | '15:30' | '16:00' | '16:30' | '17:00'
  | '20:00' | '20:30' | '21:00' | '21:30' | '22:00' | '22:30' | '23:00';

export type Freshman = {
  id: string;
  name: string;
  department: string | null;
  alldc_flag: boolean;
  status_line_done: boolean;
  apo_label: ApoLabel | null;
  apo_date: string | null; // 'YYYY-MM-DD'
  apo_time: ApoTime | null;
  ketsu_done: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

// For list view (includes computed fields)
export type FreshmanListItem = Freshman & {
  assignees: Array<{ id: string; name: string }>;
  avg_score_want_in: number | null;
};

// For detail view
export type FreshmanDetail = Freshman & {
  assignees: Array<{ id: string; name: string }>;
  friends: Array<{ id: string; name: string }>;
};

export type FreshmanSummary = {
  total: number;
  line_done: number;
  apo_done: number;
  ketsu_done: number;
};
