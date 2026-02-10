import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { TransactionDetail } from '../../models/processing.model';

@Component({
  selector: 'app-transaction-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './transaction-detail.component.html',
  styleUrl: './transaction-detail.component.scss',
})
export class TransactionDetailComponent {
  transactions = input.required<TransactionDetail[]>();

  formatNumber(value: number): string {
    const rounded = Math.round(value * 100) / 100;
    const parts = rounded.toFixed(2).split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${intPart},${parts[1]}`;
  }
}
