export interface Institution {
  id: string
  plaid_account_id: string
  institution_id: string
  name: string
  item_id: string
  created_at: string
}

export interface BankAccountInput {
  account_id: string;
  name: string | null;
  mask: string | null;
  official_name: string | null;
  subtype: string | null;
  type: string | null;
}

export interface BankAccount {
  id: string;
  ins_id: string;
  account_id: string;
  name: string | null;
  mask: string | null;
  official_name: string | null;
  subtype: string | null;
  type: string | null;
  created_at: string;
}