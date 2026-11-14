import { supabase } from './supabase';

/**
 * Payment methods students use to pay course fees. Managed by admins in
 * Admin → Payments and stored in the payment_methods table:
 * rows with course_id = null apply to every course; rows with a course_id apply to
 * that course only and, when present, replace the global list for it.
 */
export type PaymentKind = 'mobile' | 'bank' | 'other';

export interface PaymentMethod {
  id: string;
  course_id: string | null;
  label: string;
  kind: PaymentKind;
  account_type: string;
  account_name: string;
  account_number: string;
  /** One step per line; "{amount}" is replaced with the course fee. */
  instructions: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export type PaymentMethodInput = Omit<PaymentMethod, 'id' | 'created_at' | 'updated_at'>;

const COLUMNS = 'id, course_id, label, kind, account_type, account_name, account_number, instructions, is_active, sort_order, created_at, updated_at';

export function formatTaka(amount: number): string {
  return `৳${Math.round(amount).toLocaleString('en-US')}`;
}

/** Instruction lines with {amount} filled in. */
export function paymentSteps(method: PaymentMethod, amount: number): string[] {
  return method.instructions
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replaceAll('{amount}', formatTaka(amount)));
}

/** Digits only, for copying into a payment app. */
export function cleanAccountNumber(n: string): string {
  return n.replace(/[^0-9A-Za-z]/g, '');
}

export const paymentService = {
  /** Active methods for a course: its own methods if it has any, otherwise the global ones. */
  async forCourse(courseId: string): Promise<PaymentMethod[]> {
    const { data, error } = await supabase!
      .from('payment_methods')
      .select(COLUMNS)
      .eq('is_active', true)
      .or(`course_id.is.null,course_id.eq.${courseId}`)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error || !data) return [];
    const rows = data as PaymentMethod[];
    const specific = rows.filter((m) => m.course_id === courseId);
    return specific.length > 0 ? specific : rows.filter((m) => m.course_id === null);
  },

  /** Admin: every method, active or not. */
  async listAll(): Promise<{ data: PaymentMethod[]; error: string | null }> {
    const { data, error } = await supabase!
      .from('payment_methods')
      .select(COLUMNS)
      .order('course_id', { ascending: true, nullsFirst: true })
      .order('sort_order', { ascending: true });
    return { data: (data as PaymentMethod[]) ?? [], error: error?.message ?? null };
  },

  async create(input: PaymentMethodInput) {
    return supabase!.from('payment_methods').insert(input).select(COLUMNS).single();
  },

  async update(id: string, input: Partial<PaymentMethodInput>) {
    return supabase!
      .from('payment_methods')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(COLUMNS)
      .single();
  },

  async remove(id: string) {
    return supabase!.from('payment_methods').delete().eq('id', id);
  },
};

/** Starting instructions for a new method of each kind (admins can edit them). */
export const DEFAULT_STEPS: Record<PaymentKind, string> = {
  mobile: 'Open the app or dial the USSD code\nChoose Send Money\nSend {amount} to the number above\nCopy the Transaction ID (TrxID) and enter it below',
  bank: 'Transfer {amount} via internet banking, BEFTN, NPSB or a branch deposit\nEnter your deposit reference below as the Transaction ID',
  other: 'Send {amount} using the details above\nEnter your payment reference below',
};
