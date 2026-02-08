import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { Button } from 'primeng/button';
import { FloatLabel } from 'primeng/floatlabel';
import { Message } from 'primeng/message';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Dialog } from 'primeng/dialog';
import { ConfirmationService } from 'primeng/api';
import { FileUploadComponent } from '../../../../shared/components/file-upload/file-upload.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { FirmanteService } from '../../services/firmante.service';
import { FirmanteListItem } from '../../models/firmante.model';

@Component({
  selector: 'app-config-firmante',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, InputText, Button, FloatLabel, Message, FileUploadComponent, ConfirmDialog, Dialog],
  providers: [ConfirmationService],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Configuracion de Firmante</h1>
        <p class="page-subtitle">Administra los firmantes disponibles para los certificados</p>
      </div>

      @if (successMessage()) {
        <p-message severity="success" [text]="successMessage()!" styleClass="msg-block" />
      }
      @if (errorMessage()) {
        <p-message severity="error" [text]="errorMessage()!" styleClass="msg-block" />
      }

      <div class="form-card">
        <div class="form-grid">
          <div class="form-field">
            <p-floatlabel>
              <input pInputText id="nombre" [(ngModel)]="form.nombre" class="w-full" />
              <label for="nombre">Nombre completo *</label>
            </p-floatlabel>
          </div>

          <div class="form-field">
            <p-floatlabel>
              <input pInputText id="cc_id" [(ngModel)]="form.cc_id" class="w-full" />
              <label for="cc_id">Cedula / Identificacion *</label>
            </p-floatlabel>
          </div>

          <div class="form-field form-field--full">
            <label class="field-label">Imagen de firma</label>
            <div class="firma-upload-row">
              <app-file-upload
                accept=".png,.jpg,.jpeg"
                label="Seleccionar imagen de firma (PNG, JPG, max 2MB)"
                [maxSizeMb]="2"
                (fileSelected)="onFirmaSelected($event)" />
              @if (firmaPreview()) {
                <div class="firma-preview">
                  <img [src]="firmaPreview()" alt="Vista previa firma" />
                  <div class="firma-preview-actions">
                    <button type="button" class="firma-btn-preview" (click)="openFirmaPreview(firmaPreview()!)" title="Ver en grande">
                      <i class="pi pi-eye"></i>
                    </button>
                    <button class="firma-remove" (click)="removeFirma()" title="Quitar imagen">
                      <i class="pi pi-times"></i>
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <div class="form-actions">
          <p-button
            [label]="isEditing() ? 'Actualizar' : 'Guardar'"
            icon="pi pi-check"
            [loading]="saving()"
            [disabled]="!isFormValid()"
            (onClick)="onSave()" />

          @if (isEditing()) {
            <p-button
              label="Nuevo"
              icon="pi pi-plus"
              severity="secondary"
              [outlined]="true"
              (onClick)="resetForm()" />
          }
        </div>
      </div>

      @if (firmanteService.firmantes().length > 0) {
        <div class="list-card">
          <h2>Firmantes registrados</h2>
          <div class="firmante-list">
            @for (f of firmanteService.firmantes(); track f.id) {
              <div
                class="firmante-item"
                [class.active]="editingId() === f.id"
                (click)="loadFirmante(f)">
                <div class="firmante-info">
                  <span class="firmante-name">{{ f.nombre }}</span>
                  <span class="firmante-cc">CC: {{ f.cc_id }}</span>
                </div>
                <div class="firmante-actions">
                  @if (f.has_firma) {
                    <p-button
                      icon="pi pi-eye"
                      [rounded]="true"
                      [text]="true"
                      size="small"
                      title="Vista previa de la firma"
                      (onClick)="openFirmaPreviewByFirmante($event, f)" />
                  }
                  <p-button
                    icon="pi pi-trash"
                    severity="danger"
                    [outlined]="true"
                    [rounded]="true"
                    [text]="true"
                    size="small"
                    (onClick)="confirmDelete($event, f)" />
                </div>
              </div>
            }
          </div>
        </div>
      }

      <p-dialog
        header="Vista previa de la firma"
        [visible]="previewFirmaVisible()"
        (visibleChange)="onFirmaPreviewVisibleChange($event)"
        [modal]="true"
        [dismissableMask]="true"
        [style]="{ width: '420px' }"
        styleClass="firma-preview-dialog">
        @if (previewFirmaUrl()) {
          <div class="firma-preview-dialog-content">
            <img [src]="previewFirmaUrl()" alt="Firma del firmante" />
          </div>
        }
      </p-dialog>

      <p-confirmDialog />
    </div>
  `,
  styles: `
    .page-header {
      margin-bottom: 24px;
      h1 {
        font-size: 22px;
        font-weight: 600;
        color: #0f172a;
        letter-spacing: -0.3px;
      }
      .page-subtitle {
        margin-top: 4px;
        font-size: 13px;
        color: #64748b;
      }
    }

    :host ::ng-deep .msg-block {
      display: block;
      margin-bottom: 16px;
    }

    .form-card, .list-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 16px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    .form-field--full {
      grid-column: 1 / -1;
    }

    .field-label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: #475569;
      margin-bottom: 8px;
    }

    .w-full {
      width: 100%;
    }

    .firma-upload-row {
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }

    .firma-upload-row app-file-upload {
      flex: 1;
    }

    .firma-preview {
      position: relative;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 4px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      gap: 6px;

      img {
        display: block;
        max-width: 160px;
        max-height: 80px;
        object-fit: contain;
      }
    }

    .firma-preview-actions {
      display: flex;
      gap: 4px;
      align-items: center;
    }

    .firma-btn-preview {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
      background: #fff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      i { font-size: 12px; color: #3b82f6; }
      &:hover { background: #eff6ff; }
    }

    .firma-preview-dialog-content img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 0 auto;
    }

    .firma-remove {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
      background: #fff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      i { font-size: 12px; color: #64748b; }
      &:hover {
        background: #fef2f2;
        border-color: #fca5a5;
        i { color: #dc2626; }
      }
    }

    .form-actions {
      display: flex;
      gap: 8px;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #f1f5f9;
    }

    .list-card h2 {
      font-size: 16px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 12px;
    }

    .firmante-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .firmante-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.15s ease;

      &:hover { background: #f8fafc; }
      &.active { background: #f0f7ff; }
    }

    .firmante-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .firmante-name {
      font-size: 14px;
      font-weight: 500;
      color: #1e293b;
    }

    .firmante-cc {
      font-size: 12px;
      color: #64748b;
    }

    .firmante-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .firma-badge {
      font-size: 14px;
      color: #3b82f6;
    }

    @media (max-width: 640px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
      .firma-upload-row {
        flex-direction: column;
      }
    }
  `,
})
export class ConfigFirmantePage implements OnInit {
  firmanteService = inject(FirmanteService);
  private notify = inject(NotificationService);
  private confirmService = inject(ConfirmationService);

  form = { nombre: '', cc_id: '' };

  isEditing = signal(false);
  editingId = signal<number | null>(null);
  saving = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  firmaPreview = signal<string | null>(null);
  previewFirmaVisible = signal(false);
  previewFirmaUrl = signal<string | null>(null);

  private firmaImagenBytes: number[] | null = null;
  private firmaMime: string | null = null;

  ngOnInit() {
    this.firmanteService.loadFirmantes();
  }

  isFormValid(): boolean {
    return !!(this.form.nombre.trim() && this.form.cc_id.trim());
  }

  async onFirmaSelected(file: File) {
    const data = await FirmanteService.fileToImageData(file);
    this.firmaImagenBytes = data.firma_imagen;
    this.firmaMime = data.firma_mime;
    this.firmaPreview.set(FirmanteService.imageBytesToDataUri(data.firma_imagen, data.firma_mime));
  }

  removeFirma() {
    this.firmaImagenBytes = null;
    this.firmaMime = null;
    this.firmaPreview.set(null);
  }

  openFirmaPreview(dataUrl: string) {
    this.previewFirmaUrl.set(dataUrl);
    this.previewFirmaVisible.set(true);
  }

  onFirmaPreviewVisibleChange(visible: boolean) {
    this.previewFirmaVisible.set(visible);
    if (!visible) this.previewFirmaUrl.set(null);
  }

  async openFirmaPreviewByFirmante(event: Event, firmante: FirmanteListItem) {
    event.stopPropagation();
    if (!firmante.has_firma) return;
    try {
      const img = await this.firmanteService.getFirmaImagen(firmante.id);
      if (img) {
        const url = FirmanteService.imageBytesToDataUri(img.imagen, img.mime);
        this.openFirmaPreview(url);
      }
    } catch {
      this.notify.error('Error', 'No se pudo cargar la imagen de la firma');
    }
  }

  async loadFirmante(item: FirmanteListItem) {
    this.form.nombre = item.nombre;
    this.form.cc_id = item.cc_id;
    this.editingId.set(item.id);
    this.isEditing.set(true);
    this.clearMessages();

    // Load firma image if exists
    if (item.has_firma) {
      try {
        const img = await this.firmanteService.getFirmaImagen(item.id);
        if (img) {
          this.firmaImagenBytes = img.imagen;
          this.firmaMime = img.mime;
          this.firmaPreview.set(FirmanteService.imageBytesToDataUri(img.imagen, img.mime));
        }
      } catch {
        // Non-critical, just skip preview
      }
    } else {
      this.removeFirma();
    }
  }

  resetForm() {
    this.form = { nombre: '', cc_id: '' };
    this.isEditing.set(false);
    this.editingId.set(null);
    this.removeFirma();
    this.clearMessages();
  }

  async onSave() {
    this.saving.set(true);
    this.clearMessages();

    try {
      const firmaData = this.firmaImagenBytes
        ? { firma_imagen: this.firmaImagenBytes, firma_mime: this.firmaMime! }
        : {};

      if (this.isEditing() && this.editingId()) {
        await this.firmanteService.updateFirmante(this.editingId()!, {
          nombre: this.form.nombre,
          cc_id: this.form.cc_id,
          ...firmaData,
        });
        this.successMessage.set('Firmante actualizado correctamente');
        this.notify.success('Firmante actualizado');
      } else {
        await this.firmanteService.createFirmante({
          nombre: this.form.nombre,
          cc_id: this.form.cc_id,
          ...firmaData,
        });
        this.successMessage.set('Firmante creado correctamente');
        this.notify.success('Firmante creado');
        this.resetForm();
      }
    } catch (err) {
      this.errorMessage.set(String(err));
      this.notify.error('Error', String(err));
    } finally {
      this.saving.set(false);
    }
  }

  confirmDelete(event: Event, firmante: FirmanteListItem) {
    event.stopPropagation();
    this.confirmService.confirm({
      message: `Eliminar firmante "${firmante.nombre}"?`,
      header: 'Confirmar eliminacion',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteFirmante(firmante.id),
    });
  }

  private async deleteFirmante(id: number) {
    try {
      await this.firmanteService.deleteFirmante(id);
      if (this.editingId() === id) {
        this.resetForm();
      }
      this.notify.success('Firmante eliminado');
    } catch (err) {
      this.notify.error('Error', String(err));
    }
  }

  private clearMessages() {
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }
}
