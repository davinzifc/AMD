import { Injectable, signal } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { Empresa } from './empresa.service';
import { RawTransaction } from '../models/raw-transaction.model';
import { ExcelUploadResult } from '../models/excel-upload-result.model';
import { ProcessingResult, ProgressPayload } from '../models/processing.model';

@Injectable({ providedIn: 'root' })
export class CryptoReportService {
  private readonly _transactions = signal<RawTransaction[]>([]);
  private readonly _empresa = signal<Empresa | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  // Processing state
  private readonly _progress = signal<ProgressPayload | null>(null);
  private readonly _processingResult = signal<ProcessingResult | null>(null);
  private readonly _isProcessing = signal(false);

  readonly transactions = this._transactions.asReadonly();
  readonly empresa = this._empresa.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly progress = this._progress.asReadonly();
  readonly processingResult = this._processingResult.asReadonly();
  readonly isProcessing = this._isProcessing.asReadonly();

  async uploadExcel(filePath: string): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const result = await invoke<ExcelUploadResult>('upload_excel', {
        filePath,
      });
      this._transactions.set(result.transactions);
      this._empresa.set(result.empresa);
    } catch (err) {
      this._error.set(String(err));
      throw err;
    } finally {
      this._loading.set(false);
    }
  }

  async processSelected(
    transactions: RawTransaction[],
    selectedIds: string[]
  ): Promise<ProcessingResult> {
    this._isProcessing.set(true);
    this._progress.set(null);
    this._processingResult.set(null);
    this._error.set(null);

    let unlisten: UnlistenFn | null = null;

    try {
      unlisten = await listen<ProgressPayload>(
        'processing-progress',
        (event) => {
          this._progress.set(event.payload);
        }
      );

      const result = await invoke<ProcessingResult>(
        'process_selected_records',
        { transactions, selectedIds }
      );

      this._processingResult.set(result);
      return result;
    } catch (err) {
      this._error.set(String(err));
      throw err;
    } finally {
      if (unlisten) unlisten();
      this._isProcessing.set(false);
    }
  }

  reset() {
    this._transactions.set([]);
    this._empresa.set(null);
    this._loading.set(false);
    this._error.set(null);
    this._progress.set(null);
    this._processingResult.set(null);
    this._isProcessing.set(false);
  }
}
