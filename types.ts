
export interface BankAccount {
  bankName: string;
  accountNo: string;
}

export interface Participant {
  id: string;
  name: string;
  paymentDetails?: {
    twd?: {
      linePay?: boolean;
      ipass?: boolean;
      banks?: BankAccount[];
    };
    hkd?: {
      fpsTel?: string;
      paymeTel?: string;
      banks?: BankAccount[];
    };
    other?: {
      banks?: BankAccount[];
    };
  };
}

export interface ExpenseParticipant {
  userId: string;
  hasPaidBack: boolean;
  selectedPaymentMethod?: string | null; // The payment method used when settling
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  exchangeRate: number; // Rate to HKD (e.g. 1 JPY = 0.052 HKD)
  amountInBase: number; // Pre-calculated HKD value
  payerId: string;
  participants: ExpenseParticipant[];
  date: number;
}

export interface Debt {
  from: string;
  to: string;
  amount: number;
}

export interface GeminiSplitResult {
  description: string;
  amount: number;
  payerName: string;
  participantNames: string[];
}

export interface Trip {
  id: string;
  name: string;
  icon?: string;
  participants: Participant[];
  expenses: Expense[];
  createdAt: number;
}
