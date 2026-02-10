import { Empresa } from '../../../shared/models/empresa.model';
import { RawTransaction } from './raw-transaction.model';

export interface ExcelUploadResult {
  empresa: Empresa;
  transactions: RawTransaction[];
  total_rows: number;
}
