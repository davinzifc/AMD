import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { ProgressBar } from 'primeng/progressbar';
import { ProgressPayload } from '../../models/processing.model';

@Component({
  selector: 'app-processing-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProgressBar],
  templateUrl: './processing-progress.component.html',
  styleUrl: './processing-progress.component.scss',
})
export class ProcessingProgressComponent {
  progress = input<ProgressPayload | null>(null);
}
