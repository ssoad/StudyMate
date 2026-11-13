/**
 * Where students send course fees. The single source of truth for the web app.
 * Keep in sync with android/.../ui/components/EnrollmentDialog.kt (PaymentMethodType).
 *
 * PLACEHOLDER VALUES — replace with the real receiving accounts before relying on them.
 */
export type MobileMethod = 'bKash' | 'Nagad' | 'Rocket';
export type PaymentMethod = MobileMethod | 'Bank';

export interface MobileAccount {
  type: string;
  number: string;
  cleanNumber: string;
  steps: string[];
}

export interface BankAccount {
  type: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch: string;
  routingNumber: string;
  steps: string[];
}

export const MOBILE_ACCOUNTS: Record<MobileMethod, MobileAccount> = {
  bKash: {
    type: 'Personal · Send Money',
    number: '01712-345678',
    cleanNumber: '01712345678',
    steps: ['Open the bKash app or dial *247#', 'Choose Send Money', 'Send {amount} to the number above', 'Copy the Transaction ID (TrxID) and enter it below'],
  },
  Nagad: {
    type: 'Personal · Send Money',
    number: '01812-345678',
    cleanNumber: '01812345678',
    steps: ['Open the Nagad app or dial *167#', 'Choose Send Money', 'Send {amount} to the number above', 'Copy the Transaction ID (TrxID) and enter it below'],
  },
  Rocket: {
    type: 'Personal · Send Money',
    number: '01912-345678-9',
    cleanNumber: '019123456789',
    steps: ['Open the Rocket app or dial *322#', 'Choose Send Money', 'Send {amount} to the 12-digit number above', 'Copy the Transaction ID (TrxID) and enter it below'],
  },
};

export const BANK_ACCOUNT: BankAccount = {
  type: 'Direct bank transfer',
  bankName: 'City Bank Ltd',
  accountName: 'StudyMate Academy BD',
  accountNumber: '2301987654001',
  branch: 'Gulshan Branch, Dhaka',
  routingNumber: '225261328',
  steps: ['Transfer {amount} via internet banking, BEFTN, NPSB or a branch deposit', 'Enter your deposit reference below as the Transaction ID'],
};

export const PAYMENT_METHODS: PaymentMethod[] = ['bKash', 'Nagad', 'Rocket', 'Bank'];

export function formatTaka(amount: number): string {
  return `৳${Math.round(amount).toLocaleString('en-US')}`;
}

export function paymentSteps(method: PaymentMethod, amount: number): string[] {
  const steps = method === 'Bank' ? BANK_ACCOUNT.steps : MOBILE_ACCOUNTS[method].steps;
  return steps.map((s) => s.replace('{amount}', formatTaka(amount)));
}
