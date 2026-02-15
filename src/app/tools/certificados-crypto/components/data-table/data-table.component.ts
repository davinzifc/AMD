import {
  Component,
  ChangeDetectionStrategy,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
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
  imports: [
    FormsModule,
    TableModule,
    InputText,
    IconField,
    InputIcon,
    ColombianCurrencyPipe,
  ],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
})
export class DataTableComponent {
  transactions = input.required<RawTransaction[]>();
  selected = model<RawTransaction[]>([]);

  filterValue = '';
  dt = viewChild.required<Table>('dt');

  onFilter() {
    this.dt().filterGlobal(this.filterValue, 'contains');
  }

  formatNumber(value: number): string {
    const rounded = Math.round(value * 100) / 100;
    const parts = rounded.toFixed(2).split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${intPart},${parts[1]}`;
  }
}
