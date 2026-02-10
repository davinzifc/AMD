import { Component, ChangeDetectionStrategy, inject, input, output, signal, computed, OnInit } from '@angular/core';
import { Table, TableModule } from 'primeng/table';
import { Button } from 'primeng/button';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { ProcessedGroup } from '../../models/processing.model';
import { TransactionDetailComponent } from '../transaction-detail/transaction-detail.component';
import { FirmanteService } from '../../../../shared/services/firmante.service';
import { FirmanteListItem } from '../../../../shared/models/firmante.model';

@Component({
  selector: 'app-results-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TableModule, Button, InputNumber, Select, FormsModule, TransactionDetailComponent],
  templateUrl: './results-table.component.html',
  styleUrl: './results-table.component.scss',
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
