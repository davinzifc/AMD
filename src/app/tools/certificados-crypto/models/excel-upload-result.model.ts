import { Empresa } from '../services/empresa.service';
import { RawTransaction } from './raw-transaction.model';

export interface ExcelUploadResult {
  empresa: Empresa;
  transactions: RawTransaction[];
  total_rows: number;
}
