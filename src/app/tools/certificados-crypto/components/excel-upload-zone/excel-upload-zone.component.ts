import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

/**
 * Zona de carga reutilizable para archivos Excel (HU-002).
 * En contexto Tauri emite fileRequest para que el padre abra el diálogo y obtenga la ruta.
 */
@Component({
  selector: 'app-excel-upload-zone',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="upload-zone"
      [class.upload-zone--loading]="loading()"
      (click)="onClick()"
      role="button"
      tabindex="0"
      (keydown.enter)="onClick()"
      (keydown.space)="onClick()">

      @if (loading()) {
        <div class="upload-loading">
          <i class="pi pi-spin pi-spinner" aria-hidden="true"></i>
          <span>Procesando archivo...</span>
        </div>
      } @else {
        <i class="pi pi-file-excel upload-icon" aria-hidden="true"></i>
        <p class="upload-label">Seleccionar archivo Excel</p>
        <p class="upload-hint">Formato: NIT-nombre.xlsx</p>
      }
    </div>
  `,
  styles: `
    .upload-zone {
      border: 1px solid var(--crypto-border, #e2e8f0);
      border-radius: 8px;
      padding: 48px 64px;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.15s ease, background-color 0.15s ease;
      max-width: 480px;
      width: 100%;
      background: var(--crypto-surface, #ffffff);
      outline: none;
    }

    .upload-zone:hover:not(.upload-zone--loading) {
      border-color: var(--crypto-accent, #3b82f6);
      background: var(--crypto-surface-hover, #f8fafc);
    }

    .upload-zone:focus-visible {
      box-shadow: 0 0 0 2px var(--crypto-accent, #3b82f6);
    }

    .upload-zone--loading {
      cursor: wait;
    }

    .upload-icon {
      font-size: 48px;
      color: var(--crypto-muted, #94a3b8);
      margin-bottom: 12px;
      display: block;
    }

    .upload-label {
      font-size: 15px;
      font-weight: 500;
      color: var(--crypto-text, #334155);
      margin: 0 0 4px 0;
    }

    .upload-hint {
      font-size: 12px;
      color: var(--crypto-muted, #94a3b8);
      margin: 0;
    }

    .upload-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: var(--crypto-accent, #3b82f6);
      font-size: 13px;
    }
  `,
})
export class ExcelUploadZoneComponent {
  loading = input(false);
  fileRequest = output<void>();

  onClick() {
    if (this.loading()) return;
    this.fileRequest.emit();
  }
}
