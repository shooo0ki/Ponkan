export type Evaluation = {
  id: string;
  freshman_id: string;
  member_id: string;
  feature_text: string | null;
  score_atmosphere: number | null;
  score_looks: number | null;
  score_commitment: number | null;
  score_want_in: number | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

export type EvaluationWithMember = Omit<Evaluation, 'member_id'> & {
  member: { id: string; name: string };
};
