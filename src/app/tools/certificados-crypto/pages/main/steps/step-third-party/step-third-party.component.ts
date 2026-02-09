import { Component, ChangeDetectionStrategy, input, output, model } from '@angular/core';
import { Button } from 'primeng/button';
import { ThirdPartySelectorComponent, ThirdParty } from '../../../../components/third-party-selector/third-party-selector.component';
import { RawTransaction } from '../../../../models/raw-transaction.model';

@Component({
  selector: 'app-step-third-party',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, ThirdPartySelectorComponent],
  templateUrl: './step-third-party.component.html',
  styleUrl: './step-third-party.component.scss',
})
export class StepThirdPartyComponent {
  transactions = input.required<RawTransaction[]>();
  selectedItems = model<ThirdParty[]>([]);

  navigate = output<number>();
}
