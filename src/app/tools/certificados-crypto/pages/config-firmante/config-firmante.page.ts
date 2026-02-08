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
            <app-file-upload
              accept=".png,.jpg,.jpeg"
              label="Seleccionar imagen de firma (PNG, JPG, max 2MB)"
              [maxSizeMb]="2"
              (fileSelected)="onFirmaSelected($event)" />
            @if (firmaPreview()) {
              <div class="firma-inline-preview">
                <div class="firma-inline-image">
                  <img [src]="firmaPreview()" alt="Vista previa firma" />
                </div>
                <div class="firma-inline-actions">
                  <p-button
                    icon="pi pi-eye"
                    label="Ver"
                    [text]="true"
                    size="small"
                    (onClick)="openFirmaPreview(firmaPreview()!)" />
                  <p-button
                    icon="pi pi-times"
                    label="Quitar"
                    [text]="true"
                    severity="danger"
                    size="small"
                    (onClick)="removeFirma()" />
                </div>
              </div>
            }
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
          <div class="list-card-header">
            <h2>Firmantes registrados</h2>
            <span class="list-count">{{ firmanteService.firmantes().length }}</span>
          </div>
          <div class="firmante-list">
            @for (f of firmanteService.firmantes(); track f.id) {
              <div
                class="firmante-item"
                [class.active]="editingId() === f.id"
                (click)="loadFirmante(f)">
                <div class="firmante-avatar">
                  <i class="pi pi-user"></i>
                </div>
                <div class="firmante-info">
                  <span class="firmante-name">{{ f.nombre }}</span>
                  <span class="firmante-cc">CC {{ f.cc_id }}</span>
                </div>
                <div class="firmante-actions">
                  @if (f.has_firma) {
                    <span class="firma-indicator" title="Tiene firma">
                      <i class="pi pi-check-circle"></i>
                    </span>
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
                    [rounded]="true"
                    [text]="true"
                    size="small"
                    (onClick)="confirmDelete($event, f)" />
                  <i class="pi pi-chevron-right chevron"></i>
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
        [style]="{ width: '440px' }"
        styleClass="firma-preview-dialog">
        @if (previewFirmaUrl()) {
          <div class="firma-dialog-content">
            <div class="firma-dialog-image-wrap">
              <img [src]="previewFirmaUrl()" alt="Firma del firmante" />
            </div>
            <span class="firma-dialog-hint">Esta imagen se utilizara en los certificados generados</span>
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

    .form-actions {
      display: flex;
      gap: 8px;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #f1f5f9;
    }

    /* --- Inline firma preview --- */
    .firma-inline-preview {
      margin-top: 12px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #fafbfc;
      padding: 12px;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .firma-inline-image {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      background: #ffffff;
      padding: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      img {
        display: block;
        max-width: 160px;
        max-height: 80px;
        object-fit: contain;
      }
    }

    .firma-inline-actions {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    /* --- Preview dialog --- */
    .firma-dialog-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .firma-dialog-image-wrap {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #fafbfc;
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      img {
        max-width: 100%;
        max-height: 200px;
        object-fit: contain;
        display: block;
      }
    }

    .firma-dialog-hint {
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
    }

    /* --- List card --- */
    .list-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;

      h2 {
        font-size: 16px;
        font-weight: 600;
        color: #0f172a;
      }
    }

    .list-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 22px;
      height: 22px;
      padding: 0 7px;
      border-radius: 11px;
      background: #f1f5f9;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
    }

    .firmante-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .firmante-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.15s ease;

      &:hover { background: #f8fafc; }
      &.active {
        background: #eff6ff;
        .firmante-avatar { background: #3b82f6; color: #fff; }
      }
    }

    .firmante-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 0.15s ease, color 0.15s ease;
      i { font-size: 16px; color: #64748b; }
    }
    .firmante-item.active .firmante-avatar i { color: #fff; }

    .firmante-info {
      display: flex;
      flex-direction: column;
      gap: 1px;
      flex: 1;
      min-width: 0;
    }

    .firmante-name {
      font-size: 14px;
      font-weight: 500;
      color: #1e293b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .firmante-cc {
      font-size: 12px;
      color: #64748b;
      font-variant-numeric: tabular-nums;
    }

    .firmante-actions {
      display: flex;
      align-items: center;
      gap: 2px;
      flex-shrink: 0;
      .chevron { color: #cbd5e1; font-size: 12px; }
    }

    .firma-indicator {
      display: flex;
      align-items: center;
      i { font-size: 14px; color: #22c55e; }
    }

    @media (max-width: 640px) {
      .form-grid {
        grid-template-columns: 1fr;
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
