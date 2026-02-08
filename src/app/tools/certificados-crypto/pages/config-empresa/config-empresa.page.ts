import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { Button } from 'primeng/button';
import { FloatLabel } from 'primeng/floatlabel';
import { Message } from 'primeng/message';
import { Dialog } from 'primeng/dialog';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { FileUploadComponent } from '../../../../shared/components/file-upload/file-upload.component';
import { FormatNitPipe, formatNit } from '../../../../shared/pipes/format-nit.pipe';
import { NotificationService } from '../../../../shared/services/notification.service';
import { EmpresaService, Empresa, UpdateEmpresaDto } from '../../services/empresa.service';

@Component({
  selector: 'app-config-empresa',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    InputText,
    Button,
    FloatLabel,
    Message,
    Dialog,
    ConfirmDialog,
    FormatNitPipe,
    FileUploadComponent,
  ],
  providers: [ConfirmationService],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Configuracion de Empresa</h1>
        <p class="page-subtitle">Administra los datos de la empresa para los certificados</p>
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
              <label for="nombre">Nombre de la empresa *</label>
            </p-floatlabel>
          </div>

          <div class="form-field">
            <p-floatlabel>
              <input pInputText id="nit" [(ngModel)]="form.nit" class="w-full" />
              <label for="nit">NIT *</label>
            </p-floatlabel>
          </div>

          <div class="form-field">
            <p-floatlabel>
              <input pInputText id="rep_nombre" [(ngModel)]="form.representante_nombre" class="w-full" />
              <label for="rep_nombre">Nombre del representante legal *</label>
            </p-floatlabel>
          </div>

          <div class="form-field">
            <p-floatlabel>
              <input pInputText id="rep_id" [(ngModel)]="form.representante_id" class="w-full" />
              <label for="rep_id">Identificacion del representante *</label>
            </p-floatlabel>
          </div>

          <div class="form-field form-field--full">
            <label class="field-label">Logo de la empresa</label>
            <app-file-upload
              accept=".png,.jpg,.jpeg"
              label="Seleccionar imagen (PNG, JPG)"
              [maxSizeMb]="5"
              (fileSelected)="onImageSelected($event)" />
          </div>

          @if (isEditing()) {
            <div class="form-field form-field--full preview-section">
              <div class="preview-section-header">
                <span class="field-label">Vista previa</span>
                <p-button
                  label="Ver detalle"
                  icon="pi pi-eye"
                  [outlined]="true"
                  size="small"
                  (onClick)="openPreviewDialog()" />
              </div>
              @if (empresaLogoDataUrl()) {
                <div class="logo-preview-small">
                  <img [src]="empresaLogoDataUrl()" alt="Logo empresa" />
                </div>
              } @else if (form.imagen_path) {
                <p class="preview-hint">Logo guardado (ruta: {{ form.imagen_path }}). La imagen se mostrará si el archivo existe.</p>
              }
            </div>
          }
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

      @if (empresaService.empresas().length > 0) {
        <div class="list-card">
          <h2>Empresas registradas</h2>
          <div class="empresa-list">
            @for (emp of empresaService.empresas(); track emp.nit) {
              <div
                class="empresa-item"
                [class.active]="form.nit === emp.nit"
                (click)="loadEmpresa(emp)">
                <div class="empresa-info">
                  <span class="empresa-name">{{ emp.nombre }}</span>
                  <span class="empresa-nit">NIT: {{ emp.nit | formatNit }}</span>
                </div>
                <div class="empresa-item-actions">
                  <p-button
                    icon="pi pi-eye"
                    [rounded]="true"
                    [text]="true"
                    size="small"
                    title="Vista previa"
                    (onClick)="openPreviewByEmpresa($event, emp)" />
                  <p-button
                    icon="pi pi-trash"
                    severity="danger"
                    [rounded]="true"
                    [text]="true"
                    size="small"
                    title="Eliminar"
                    (onClick)="confirmDelete($event, emp)" />
                  <i class="pi pi-chevron-right"></i>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <p-dialog
        header="Vista previa de la empresa"
        [visible]="previewVisible()"
        (visibleChange)="onPreviewVisibleChange($event)"
        [modal]="true"
        [dismissableMask]="true"
        [style]="{ width: '420px' }"
        styleClass="empresa-preview-dialog">
        <div class="empresa-preview-content">
          <dl class="preview-meta">
            <dt>Nombre</dt>
            <dd>{{ previewEmpresa()?.nombre }}</dd>
            <dt>NIT</dt>
            <dd>{{ previewEmpresa()?.nit | formatNit }}</dd>
            <dt>Representante legal</dt>
            <dd>{{ previewEmpresa()?.representante_nombre }}</dd>
            <dt>Identificación representante</dt>
            <dd>{{ previewEmpresa()?.representante_id }}</dd>
          </dl>
          @if (previewLogoUrl()) {
            <div class="preview-logo-wrap">
              <label>Logo</label>
              <img [src]="previewLogoUrl()" alt="Logo" />
            </div>
          } @else if (previewEmpresa()?.imagen_path) {
            <p class="preview-no-image">Imagen no disponible (ruta: {{ previewEmpresa()!.imagen_path }})</p>
          }
        </div>
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

    .field-hint {
      display: block;
      margin-top: 4px;
      font-size: 11px;
      color: #94a3b8;
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

    .list-card h2 {
      font-size: 16px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 12px;
    }

    .empresa-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .empresa-item {
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

    .empresa-item-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      i { color: #94a3b8; font-size: 12px; }
    }

    .empresa-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .empresa-name {
      font-size: 14px;
      font-weight: 500;
      color: #1e293b;
    }

    .empresa-nit {
      font-size: 12px;
      color: #64748b;
    }

    .preview-section {
      padding-top: 8px;
      border-top: 1px solid #f1f5f9;
    }

    .preview-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .logo-preview-small {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px;
      display: inline-block;
      background: #f8fafc;
    }
    .logo-preview-small img {
      display: block;
      max-width: 120px;
      max-height: 60px;
      object-fit: contain;
    }

    .preview-hint {
      font-size: 12px;
      color: #64748b;
      margin: 0;
    }

    .empresa-preview-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .preview-meta {
      margin: 0;
      font-size: 13px;
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 4px 16px;
    }
    .preview-meta dt {
      font-weight: 600;
      color: #475569;
    }
    .preview-meta dd {
      margin: 0;
      color: #1e293b;
    }

    .preview-logo-wrap {
      margin-top: 8px;
    }
    .preview-logo-wrap label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      margin-bottom: 6px;
    }
    .preview-logo-wrap img {
      max-width: 100%;
      max-height: 160px;
      object-fit: contain;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
    }

    .preview-no-image {
      font-size: 12px;
      color: #94a3b8;
      margin: 0;
    }

    @media (max-width: 640px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class ConfigEmpresaPage implements OnInit {
  empresaService = inject(EmpresaService);
  private notify = inject(NotificationService);

  form = {
    nombre: '',
    nit: '',
    imagen_path: '',
    representante_nombre: '',
    representante_id: '',
  };

  isEditing = signal(false);
  saving = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  empresaLogoDataUrl = signal<string | null>(null);
  previewVisible = signal(false);
  previewEmpresa = signal<Empresa | null>(null);
  previewLogoUrl = signal<string | null>(null);

  /** NIT original al cargar una empresa (para identificar el registro al actualizar). */
  originalNit = signal<string | null>(null);

  /** Imagen seleccionada en el formulario (aún no guardada). Se envía al backend al guardar. */
  private selectedImageData: { base64: string; mime: string } | null = null;

  private confirmService = inject(ConfirmationService);

  ngOnInit() {
    this.empresaService.loadEmpresas();
  }

  isFormValid(): boolean {
    return !!(
      this.form.nombre.trim() &&
      this.form.nit.trim() &&
      this.form.representante_nombre.trim() &&
      this.form.representante_id.trim()
    );
  }

  async onImageSelected(file: File) {
    const base64 = await this.fileToBase64(file);
    this.selectedImageData = { base64, mime: file.type || 'image/jpeg' };
    this.empresaLogoDataUrl.set(`data:${this.selectedImageData.mime};base64,${base64}`);
    this.form.imagen_path = file.name;
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1] ?? '';
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async loadEmpresa(empresa: Empresa) {
    this.form.nombre = empresa.nombre;
    this.form.nit = empresa.nit;
    this.form.imagen_path = empresa.imagen_path ?? '';
    this.form.representante_nombre = empresa.representante_nombre;
    this.form.representante_id = empresa.representante_id;
    this.originalNit.set(empresa.nit);
    this.isEditing.set(true);
    this.clearMessages();
    this.selectedImageData = null;
    this.empresaLogoDataUrl.set(null);
    try {
      const img = await this.empresaService.getEmpresaImagen(empresa.nit);
      if (img) {
        const url = `data:${img.mime};base64,${img.imagenBase64}`;
        this.empresaLogoDataUrl.set(url);
      }
    } catch {
      // Ignore: logo opcional
    }
  }

  resetForm() {
    this.form = {
      nombre: '',
      nit: '',
      imagen_path: '',
      representante_nombre: '',
      representante_id: '',
    };
    this.isEditing.set(false);
    this.originalNit.set(null);
    this.selectedImageData = null;
    this.empresaLogoDataUrl.set(null);
    this.clearMessages();
  }

  confirmDelete(event: Event, empresa: Empresa) {
    event.stopPropagation();
    this.confirmService.confirm({
      message: `¿Eliminar la empresa "${empresa.nombre}" (NIT ${formatNit(empresa.nit)})?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteEmpresa(empresa.nit),
    });
  }

  private async deleteEmpresa(nit: string) {
    try {
      await this.empresaService.deleteEmpresa(nit);
      if (this.originalNit() === nit) {
        this.resetForm();
      }
      this.notify.success('Empresa eliminada');
    } catch (err) {
      this.notify.error('Error', String(err));
    }
  }

  openPreviewDialog() {
    this.previewEmpresa.set({
      nombre: this.form.nombre,
      nit: this.form.nit,
      imagen_path: this.form.imagen_path || undefined,
      representante_nombre: this.form.representante_nombre,
      representante_id: this.form.representante_id,
    });
    this.previewLogoUrl.set(this.empresaLogoDataUrl());
    this.previewVisible.set(true);
  }

  async openPreviewByEmpresa(event: Event, empresa: Empresa) {
    event.stopPropagation();
    this.previewEmpresa.set(empresa);
    this.previewLogoUrl.set(null);
    this.previewVisible.set(true);
    try {
      const img = await this.empresaService.getEmpresaImagen(empresa.nit);
      if (img) {
        this.previewLogoUrl.set(`data:${img.mime};base64,${img.imagenBase64}`);
      }
    } catch {
      // Ignore
    }
  }

  onPreviewVisibleChange(visible: boolean) {
    this.previewVisible.set(visible);
    if (!visible) {
      this.previewEmpresa.set(null);
      this.previewLogoUrl.set(null);
    }
  }

  async onSave() {
    this.saving.set(true);
    this.clearMessages();

    try {
      let imagenPath: string | undefined = this.form.imagen_path || undefined;

      if (this.selectedImageData) {
        const path = await this.empresaService.saveEmpresaImagen(
          this.form.nit,
          this.selectedImageData.base64,
          this.selectedImageData.mime
        );
        imagenPath = path;
        this.form.imagen_path = path;
        this.selectedImageData = null;
      }

      if (this.isEditing()) {
        const currentNit = this.originalNit()!;
        const dto: UpdateEmpresaDto = {
          nombre: this.form.nombre,
          imagen_path: imagenPath,
          representante_nombre: this.form.representante_nombre,
          representante_id: this.form.representante_id,
        };
        if (this.form.nit !== currentNit) {
          dto.nit = this.form.nit;
        }
        await this.empresaService.updateEmpresa(currentNit, dto);
        this.originalNit.set(this.form.nit);
        this.successMessage.set('Empresa actualizada correctamente');
        this.notify.success('Empresa actualizada');
      } else {
        await this.empresaService.createEmpresa({
          nombre: this.form.nombre,
          nit: this.form.nit,
          imagen_path: imagenPath,
          representante_nombre: this.form.representante_nombre,
          representante_id: this.form.representante_id,
        });
        this.successMessage.set('Empresa creada correctamente');
        this.notify.success('Empresa creada');
        this.resetForm();
      }
      await this.empresaService.loadEmpresas();
    } catch (err) {
      this.errorMessage.set(String(err));
      this.notify.error('Error', String(err));
    } finally {
      this.saving.set(false);
    }
  }

  private clearMessages() {
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }
}
