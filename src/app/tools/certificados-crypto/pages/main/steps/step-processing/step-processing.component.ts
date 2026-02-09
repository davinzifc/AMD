import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import { ProcessingProgressComponent } from '../../../../components/processing-progress/processing-progress.component';
import { ValidationErrorsComponent } from '../../../../components/validation-errors/validation-errors.component';
import { ProcessingResult, ProgressPayload } from '../../../../models/processing.model';

@Component({
  selector: 'app-step-processing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Message, ProcessingProgressComponent, ValidationErrorsComponent],
  templateUrl: './step-processing.component.html',
  styleUrl: './step-processing.component.scss',
})
export class StepProcessingComponent {
  selectedCount = input.required<number>();
  isProcessing = input(false);
  progress = input<ProgressPayload | null>(null);
  processingResult = input<ProcessingResult | null>(null);
  error = input<string | null>(null);

  startProcessing = output<void>();
  navigate = output<number>();
}
