import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

/**
 * Zona de carga reutilizable para archivos Excel (HU-002).
 * En contexto Tauri emite fileRequest para que el padre abra el diálogo y obtenga la ruta.
 */
@Component({
  selector: 'app-excel-upload-zone',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './excel-upload-zone.component.html',
  styleUrl: './excel-upload-zone.component.scss',
})
export class ExcelUploadZoneComponent {
  loading = input(false);
  fileRequest = output<void>();

  onClick() {
    if (this.loading()) return;
    this.fileRequest.emit();
  }
}
