import { Component, ChangeDetectionStrategy, input, computed, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { InputText } from 'primeng/inputtext';
import { RawTransaction } from '../../models/raw-transaction.model';

export interface ThirdParty {
  id: string;
  third_name: string;
}

@Component({
  selector: 'app-third-party-selector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TableModule, InputText, FormsModule],
  template: `
    <div class="selector-container">
      <div class="selector-toolbar">
        <div class="search-box">
          <i class="pi pi-search"></i>
          <input
            pInputText
            type="text"
            [ngModel]="filterText()"
            (ngModelChange)="filterText.set($event)"
            placeholder="Buscar por ID o nombre..."
            class="search-input" />
        </div>
        <span class="selector-count">
          {{ selectedItems().length }} de {{ uniqueThirdParties().length }} terceros seleccionados
        </span>
      </div>

      <p-table
        [value]="filteredParties()"
        [selection]="selectedItems()"
        (selectionChange)="onSelectionChange($event)"
        dataKey="id"
        [paginator]="filteredParties().length > 20"
        [rows]="20"
        [rowsPerPageOptions]="[10, 20, 50]">

        <ng-template #header>
          <tr>
            <th style="width: 3rem">
              <p-tableHeaderCheckbox />
            </th>
            <th pSortableColumn="id">ID <p-sortIcon field="id" /></th>
            <th pSortableColumn="third_name">Nombre del Tercero <p-sortIcon field="third_name" /></th>
          </tr>
        </ng-template>

        <ng-template #body let-party>
          <tr>
            <td>
              <p-tableCheckbox [value]="party" />
            </td>
            <td class="cell-id">{{ party.id }}</td>
            <td>{{ party.third_name }}</td>
          </tr>
        </ng-template>

        <ng-template #emptymessage>
          <tr>
            <td colspan="3" class="empty-msg">No se encontraron terceros.</td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  `,
  styles: `
    .selector-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .selector-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      i { color: #94a3b8; font-size: 14px; }
    }

    .search-input {
      width: 280px;
      font-size: 13px;
    }

    .selector-count {
      font-size: 13px;
      color: #64748b;
    }

    .cell-id {
      font-family: 'SF Mono', 'Cascadia Code', monospace;
      font-size: 12px;
      font-weight: 600;
    }

    .empty-msg {
      text-align: center;
      padding: 32px;
      color: #94a3b8;
      font-size: 13px;
    }

    :host ::ng-deep .p-datatable .p-datatable-tbody > tr > td {
      padding: 8px 12px;
      font-size: 13px;
    }

    :host ::ng-deep .p-datatable .p-datatable-thead > tr > th {
      padding: 10px 12px;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
  `,
})
export class ThirdPartySelectorComponent {
  transactions = input.required<RawTransaction[]>();
  selectedItems = model<ThirdParty[]>([]);

  filterText = signal('');

  uniqueThirdParties = computed<ThirdParty[]>(() => {
    const seen = new Map<string, ThirdParty>();
    for (const t of this.transactions()) {
      if (!seen.has(t.id)) {
        seen.set(t.id, { id: t.id, third_name: t.third_name });
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.third_name.localeCompare(b.third_name));
  });

  filteredParties = computed(() => {
    const filter = this.filterText().toLowerCase().trim();
    if (!filter) return this.uniqueThirdParties();
    return this.uniqueThirdParties().filter(
      p => p.id.toLowerCase().includes(filter) || p.third_name.toLowerCase().includes(filter)
    );
  });

  onSelectionChange(value: ThirdParty[]) {
    this.selectedItems.set(value ?? []);
  }
}
