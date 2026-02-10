import { Component, ChangeDetectionStrategy, input, output, signal, ElementRef, viewChild } from '@angular/core';

@Component({
  selector: 'app-file-upload',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './file-upload.component.html',
  styleUrl: './file-upload.component.scss',
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
