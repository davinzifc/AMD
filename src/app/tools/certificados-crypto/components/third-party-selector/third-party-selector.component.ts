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
  templateUrl: './third-party-selector.component.html',
  styleUrl: './third-party-selector.component.scss',
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
