import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  severity: 'success' | 'info' | 'warn' | 'error';
  summary: string;
  detail?: string;
  life?: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly _message = signal<ToastMessage | null>(null);
  readonly message = this._message.asReadonly();

  success(summary: string, detail?: string) {
    this._message.set({ severity: 'success', summary, detail, life: 4000 });
  }

  error(summary: string, detail?: string) {
    this._message.set({ severity: 'error', summary, detail, life: 6000 });
  }

  info(summary: string, detail?: string) {
    this._message.set({ severity: 'info', summary, detail, life: 4000 });
  }

  warn(summary: string, detail?: string) {
    this._message.set({ severity: 'warn', summary, detail, life: 5000 });
  }

  clear() {
    this._message.set(null);
  }
}
