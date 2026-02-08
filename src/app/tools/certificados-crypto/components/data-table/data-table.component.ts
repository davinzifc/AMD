import { Component, ChangeDetectionStrategy, input, model, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { InputText } from 'primeng/inputtext';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { ColombianCurrencyPipe } from '../../../../shared/pipes/colombian-currency.pipe';
import { RawTransaction } from '../../models/raw-transaction.model';

@Component({
  selector: 'app-data-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TableModule, InputText, IconField, InputIcon, ColombianCurrencyPipe],
  template: `
    <div class="table-toolbar">
      <p-iconfield>
        <p-inputicon styleClass="pi pi-search" />
        <input
          pInputText
          type="text"
          placeholder="Buscar por ID o Nombre..."
          [(ngModel)]="filterValue"
          (input)="onFilter()" />
      </p-iconfield>
      <span class="table-count">
        {{ transactions().length }} registros
        @if (selected().length > 0) {
          &middot; {{ selected().length }} seleccionados
        }
      </span>
    </div>

    <p-table
      #dt
      [value]="transactions()"
      [paginator]="true"
      [rows]="50"
      [rowsPerPageOptions]="[25, 50, 100]"
      [(selection)]="selected"
      [globalFilterFields]="['id', 'third_name']"
      [scrollable]="true"
      scrollHeight="480px"
      dataKey="row_number"
      styleClass="p-datatable-sm p-datatable-gridlines">

      <ng-template #header>
        <tr>
          <th style="width: 3.5rem">
            <p-tableHeaderCheckbox />
          </th>
          <th pSortableColumn="row_number" style="width: 5rem">
            Fila <p-sortIcon field="row_number" />
          </th>
          <th pSortableColumn="order_code">
            ORDER_CODE <p-sortIcon field="order_code" />
          </th>
          <th pSortableColumn="id">
            ID <p-sortIcon field="id" />
          </th>
          <th pSortableColumn="third_name">
            THIRD_NAME <p-sortIcon field="third_name" />
          </th>
          <th pSortableColumn="city">
            CITY <p-sortIcon field="city" />
          </th>
          <th pSortableColumn="total_price" style="text-align: right">
            TOTAL_PRICE <p-sortIcon field="total_price" />
          </th>
          <th pSortableColumn="trm" style="text-align: right">
            TRM <p-sortIcon field="trm" />
          </th>
          <th pSortableColumn="amount" style="text-align: right">
            AMOUNT <p-sortIcon field="amount" />
          </th>
          <th pSortableColumn="date">
            DATE <p-sortIcon field="date" />
          </th>
        </tr>
      </ng-template>

      <ng-template #body let-tx>
        <tr>
          <td>
            <p-tableCheckbox [value]="tx" />
          </td>
          <td class="cell-muted">{{ tx.row_number }}</td>
          <td>{{ tx.order_code }}</td>
          <td class="cell-mono">{{ tx.id }}</td>
          <td>{{ tx.third_name }}</td>
          <td>{{ tx.city }}</td>
          <td class="cell-number">{{ tx.total_price | colombianCurrency }}</td>
          <td class="cell-number">{{ tx.trm | colombianCurrency }}</td>
          <td class="cell-number">{{ tx.amount | colombianCurrency:6 }}</td>
          <td>{{ tx.date }}</td>
        </tr>
      </ng-template>

      <ng-template #emptymessage>
        <tr>
          <td colspan="10" class="cell-empty">
            No se encontraron registros
          </td>
        </tr>
      </ng-template>
    </p-table>
  `,
  styles: `
    .table-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      gap: 12px;
    }

    .table-count {
      font-size: 13px;
      color: #64748b;
      white-space: nowrap;
    }

    .cell-muted {
      color: #94a3b8;
      font-size: 12px;
    }

    .cell-mono {
      font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', monospace;
      font-size: 12px;
    }

    .cell-number {
      text-align: right;
      font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', monospace;
      font-size: 12px;
      font-variant-numeric: tabular-nums;
    }

    .cell-empty {
      text-align: center;
      color: #94a3b8;
      padding: 32px !important;
    }

    :host ::ng-deep {
      .p-datatable .p-datatable-thead > tr > th {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        color: #475569;
        background: #f8fafc;
        border-color: #e2e8f0;
      }

      .p-datatable .p-datatable-tbody > tr > td {
        font-size: 13px;
        border-color: #f1f5f9;
        padding: 8px 12px;
      }

      .p-datatable .p-datatable-tbody > tr:hover {
        background: #f8fafc;
      }

      .p-datatable .p-datatable-tbody > tr.p-highlight {
        background: #eff6ff;
      }
    }
  `,
})
export class DataTableComponent {
  transactions = input.required<RawTransaction[]>();
  selected = model<RawTransaction[]>([]);

  filterValue = '';
  dt = viewChild.required<Table>('dt');

  onFilter() {
    this.dt().filterGlobal(this.filterValue, 'contains');
  }
}
