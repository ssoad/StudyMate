import { supabase } from './supabase';

/**
 * Study plans: anyone signed in can create plans; plans can be private, shared by
 * link ("unlisted") or listed publicly. Admins can mark plans official. Following a
 * plan adds it to your library and gives you your own progress on its days.
 * Tables: study_plans, study_plan_days, study_plan_members, study_plan_progress.
 */
export type PlanVisibility = 'private' | 'unlisted' | 'public';

export interface StudyPlan {
  id: string;
  owner_id: string | null;
  title: string;
  description: string;
  visibility: PlanVisibility;
  is_official: boolean;
  share_code: string;
  copied_from: string | null;
  created_at: string;
  updated_at: string;
  owner?: { full_name: string | null } | null;
}

export interface PlanDay {
  id: string;
  plan_id: string;
  week: number;
  day: number;
  phase: string;
  subject: string;
  module: string;
  detailed_topics: string;
  hours: number;
  mcq_target: number;
  written_target: number;
  pyq_target: number;
  practice_checklist: string;
  daily_deliverable: string;
  source: string;
}

export type PlanDayInput = Omit<PlanDay, 'id' | 'plan_id'>;

export interface PublicPlanSummary {
  id: string;
  title: string;
  description: string;
  is_official: boolean;
  owner_name: string;
  share_code: string;
  day_count: number;
  follower_count: number;
  updated_at: string;
}

export interface PlanByCode {
  id: string;
  title: string;
  description: string;
  visibility: PlanVisibility;
  is_official: boolean;
  owner_name: string;
  day_count: number;
  created_at: string;
}

/** A plan in the user's library, with their progress. */
export interface LibraryPlan extends StudyPlan {
  relation: 'owner' | 'following';
  day_count: number;
  done_count: number;
}

const PLAN_COLUMNS = 'id, owner_id, title, description, visibility, is_official, share_code, copied_from, created_at, updated_at';
const DAY_COLUMNS =
  'id, plan_id, week, day, phase, subject, module, detailed_topics, hours, mcq_target, written_target, pyq_target, practice_checklist, daily_deliverable, source';

export const VISIBILITY_LABEL: Record<PlanVisibility, string> = {
  private: 'Private',
  unlisted: 'Link only',
  public: 'Public',
};

export const VISIBILITY_HELP: Record<PlanVisibility, string> = {
  private: 'Only you can see it.',
  unlisted: 'Anyone with the link can view and add it.',
  public: 'Listed in Browse for everyone.',
};

export function emptyDay(prev?: PlanDayInput): PlanDayInput {
  return {
    week: prev?.week ?? 1,
    day: prev ? prev.day + 1 : 1,
    phase: prev?.phase ?? '',
    subject: '',
    module: '',
    detailed_topics: '',
    hours: prev?.hours ?? 2,
    mcq_target: 0,
    written_target: 0,
    pyq_target: 0,
    practice_checklist: '',
    daily_deliverable: '',
    source: '',
  };
}

export function shareUrl(code: string): string {
  return `${window.location.origin}/study-plan/join/${code}`;
}

/** Sort key: week, then day. */
export function byWeekDay(a: Pick<PlanDay, 'week' | 'day'>, b: Pick<PlanDay, 'week' | 'day'>) {
  return a.week - b.week || a.day - b.day;
}

function errMessage(error: unknown): string {
  if (!error) return 'Something went wrong';
  if (typeof error === 'object' && error && 'message' in error) return String((error as { message: unknown }).message);
  return String(error);
}

export const studyPlanService = {
  /** Plans you own plus plans you follow, with your progress on each. */
  async library(userId: string): Promise<LibraryPlan[]> {
    const [owned, followed] = await Promise.all([
      supabase!.from('study_plans').select(PLAN_COLUMNS).eq('owner_id', userId).order('updated_at', { ascending: false }),
      supabase!.from('study_plan_members').select(`added_at, plan:study_plans(${PLAN_COLUMNS})`).eq('user_id', userId).order('added_at', { ascending: false }),
    ]);
    const plans: LibraryPlan[] = [];
    for (const p of (owned.data ?? []) as StudyPlan[]) plans.push({ ...p, relation: 'owner', day_count: 0, done_count: 0 });
    for (const row of (followed.data ?? []) as unknown as { plan: StudyPlan | null }[]) {
      if (row.plan && !plans.some((p) => p.id === row.plan!.id)) {
        plans.push({ ...row.plan, relation: 'following', day_count: 0, done_count: 0 });
      }
    }
    if (plans.length === 0) return plans;

    const ids = plans.map((p) => p.id);
    const { data: days } = await supabase!.from('study_plan_days').select('id, plan_id').in('plan_id', ids);
    const dayIds = (days ?? []).map((d) => d.id as string);
    const done = new Set<string>();
    if (dayIds.length) {
      // Chunk to keep URLs short for big plans.
      for (let i = 0; i < dayIds.length; i += 150) {
        const { data } = await supabase!
          .from('study_plan_progress')
          .select('day_id')
          .eq('user_id', userId)
          .in('day_id', dayIds.slice(i, i + 150));
        for (const r of data ?? []) done.add(r.day_id as string);
      }
    }
    for (const d of days ?? []) {
      const plan = plans.find((p) => p.id === d.plan_id);
      if (!plan) continue;
      plan.day_count += 1;
      if (done.has(d.id as string)) plan.done_count += 1;
    }
    return plans;
  },

  async listPublic(): Promise<PublicPlanSummary[]> {
    const { data } = await supabase!.rpc('list_public_study_plans');
    return ((data ?? []) as PublicPlanSummary[]).map((p) => ({ ...p, day_count: Number(p.day_count), follower_count: Number(p.follower_count) }));
  },

  async get(planId: string): Promise<{ plan: StudyPlan | null; days: PlanDay[] }> {
    const [{ data: plan }, { data: days }] = await Promise.all([
      supabase!.from('study_plans').select(`${PLAN_COLUMNS}, owner:profiles!study_plans_owner_id_fkey(full_name)`).eq('id', planId).maybeSingle(),
      supabase!.from('study_plan_days').select(DAY_COLUMNS).eq('plan_id', planId),
    ]);
    return { plan: (plan as StudyPlan | null) ?? null, days: ((days ?? []) as PlanDay[]).sort(byWeekDay) };
  },

  async getByCode(code: string): Promise<PlanByCode | null> {
    const { data } = await supabase!.rpc('get_study_plan_by_code', { p_code: code });
    const row = (data as PlanByCode[] | null)?.[0];
    return row ? { ...row, day_count: Number(row.day_count) } : null;
  },

  async isFollowing(userId: string, planId: string): Promise<boolean> {
    const { data } = await supabase!.from('study_plan_members').select('plan_id').eq('user_id', userId).eq('plan_id', planId).maybeSingle();
    return !!data;
  },

  async follow(userId: string, planId: string): Promise<string | null> {
    const { error } = await supabase!.from('study_plan_members').insert({ user_id: userId, plan_id: planId });
    return error && error.code !== '23505' ? errMessage(error) : null;
  },

  async joinByCode(code: string): Promise<{ planId: string | null; error: string | null }> {
    const { data, error } = await supabase!.rpc('join_study_plan', { p_code: code });
    return { planId: (data as string | null) ?? null, error: error ? errMessage(error) : null };
  },

  async unfollow(userId: string, planId: string): Promise<string | null> {
    const { error } = await supabase!.from('study_plan_members').delete().eq('user_id', userId).eq('plan_id', planId);
    return error ? errMessage(error) : null;
  },

  async copy(planId: string): Promise<{ planId: string | null; error: string | null }> {
    const { data, error } = await supabase!.rpc('copy_study_plan', { p_plan_id: planId });
    return { planId: (data as string | null) ?? null, error: error ? errMessage(error) : null };
  },

  async create(input: { title: string; description: string; visibility: PlanVisibility; is_official?: boolean; owner_id: string }) {
    const { data, error } = await supabase!.from('study_plans').insert(input).select(PLAN_COLUMNS).single();
    return { plan: (data as StudyPlan | null) ?? null, error: error ? errMessage(error) : null };
  },

  async update(planId: string, input: Partial<Pick<StudyPlan, 'title' | 'description' | 'visibility' | 'is_official'>>) {
    const { error } = await supabase!.from('study_plans').update(input).eq('id', planId);
    return error ? errMessage(error) : null;
  },

  async remove(planId: string) {
    const { error } = await supabase!.from('study_plans').delete().eq('id', planId);
    return error ? errMessage(error) : null;
  },

  /** Replace all days of a plan (used by the editor and the spreadsheet import). */
  async saveDays(planId: string, days: (PlanDayInput & { id?: string })[]): Promise<string | null> {
    const { data: existing } = await supabase!.from('study_plan_days').select('id').eq('plan_id', planId);
    const keep = new Set(days.filter((d) => d.id).map((d) => d.id));
    const toDelete = (existing ?? []).map((r) => r.id as string).filter((id) => !keep.has(id));
    if (toDelete.length) {
      const { error } = await supabase!.from('study_plan_days').delete().in('id', toDelete);
      if (error) return errMessage(error);
    }
    const rows = days.map(({ id, ...d }) => ({ ...(id ? { id } : {}), ...d, plan_id: planId }));
    const updates = rows.filter((r) => 'id' in r);
    const inserts = rows.filter((r) => !('id' in r));
    if (updates.length) {
      const { error } = await supabase!.from('study_plan_days').upsert(updates);
      if (error) return errMessage(error);
    }
    if (inserts.length) {
      const { error } = await supabase!.from('study_plan_days').insert(inserts);
      if (error) return errMessage(error);
    }
    // Bump updated_at so followers see it as changed.
    await supabase!.from('study_plans').update({ updated_at: new Date().toISOString() }).eq('id', planId);
    return null;
  },

  async completedDayIds(userId: string, dayIds: string[]): Promise<Set<string>> {
    const done = new Set<string>();
    for (let i = 0; i < dayIds.length; i += 150) {
      const { data } = await supabase!.from('study_plan_progress').select('day_id').eq('user_id', userId).in('day_id', dayIds.slice(i, i + 150));
      for (const r of data ?? []) done.add(r.day_id as string);
    }
    return done;
  },

  async setDayDone(userId: string, dayId: string, done: boolean): Promise<string | null> {
    const { error } = done
      ? await supabase!.from('study_plan_progress').insert({ user_id: userId, day_id: dayId })
      : await supabase!.from('study_plan_progress').delete().eq('user_id', userId).eq('day_id', dayId);
    return error && error.code !== '23505' ? errMessage(error) : null;
  },

  /** The first unfinished day across the user's plans (owned first), for the dashboard. */
  async nextUp(userId: string): Promise<{ plan: LibraryPlan; day: PlanDay } | null> {
    const library = await this.library(userId);
    for (const plan of library.filter((p) => p.day_count > p.done_count)) {
      const { days } = await this.get(plan.id);
      const done = await this.completedDayIds(userId, days.map((d) => d.id));
      const next = days.find((d) => !done.has(d.id));
      if (next) return { plan, day: next };
    }
    return null;
  },
};

/** Parse a spreadsheet (CSV/XLSX) in the long-standing column order into plan days. */
export async function parsePlanSpreadsheet(file: File): Promise<PlanDayInput[]> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(await file.arrayBuffer());
  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
  const out: PlanDayInput[] = [];
  for (let i = 1; i < rows.length; i++) {
    const c = rows[i] as unknown[] | undefined;
    if (!c || c.length === 0) continue;
    const first = String(c[0] ?? '').trim();
    if (!first || first.startsWith('Phase')) continue;
    const s = (n: number) => String(c[n] ?? '').trim();
    const n = (k: number) => Math.max(0, Number(c[k]) || 0);
    out.push({
      week: Math.max(1, n(0)) || 1,
      day: Math.max(1, n(1)) || 1,
      phase: s(2),
      subject: s(3),
      module: s(4),
      detailed_topics: s(5),
      hours: Math.min(24, n(6)),
      mcq_target: n(7),
      written_target: n(8),
      pyq_target: n(9),
      practice_checklist: s(10),
      daily_deliverable: s(11),
      source: s(14),
    });
  }
  return out;
}
