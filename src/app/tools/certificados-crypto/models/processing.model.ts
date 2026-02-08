export interface TransactionDetail {
  date: string;
  order_code: string;
  amount: number;
  trm: number;
  total_price: number;
}

export interface ProcessedGroup {
  id: string;
  third_name: string;
  city: string;
  date_range: string;
  total_amount: number;
  total_price: number;
  retencion: string;
  transactions: TransactionDetail[];
  has_multiple_transactions: boolean;
}

export interface ValidationError {
  id: string;
  third_name: string;
  error_type: string;
  details: string;
  affected_rows: number[];
}

export interface ProgressPayload {
  stage: string;
  current_id: string | null;
  current_order_code: string | null;
  current: number;
  total: number;
  percentage: number;
}

export interface ProcessingResult {
  valid_groups: ProcessedGroup[];
  validation_errors: ValidationError[];
  total_processed: number;
  total_valid: number;
  total_invalid: number;
}
