import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { ValidationError } from '../../models/processing.model';

@Component({
  selector: 'app-validation-errors',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (errors().length > 0) {
      <div class="errors-container">
        <div class="errors-header">
          <i class="pi pi-exclamation-triangle"></i>
          <span>{{ errors().length }} grupo(s) con errores de validación</span>
        </div>

        <div class="errors-list">
          @for (err of errors(); track err.id) {
            <div class="error-item">
              <div class="error-main">
                <span class="error-id">ID: {{ err.id }}</span>
                <span class="error-name">{{ err.third_name }}</span>
              </div>
              <p class="error-detail">{{ err.details }}</p>
              <div class="error-rows">
                <span class="rows-label">Filas afectadas en el Excel:</span>
                @for (row of err.affected_rows; track row) {
                  <span class="row-badge">{{ row }}</span>
                }
              </div>
            </div>
          }
        </div>

        <p class="errors-hint">
          Corrige estos errores en el archivo Excel original y vuelve a cargarlo.
          Los grupos con errores no se incluirán en la generación de reportes.
        </p>
      </div>
    }
  `,
  styles: `
    .errors-container {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 16px;
      margin-top: 16px;
    }

    .errors-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
      color: #991b1b;
      margin-bottom: 12px;

      i { color: #dc2626; }
    }

    .errors-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .error-item {
      background: #ffffff;
      border: 1px solid #fecaca;
      border-radius: 6px;
      padding: 12px;
    }

    .error-main {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 4px;
    }

    .error-id {
      font-family: 'SF Mono', 'Cascadia Code', monospace;
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
    }

    .error-name {
      font-size: 13px;
      color: #64748b;
    }

    .error-detail {
      font-size: 12px;
      color: #991b1b;
      margin-bottom: 6px;
    }

    .error-rows {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-wrap: wrap;
    }

    .rows-label {
      font-size: 11px;
      color: #64748b;
      margin-right: 4px;
    }

    .row-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 24px;
      height: 20px;
      padding: 0 6px;
      background: #fee2e2;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      font-family: 'SF Mono', 'Cascadia Code', monospace;
      color: #991b1b;
    }

    .errors-hint {
      margin-top: 12px;
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
    }
  `,
})
export class ValidationErrorsComponent {
  errors = input.required<ValidationError[]>();
}
