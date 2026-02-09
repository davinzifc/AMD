import { Component, ChangeDetectionStrategy, input, output, model } from '@angular/core';
import { Button } from 'primeng/button';
import { DataTableComponent } from '../../../../components/data-table/data-table.component';
import { RawTransaction } from '../../../../models/raw-transaction.model';

@Component({
  selector: 'app-step-review',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, DataTableComponent],
  templateUrl: './step-review.component.html',
  styleUrl: './step-review.component.scss',
})
export class StepReviewComponent {
  transactions = input.required<RawTransaction[]>();
  selected = model<RawTransaction[]>([]);

  navigate = output<number>();
}
