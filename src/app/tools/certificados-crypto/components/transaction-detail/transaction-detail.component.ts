import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { TransactionDetail } from '../../models/processing.model';

@Component({
  selector: 'app-transaction-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="detail-container">
      <div class="detail-header">
        <i class="pi pi-list"></i>
        <span>Detalle de movimientos ({{ transactions().length }})</span>
      </div>
      <table class="detail-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Codigo Orden</th>
            <th class="th-right">Cantidad</th>
            <th class="th-right">TRM</th>
            <th class="th-right">Valor COP</th>
          </tr>
        </thead>
        <tbody>
          @for (tx of transactions(); track tx.order_code) {
            <tr>
              <td>{{ tx.date }}</td>
              <td class="cell-code">{{ tx.order_code }}</td>
              <td class="cell-num">{{ formatNumber(tx.amount) }}</td>
              <td class="cell-num">{{ formatNumber(tx.trm) }}</td>
              <td class="cell-num cell-num--bold">{{ formatNumber(tx.total_price) }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    .detail-container {
      padding: 12px 16px 16px 48px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
    }

    .detail-header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      margin-bottom: 8px;
    }

    .detail-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    .detail-table th {
      padding: 6px 10px;
      text-align: left;
      font-weight: 600;
      color: #64748b;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border-bottom: 1px solid #e2e8f0;
    }

    .th-right {
      text-align: right !important;
    }

    .detail-table td {
      padding: 5px 10px;
      color: #334155;
      border-bottom: 1px solid #f1f5f9;
    }

    .cell-code {
      font-family: 'SF Mono', 'Cascadia Code', monospace;
      font-size: 11px;
      color: #64748b;
    }

    .cell-num {
      text-align: right;
      font-family: 'SF Mono', 'Cascadia Code', monospace;
    }

    .cell-num--bold {
      font-weight: 600;
      color: #1e293b;
    }
  `,
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
