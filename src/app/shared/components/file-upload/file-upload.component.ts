import { Component, ChangeDetectionStrategy, input, output, signal, ElementRef, viewChild } from '@angular/core';

@Component({
  selector: 'app-file-upload',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="upload-zone"
      [class.dragover]="isDragover()"
      (dragover)="onDragOver($event)"
      (dragleave)="isDragover.set(false)"
      (drop)="onDrop($event)"
      (click)="fileInput.click()">

      <input
        #fileInput
        type="file"
        [accept]="accept()"
        (change)="onFileSelected($event)"
        hidden />

      <div class="upload-content">
        <i class="pi pi-cloud-upload upload-icon"></i>
        <p class="upload-label">{{ label() }}</p>
        <p class="upload-hint">Arrastra un archivo o haz clic para seleccionar</p>
        @if (selectedFileName()) {
          <div class="selected-file">
            <i class="pi pi-file"></i>
            <span>{{ selectedFileName() }}</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .upload-zone {
      border: 2px dashed #cbd5e1;
      border-radius: 8px;
      padding: 32px;
      text-align: center;
      cursor: pointer;
      transition: all 0.15s ease;
      background: #ffffff;

      &:hover, &.dragover {
        border-color: #3b82f6;
        background: #f0f7ff;
      }
    }

    .upload-icon {
      font-size: 36px;
      color: #94a3b8;
      margin-bottom: 8px;
    }

    .upload-label {
      font-size: 14px;
      font-weight: 500;
      color: #334155;
      margin-bottom: 4px;
    }

    .upload-hint {
      font-size: 12px;
      color: #94a3b8;
    }

    .selected-file {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 12px;
      padding: 6px 12px;
      background: #f1f5f9;
      border-radius: 4px;
      font-size: 13px;
      color: #334155;
    }
  `,
})
export class FileUploadComponent {
  accept = input('.xlsx');
  label = input('Seleccionar archivo');
  maxSizeMb = input(50);

  fileSelected = output<File>();

  isDragover = signal(false);
  selectedFileName = signal<string | null>(null);

  fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragover.set(true);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragover.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  private handleFile(file: File) {
    const maxBytes = this.maxSizeMb() * 1024 * 1024;
    if (file.size > maxBytes) {
      return;
    }

    this.selectedFileName.set(file.name);
    this.fileSelected.emit(file);
  }
}
