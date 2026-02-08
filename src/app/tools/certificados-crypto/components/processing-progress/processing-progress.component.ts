import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { ProgressBar } from 'primeng/progressbar';
import { ProgressPayload } from '../../models/processing.model';

@Component({
  selector: 'app-processing-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProgressBar],
  template: `
    <div class="progress-container">
      <p-progressbar [value]="progress()?.percentage ?? 0" [showValue]="false" />

      <div class="progress-info">
        <div class="stage-label">
          <i class="pi pi-cog pi-spin"></i>
          <span>{{ progress()?.stage ?? 'Iniciando...' }}</span>
        </div>

        @if (progress()?.current_id) {
          <div class="detail-label">
            <span class="detail-id">ID: {{ progress()!.current_id }}</span>
            @if (progress()!.current_order_code) {
              <span class="detail-sep">&middot;</span>
              <span class="detail-code">{{ progress()!.current_order_code }}</span>
            }
          </div>
        }

        <div class="progress-counter">
          @if (progress()?.total && progress()!.total > 0) {
            {{ progress()!.current }} / {{ progress()!.total }}
          }
          <span class="progress-pct">{{ progress()?.percentage ?? 0 }}%</span>
        </div>
      </div>
    </div>
  `,
  styles: `
    .progress-container {
      padding: 32px;
      text-align: center;
    }

    :host ::ng-deep .p-progressbar {
      height: 8px;
      border-radius: 4px;
      margin-bottom: 16px;
    }

    .progress-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .stage-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
      font-weight: 500;
      color: #1e293b;
    }

    .detail-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #64748b;
    }

    .detail-id {
      font-family: 'SF Mono', 'Cascadia Code', monospace;
    }

    .detail-sep {
      color: #cbd5e1;
    }

    .detail-code {
      font-family: 'SF Mono', 'Cascadia Code', monospace;
      color: #94a3b8;
    }

    .progress-counter {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #94a3b8;
    }

    .progress-pct {
      font-weight: 600;
      color: #3b82f6;
    }
  `,
})
export class ProcessingProgressComponent {
  progress = input<ProgressPayload | null>(null);
}
