import { Component, ChangeDetectionStrategy, inject, input, output, signal, computed, OnInit } from '@angular/core';
import { Table, TableModule } from 'primeng/table';
import { Button } from 'primeng/button';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { ProcessedGroup } from '../../models/processing.model';
import { TransactionDetailComponent } from '../transaction-detail/transaction-detail.component';
import { FirmanteService } from '../../services/firmante.service';
import { FirmanteListItem } from '../../models/firmante.model';

@Component({
  selector: 'app-results-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TableModule, Button, InputNumber, Select, FormsModule, TransactionDetailComponent],
  template: `
    <div class="results-container">
      <div class="results-toolbar">
        <div class="toolbar-left">
          <span class="results-count">
            {{ groups().length }} grupo(s) válido(s)
          </span>
        </div>
        <div class="toolbar-right">
          <p-button
            label="Seleccionar todos"
            icon="pi pi-check-square"
            [outlined]="true"
            severity="secondary"
            size="small"
            [disabled]="groups().length === 0"
            (onClick)="selectAll()" />
          <div class="firmante-input">
            <label for="firmante">Firmante:</label>
            <p-select
              id="firmante"
              [(ngModel)]="selectedFirmante"
              [options]="firmanteService.firmantes()"
              optionLabel="nombre"
              placeholder="Seleccionar firmante"
              [style]="{ width: '220px' }"
              [showClear]="true" />
          </div>
          <div class="year-input">
            <label for="year">Año certificado:</label>
            <p-inputnumber
              id="year"
              [(ngModel)]="yearValue"
              [useGrouping]="false"
              [min]="2000"
              [max]="2099"
              placeholder="2024"
              [style]="{ width: '100px' }" />
          </div>
          <div class="toolbar-actions">
            <p-button
              label="Vista previa"
              icon="pi pi-eye"
              [outlined]="true"
              severity="secondary"
              size="small"
              [disabled]="selectedGroups().length === 0 || !yearValue || !selectedFirmante"
              (onClick)="onPreview()" />
            <p-button
              label="Generar PDFs"
              icon="pi pi-file-pdf"
              [disabled]="selectedGroups().length === 0 || !yearValue || !selectedFirmante"
              [badge]="selectedGroups().length.toString()"
              (onClick)="onGenerate()" />
          </div>
        </div>
      </div>

      <p-table
        [value]="groups()"
        [selection]="selectedGroups()"
        (selectionChange)="onSelectionChange($event)"
        dataKey="id"
        [paginator]="groups().length > 20"
        [rows]="20"
        [rowsPerPageOptions]="[10, 20, 50]"
        [expandedRowKeys]="expandedRows">

        <ng-template #header>
          <tr>
            <th style="width: 3rem">
              <p-tableHeaderCheckbox />
            </th>
            <th style="width: 3rem"></th>
            <th pSortableColumn="id">ID <p-sortIcon field="id" /></th>
            <th pSortableColumn="third_name">Nombre <p-sortIcon field="third_name" /></th>
            <th pSortableColumn="city">Ciudad <p-sortIcon field="city" /></th>
            <th>Periodo</th>
            <th pSortableColumn="total_amount" style="text-align: right">Cantidad <p-sortIcon field="total_amount" /></th>
            <th pSortableColumn="total_price" style="text-align: right">Valor COP <p-sortIcon field="total_price" /></th>
            <th>Retención</th>
          </tr>
        </ng-template>

        <ng-template #body let-group let-expanded="expanded">
          <tr>
            <td>
              <p-tableCheckbox [value]="group" />
            </td>
            <td>
              @if (group.has_multiple_transactions) {
                <p-button
                  type="button"
                  [pRowToggler]="group"
                  [text]="true"
                  [rounded]="true"
                  [plain]="true"
                  [icon]="expanded ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
                  size="small" />
              }
            </td>
            <td class="cell-id">{{ group.id }}</td>
            <td>{{ group.third_name }}</td>
            <td>{{ group.city }}</td>
            <td class="cell-date">{{ group.date_range }}</td>
            <td class="cell-number">{{ formatNumber(group.total_amount) }}</td>
            <td class="cell-number cell-number--price">{{ formatNumber(group.total_price) }}</td>
            <td class="cell-retencion">{{ group.retencion }}</td>
          </tr>
        </ng-template>

        <ng-template #rowexpansion let-group>
          <tr>
            <td colspan="9" class="expansion-cell">
              <app-transaction-detail [transactions]="group.transactions" />
            </td>
          </tr>
        </ng-template>

        <ng-template #emptymessage>
          <tr>
            <td colspan="9" class="empty-msg">No hay grupos procesados para mostrar.</td>
          </tr>
        </ng-template>
      </p-table>

      @if (includeDetailsOption()) {
        <div class="details-option">
          <label class="details-label">
            <input type="checkbox" [(ngModel)]="includeDetails" />
            Generar hoja de detalle para grupos con múltiples transacciones
          </label>
        </div>
      }
    </div>
  `,
  styles: `
    .results-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .results-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
    }

    .results-count {
      font-size: 13px;
      color: #64748b;
    }

    .toolbar-right {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      min-width: 0;
    }
    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: 4px;
    }

    .firmante-input {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #334155;
    }

    .year-input {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #334155;
    }

    .cell-id {
      font-family: 'SF Mono', 'Cascadia Code', monospace;
      font-size: 12px;
      font-weight: 600;
    }

    .cell-date {
      font-size: 12px;
      color: #64748b;
    }

    .cell-number {
      text-align: right;
      font-family: 'SF Mono', 'Cascadia Code', monospace;
      font-size: 12px;
    }

    .cell-number--price {
      font-weight: 600;
      color: #1e293b;
    }

    .cell-retencion {
      font-size: 12px;
      color: #64748b;
    }

    .expansion-cell {
      padding: 0 !important;
    }

    .empty-msg {
      text-align: center;
      padding: 32px;
      color: #94a3b8;
      font-size: 13px;
    }

    .details-option {
      padding: 8px 0;
    }

    .details-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #475569;
      cursor: pointer;
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
export class ResultsTableComponent implements OnInit {
  firmanteService = inject(FirmanteService);

  groups = input.required<ProcessedGroup[]>();
  generatePdfs = output<{ selectedIds: string[]; year: string; includeDetails: boolean; firmanteId: number }>();
  previewPdf = output<{ selectedIds: string[]; year: string; includeDetails: boolean; firmanteId: number }>();

  selectedGroups = signal<ProcessedGroup[]>([]);
  selectedFirmante: FirmanteListItem | null = null;
  yearValue: number | null = null;
  expandedRows: { [key: string]: boolean } = {};
  includeDetails = true;

  ngOnInit() {
    this.firmanteService.loadFirmantes();
  }

  includeDetailsOption = computed(() => {
    return this.groups().some(g => g.has_multiple_transactions);
  });

  formatNumber(value: number): string {
    const rounded = Math.round(value * 100) / 100;
    const parts = rounded.toFixed(2).split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${intPart},${parts[1]}`;
  }

  onSelectionChange(value: ProcessedGroup[]) {
    this.selectedGroups.set(value ?? []);
  }

  selectAll() {
    this.selectedGroups.set([...this.groups()]);
  }

  onPreview() {
    if (!this.yearValue || this.selectedGroups().length === 0 || !this.selectedFirmante) return;
    this.previewPdf.emit({
      selectedIds: this.selectedGroups().map(g => g.id),
      year: this.yearValue.toString(),
      includeDetails: this.includeDetails,
      firmanteId: this.selectedFirmante.id,
    });
  }

  onGenerate() {
    if (!this.yearValue || this.selectedGroups().length === 0 || !this.selectedFirmante) return;
    this.generatePdfs.emit({
      selectedIds: this.selectedGroups().map(g => g.id),
      year: this.yearValue.toString(),
      includeDetails: this.includeDetails,
      firmanteId: this.selectedFirmante.id,
    });
  }
}
