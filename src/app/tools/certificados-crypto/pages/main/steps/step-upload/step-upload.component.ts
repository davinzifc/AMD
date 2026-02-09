import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { Message } from 'primeng/message';
import { ExcelUploadZoneComponent } from '../../../../components/excel-upload-zone/excel-upload-zone.component';

@Component({
  selector: 'app-step-upload',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Message, ExcelUploadZoneComponent],
  templateUrl: './step-upload.component.html',
  styleUrl: './step-upload.component.scss',
})
export class StepUploadComponent {
  loading = input(false);
  error = input<string | null>(null);
  empresaInfo = input<string | null>(null);

  fileRequested = output<void>();
}
