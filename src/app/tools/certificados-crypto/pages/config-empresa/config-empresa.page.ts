import { Component, ChangeDetectionStrategy, inject, signal, OnInit, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { Button } from 'primeng/button';
import { FloatLabel } from 'primeng/floatlabel';
import { Dialog } from 'primeng/dialog';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { Table, TableModule } from 'primeng/table';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
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
    Dialog,
    ConfirmDialog,
    TableModule,
    IconField,
    InputIcon,
    FormatNitPipe,
    FileUploadComponent,
  ],
  providers: [ConfirmationService],
  template: `
    <div class="page">
      <div class="page-header">
        <div class="page-header-text">
          <h1>Configuracion de Empresas</h1>
          <p class="page-subtitle">Administra los datos de las empresas para los certificados</p>
        </div>
        <p-button
          label="Agregar Empresa"
          icon="pi pi-plus"
          (onClick)="openCreateModal()" />
      </div>

      <div class="table-card">
        <div class="table-toolbar">
          <p-iconfield>
            <p-inputicon styleClass="pi pi-search" />
            <input
              pInputText
              type="text"
              placeholder="Buscar por nombre o NIT..."
              [(ngModel)]="filterValue"
              (input)="onFilter()" />
          </p-iconfield>
          <span class="table-count">
            {{ empresaService.empresas().length }} empresas registradas
          </span>
        </div>

        <p-table
          #dt
          [value]="empresaService.empresas()"
          [paginator]="true"
          [rows]="10"
          [rowsPerPageOptions]="[10, 25, 50]"
          [globalFilterFields]="['nombre', 'nit']"
          [sortField]="'nombre'"
          [sortOrder]="1"
          [loading]="empresaService.loading()"
          dataKey="nit"
          styleClass="p-datatable-sm">

          <ng-template #header>
            <tr>
              <th style="width: 70px">Logo</th>
              <th pSortableColumn="nombre">
                Nombre <p-sortIcon field="nombre" />
              </th>
              <th pSortableColumn="nit">
                NIT <p-sortIcon field="nit" />
              </th>
              <th style="width: 150px; text-align: center">Acciones</th>
            </tr>
          </ng-template>

          <ng-template #body let-empresa>
            <tr>
              <td>
                <div class="logo-cell">
                  @if (logoCache().get(empresa.nit); as logoUrl) {
                    <img [src]="logoUrl" alt="Logo" class="logo-thumbnail" />
                  } @else {
                    <div class="logo-placeholder">
                      <i class="pi pi-building"></i>
                    </div>
                  }
                </div>
              </td>
              <td>
                <span class="empresa-name-cell">{{ empresa.nombre }}</span>
              </td>
              <td>
                <span class="nit-cell">{{ empresa.nit | formatNit }}</span>
              </td>
              <td>
                <div class="actions-cell">
                  <p-button
                    icon="pi pi-eye"
                    [rounded]="true"
                    [text]="true"
                    size="small"
                    severity="info"
                    pTooltip="Ver detalle"
                    (onClick)="openDetailModal(empresa)" />
                  <p-button
                    icon="pi pi-pencil"
                    [rounded]="true"
                    [text]="true"
                    size="small"
                    severity="secondary"
                    pTooltip="Editar"
                    (onClick)="openEditModal(empresa)" />
                  <p-button
                    icon="pi pi-trash"
                    [rounded]="true"
                    [text]="true"
                    size="small"
                    severity="danger"
                    pTooltip="Eliminar"
                    (onClick)="confirmDelete(empresa)" />
                </div>
              </td>
            </tr>
          </ng-template>

          <ng-template #emptymessage>
            <tr>
              <td colspan="4">
                <div class="empty-state">
                  <i class="pi pi-building"></i>
                  <p>No hay empresas registradas</p>
                  <p-button
                    label="Agregar primera empresa"
                    icon="pi pi-plus"
                    [outlined]="true"
                    size="small"
                    (onClick)="openCreateModal()" />
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>

      <!-- Modal Crear/Editar Empresa -->
      <p-dialog
        [header]="isEditing() ? 'Editar Empresa' : 'Crear Nueva Empresa'"
        [visible]="formModalVisible()"
        (visibleChange)="onFormModalClose($event)"
        [modal]="true"
        [closable]="true"
        [dismissableMask]="false"
        [style]="{ width: '520px' }"
        styleClass="empresa-form-dialog">

        <div class="modal-form">
          <div class="modal-form-grid">
            <div class="modal-field">
              <p-floatlabel>
                <input pInputText id="m_nombre" [(ngModel)]="form.nombre" class="w-full" />
                <label for="m_nombre">Nombre de la empresa *</label>
              </p-floatlabel>
            </div>

            <div class="modal-field">
              <p-floatlabel>
                <input
                  pInputText
                  id="m_nit"
                  [(ngModel)]="form.nit"
                  class="w-full"
                  [class.nit-error]="nitError()"
                  (blur)="onNitBlur()" />
                <label for="m_nit">NIT *</label>
              </p-floatlabel>
              @if (nitChecking()) {
                <small class="nit-checking">Verificando NIT...</small>
              }
              @if (nitError()) {
                <small class="nit-error-msg">{{ nitError() }}</small>
              }
            </div>

            <div class="modal-field">
              <p-floatlabel>
                <input pInputText id="m_rep_nombre" [(ngModel)]="form.representante_nombre" class="w-full" />
                <label for="m_rep_nombre">Nombre del representante legal *</label>
              </p-floatlabel>
            </div>

            <div class="modal-field">
              <p-floatlabel>
                <input pInputText id="m_rep_id" [(ngModel)]="form.representante_id" class="w-full" />
                <label for="m_rep_id">Identificacion del representante *</label>
              </p-floatlabel>
            </div>

            <div class="modal-field modal-field--full">
              <label class="field-label">Logo de la empresa (opcional)</label>
              @if (formLogoPreview()) {
                <div class="logo-preview-area">
                  <img [src]="formLogoPreview()" alt="Preview logo" class="logo-preview-img" />
                  <p-button
                    icon="pi pi-times"
                    [rounded]="true"
                    [text]="true"
                    size="small"
                    severity="danger"
                    styleClass="logo-remove-btn"
                    (onClick)="removeSelectedImage()" />
                </div>
              } @else {
                <app-file-upload
                  accept=".png,.jpg,.jpeg"
                  label="Seleccionar imagen (PNG, JPG - Max 2MB)"
                  [maxSizeMb]="2"
                  (fileSelected)="onImageSelected($event)" />
              }
            </div>
          </div>
        </div>

        <ng-template #footer>
          <div class="modal-footer">
            <p-button
              label="Cancelar"
              icon="pi pi-times"
              severity="secondary"
              [outlined]="true"
              (onClick)="onFormModalClose(false)" />
            <p-button
              [label]="isEditing() ? 'Actualizar' : 'Crear'"
              [icon]="isEditing() ? 'pi pi-check' : 'pi pi-plus'"
              [loading]="saving()"
              [disabled]="!isFormValid() || !!nitError()"
              (onClick)="onSave()" />
          </div>
        </ng-template>
      </p-dialog>

      <!-- Modal Ver Detalle -->
      <p-dialog
        header=""
        [visible]="detailModalVisible()"
        (visibleChange)="onDetailModalClose($event)"
        [modal]="true"
        [dismissableMask]="true"
        [style]="{ width: '440px' }"
        [showHeader]="false"
        styleClass="empresa-detail-dialog">

        <div class="detail-card">
          <div class="detail-card-header">
            @if (detailLogoUrl()) {
              <div class="detail-logo-container">
                <img [src]="detailLogoUrl()" alt="Logo" />
              </div>
            } @else {
              <div class="detail-logo-placeholder">
                <i class="pi pi-building"></i>
              </div>
            }
            <h3 class="detail-company-name">{{ detailEmpresa()?.nombre }}</h3>
            <span class="detail-nit">NIT {{ detailEmpresa()?.nit | formatNit }}</span>
          </div>

          <div class="detail-card-body">
            <div class="detail-separator"></div>
            <div class="detail-row">
              <div class="detail-row-icon"><i class="pi pi-user"></i></div>
              <div class="detail-row-content">
                <span class="detail-row-label">Representante legal</span>
                <span class="detail-row-value">{{ detailEmpresa()?.representante_nombre }}</span>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-row-icon"><i class="pi pi-id-card"></i></div>
              <div class="detail-row-content">
                <span class="detail-row-label">Identificacion</span>
                <span class="detail-row-value">{{ detailEmpresa()?.representante_id }}</span>
              </div>
            </div>
          </div>

          <div class="detail-card-footer">
            <p-button label="Cerrar" [text]="true" size="small" (onClick)="onDetailModalClose(false)" />
          </div>
        </div>
      </p-dialog>

      <p-confirmDialog />
    </div>
  `,
  styles: `
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 24px;
    }

    .page-header-text {
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

    /* --- Table card --- */
    .table-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
    }

    .table-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      gap: 16px;
    }

    .table-count {
      font-size: 13px;
      color: #64748b;
      white-space: nowrap;
    }

    /* --- Table cell styles --- */
    .logo-cell {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .logo-thumbnail {
      width: 40px;
      height: 40px;
      object-fit: contain;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      background: #fafbfc;
    }

    .logo-placeholder {
      width: 40px;
      height: 40px;
      border-radius: 6px;
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      i { font-size: 16px; color: #94a3b8; }
    }

    .empresa-name-cell {
      font-size: 14px;
      font-weight: 500;
      color: #1e293b;
    }

    .nit-cell {
      font-size: 13px;
      color: #475569;
      font-variant-numeric: tabular-nums;
    }

    .actions-cell {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2px;
    }

    /* --- Empty state --- */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 48px 24px;
      color: #94a3b8;

      i { font-size: 32px; }
      p {
        margin: 0;
        font-size: 14px;
        color: #64748b;
      }
    }

    /* --- Modal form --- */
    .modal-form {
      padding: 8px 0;
    }

    .modal-form-grid {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .modal-field { position: relative; }
    .modal-field--full { width: 100%; }

    .w-full { width: 100%; }

    .field-label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: #475569;
      margin-bottom: 8px;
    }

    /* --- NIT validation --- */
    :host ::ng-deep .nit-error {
      border-color: #ef4444 !important;
      &:focus { box-shadow: 0 0 0 1px #ef4444 !important; }
    }

    .nit-checking {
      display: block;
      margin-top: 4px;
      font-size: 12px;
      color: #64748b;
    }

    .nit-error-msg {
      display: block;
      margin-top: 4px;
      font-size: 12px;
      color: #ef4444;
    }

    /* --- Logo preview in modal --- */
    .logo-preview-area {
      position: relative;
      display: inline-flex;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      background: #fafbfc;
    }

    .logo-preview-img {
      display: block;
      max-width: 150px;
      max-height: 150px;
      object-fit: contain;
      border-radius: 4px;
    }

    :host ::ng-deep .logo-remove-btn {
      position: absolute !important;
      top: 4px;
      right: 4px;
    }

    /* --- Modal footer --- */
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    /* --- Detail dialog --- */
    :host ::ng-deep .empresa-detail-dialog {
      .p-dialog-content { padding: 0 !important; }
    }

    .detail-card {
      display: flex;
      flex-direction: column;
    }

    .detail-card-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 28px 24px 20px;
      background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
      text-align: center;
    }

    .detail-logo-container {
      width: 80px;
      height: 80px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px;
      margin-bottom: 14px;
      img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }
    }

    .detail-logo-placeholder {
      width: 80px;
      height: 80px;
      border-radius: 12px;
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 14px;
      i { font-size: 28px; color: #94a3b8; }
    }

    .detail-company-name {
      font-size: 18px;
      font-weight: 600;
      color: #0f172a;
      letter-spacing: -0.3px;
      margin-bottom: 4px;
    }

    .detail-nit {
      font-size: 13px;
      color: #64748b;
      font-variant-numeric: tabular-nums;
    }

    .detail-separator {
      height: 1px;
      background: #f1f5f9;
      margin-bottom: 16px;
    }

    .detail-card-body {
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .detail-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .detail-row-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      i { font-size: 14px; color: #64748b; }
    }

    .detail-row-content {
      display: flex;
      flex-direction: column;
      gap: 1px;
      padding-top: 2px;
    }

    .detail-row-label {
      font-size: 11px;
      font-weight: 500;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .detail-row-value {
      font-size: 14px;
      font-weight: 500;
      color: #1e293b;
    }

    .detail-card-footer {
      display: flex;
      justify-content: flex-end;
      padding: 12px 24px 16px;
      border-top: 1px solid #f1f5f9;
    }

    @media (max-width: 640px) {
      .page-header {
        flex-direction: column;
        gap: 12px;
      }
      .table-toolbar {
        flex-direction: column;
        align-items: stretch;
      }
    }
  `,
})
export class ConfigEmpresaPage implements OnInit {
  empresaService = inject(EmpresaService);
  private notify = inject(NotificationService);
  private confirmService = inject(ConfirmationService);

  dt = viewChild<Table>('dt');

  // Table
  filterValue = '';
  logoCache = signal<Map<string, string>>(new Map());

  // Form modal
  formModalVisible = signal(false);
  isEditing = signal(false);
  saving = signal(false);
  originalNit = signal<string | null>(null);
  formLogoPreview = signal<string | null>(null);
  private selectedImageData: { base64: string; mime: string } | null = null;
  private formDirty = false;

  form = {
    nombre: '',
    nit: '',
    imagen_path: '',
    representante_nombre: '',
    representante_id: '',
  };

  // NIT validation
  nitError = signal<string | null>(null);
  nitChecking = signal(false);

  // Detail modal
  detailModalVisible = signal(false);
  detailEmpresa = signal<Empresa | null>(null);
  detailLogoUrl = signal<string | null>(null);

  ngOnInit() {
    this.empresaService.loadEmpresas().then(() => this.loadLogos());
  }

  // --- Logo cache ---

  private async loadLogos() {
    const empresas = this.empresaService.empresas();
    const cache = new Map<string, string>();

    for (const emp of empresas) {
      try {
        const img = await this.empresaService.getEmpresaImagen(emp.nit);
        if (img) {
          cache.set(emp.nit, `data:${img.mime};base64,${img.imagenBase64}`);
        }
      } catch {
        // Logo not available
      }
    }

    this.logoCache.set(cache);
  }

  // --- Table ---

  onFilter() {
    this.dt()?.filterGlobal(this.filterValue, 'contains');
  }

  // --- Create modal ---

  openCreateModal() {
    this.resetForm();
    this.isEditing.set(false);
    this.formModalVisible.set(true);
  }

  // --- Edit modal ---

  async openEditModal(empresa: Empresa) {
    this.resetForm();
    this.form.nombre = empresa.nombre;
    this.form.nit = empresa.nit;
    this.form.imagen_path = empresa.imagen_path ?? '';
    this.form.representante_nombre = empresa.representante_nombre;
    this.form.representante_id = empresa.representante_id;
    this.originalNit.set(empresa.nit);
    this.isEditing.set(true);
    this.formModalVisible.set(true);

    // Load existing logo
    const cachedLogo = this.logoCache().get(empresa.nit);
    if (cachedLogo) {
      this.formLogoPreview.set(cachedLogo);
    } else {
      try {
        const img = await this.empresaService.getEmpresaImagen(empresa.nit);
        if (img) {
          this.formLogoPreview.set(`data:${img.mime};base64,${img.imagenBase64}`);
        }
      } catch {
        // Logo not available
      }
    }
  }

  // --- Detail modal ---

  async openDetailModal(empresa: Empresa) {
    this.detailEmpresa.set(empresa);
    this.detailLogoUrl.set(null);
    this.detailModalVisible.set(true);

    const cachedLogo = this.logoCache().get(empresa.nit);
    if (cachedLogo) {
      this.detailLogoUrl.set(cachedLogo);
    } else {
      try {
        const img = await this.empresaService.getEmpresaImagen(empresa.nit);
        if (img) {
          this.detailLogoUrl.set(`data:${img.mime};base64,${img.imagenBase64}`);
        }
      } catch {
        // Logo not available
      }
    }
  }

  onDetailModalClose(visible: boolean) {
    this.detailModalVisible.set(visible);
    if (!visible) {
      this.detailEmpresa.set(null);
      this.detailLogoUrl.set(null);
    }
  }

  // --- Form modal close ---

  onFormModalClose(visible: boolean) {
    if (!visible && this.formDirty) {
      this.confirmService.confirm({
        message: 'Tienes cambios sin guardar. ¿Deseas salir sin guardar?',
        header: 'Cambios sin guardar',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Si, salir',
        rejectLabel: 'Cancelar',
        accept: () => {
          this.formModalVisible.set(false);
          this.resetForm();
        },
      });
    } else {
      this.formModalVisible.set(visible);
      if (!visible) {
        this.resetForm();
      }
    }
  }

  // --- NIT validation ---

  async onNitBlur() {
    const nit = this.form.nit.trim();
    if (!nit) {
      this.nitError.set(null);
      return;
    }

    // If editing and NIT hasn't changed, no check needed
    if (this.isEditing() && nit === this.originalNit()) {
      this.nitError.set(null);
      return;
    }

    this.nitChecking.set(true);
    try {
      const existing = await this.empresaService.getEmpresaByNit(nit);
      if (existing) {
        this.nitError.set(
          `El NIT ${formatNit(nit)} ya esta registrado para la empresa "${existing.nombre}"`
        );
      } else {
        this.nitError.set(null);
      }
    } catch {
      this.nitError.set(null);
    } finally {
      this.nitChecking.set(false);
    }
  }

  // --- Image handling ---

  async onImageSelected(file: File) {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      this.notify.error('Formato no valido', 'Solo se permiten archivos PNG o JPG');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.notify.error('Archivo muy grande', 'El tamano maximo permitido es 2MB');
      return;
    }

    const base64 = await this.fileToBase64(file);
    this.selectedImageData = { base64, mime: file.type || 'image/jpeg' };
    this.formLogoPreview.set(`data:${this.selectedImageData.mime};base64,${base64}`);
    this.formDirty = true;
  }

  removeSelectedImage() {
    this.selectedImageData = null;
    this.formLogoPreview.set(null);
    this.form.imagen_path = '';
    this.formDirty = true;
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve(dataUrl.split(',')[1] ?? '');
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  // --- Form validation ---

  isFormValid(): boolean {
    return !!(
      this.form.nombre.trim() &&
      this.form.nit.trim() &&
      this.form.representante_nombre.trim() &&
      this.form.representante_id.trim()
    );
  }

  // --- Save ---

  async onSave() {
    if (!this.isFormValid()) {
      this.notify.warn('Campos obligatorios', 'Por favor, completa todos los campos obligatorios');
      return;
    }

    if (this.nitError()) {
      this.notify.error('NIT duplicado', 'El NIT ingresado ya existe en el sistema');
      return;
    }

    if (this.isEditing()) {
      this.confirmUpdate();
    } else {
      await this.createEmpresa();
    }
  }

  private confirmUpdate() {
    this.confirmService.confirm({
      message: `¿Estas seguro de que deseas actualizar los datos de la empresa "${this.form.nombre}"?`,
      header: 'Confirmar actualizacion',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Si, actualizar',
      rejectLabel: 'Cancelar',
      accept: () => this.updateEmpresa(),
    });
  }

  private async createEmpresa() {
    this.saving.set(true);
    try {
      let imagenPath: string | undefined;

      if (this.selectedImageData) {
        imagenPath = await this.empresaService.saveEmpresaImagen(
          this.form.nit,
          this.selectedImageData.base64,
          this.selectedImageData.mime
        );
      }

      await this.empresaService.createEmpresa({
        nombre: this.form.nombre,
        nit: this.form.nit,
        imagen_path: imagenPath,
        representante_nombre: this.form.representante_nombre,
        representante_id: this.form.representante_id,
      });

      this.notify.success('Empresa creada exitosamente');
      this.formModalVisible.set(false);
      this.resetForm();
      await this.empresaService.loadEmpresas();
      await this.loadLogos();
    } catch (err) {
      const msg = String(err);
      if (msg.toLowerCase().includes('nit')) {
        this.notify.error('NIT duplicado', 'El NIT ingresado ya existe en el sistema');
      } else {
        this.notify.error('Error al crear empresa', msg);
      }
    } finally {
      this.saving.set(false);
    }
  }

  private async updateEmpresa() {
    this.saving.set(true);
    try {
      const currentNit = this.originalNit()!;
      let imagenPath: string | undefined = this.form.imagen_path || undefined;

      if (this.selectedImageData) {
        imagenPath = await this.empresaService.saveEmpresaImagen(
          this.form.nit,
          this.selectedImageData.base64,
          this.selectedImageData.mime
        );
      }

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
      this.notify.success('Empresa actualizada correctamente');
      this.formModalVisible.set(false);
      this.resetForm();
      await this.empresaService.loadEmpresas();
      await this.loadLogos();
    } catch (err) {
      const msg = String(err);
      if (msg.toLowerCase().includes('nit')) {
        this.notify.error('NIT duplicado', 'El NIT ingresado ya existe en el sistema');
      } else {
        this.notify.error('Error al actualizar empresa', msg);
      }
    } finally {
      this.saving.set(false);
    }
  }

  // --- Delete ---

  confirmDelete(empresa: Empresa) {
    this.confirmService.confirm({
      message: `¿Eliminar la empresa "${empresa.nombre}" (NIT ${formatNit(empresa.nit)})?`,
      header: 'Confirmar eliminacion',
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
      this.notify.success('Empresa eliminada correctamente');
      await this.loadLogos();
    } catch (err) {
      this.notify.error('Error al eliminar', String(err));
    }
  }

  // --- Reset ---

  private resetForm() {
    this.form = {
      nombre: '',
      nit: '',
      imagen_path: '',
      representante_nombre: '',
      representante_id: '',
    };
    this.originalNit.set(null);
    this.selectedImageData = null;
    this.formLogoPreview.set(null);
    this.nitError.set(null);
    this.nitChecking.set(false);
    this.formDirty = false;
  }
}
