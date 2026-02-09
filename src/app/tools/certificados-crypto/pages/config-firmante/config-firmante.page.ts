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
import { Divider } from 'primeng/divider';
import { Tooltip } from 'primeng/tooltip';
import { FileUploadComponent } from '../../../../shared/components/file-upload/file-upload.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { FirmanteService } from '../../services/firmante.service';
import { FirmanteListItem } from '../../models/firmante.model';

@Component({
  selector: 'app-config-firmante',
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
    Divider,
    Tooltip,
    FileUploadComponent,
  ],
  providers: [ConfirmationService],
  template: `
    <div class="page">
      <div class="page-header">
        <div class="page-header-text">
          <h1>Configuracion de Firmantes</h1>
          <p class="page-subtitle">Administra los firmantes disponibles para los certificados</p>
        </div>
        <p-button
          label="Agregar Firmante"
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
              placeholder="Buscar por nombre o cedula..."
              [(ngModel)]="filterValue"
              (input)="onFilter()" />
          </p-iconfield>
          <span class="table-count">
            {{ firmanteService.firmantes().length }} firmantes registrados
          </span>
        </div>

        <p-table
          #dt
          [value]="firmanteService.firmantes()"
          [paginator]="true"
          [rows]="10"
          [rowsPerPageOptions]="[10, 25, 50]"
          [globalFilterFields]="['nombre', 'cc_id']"
          [sortField]="'nombre'"
          [sortOrder]="1"
          [loading]="firmanteService.loading()"
          dataKey="id"
          styleClass="p-datatable-sm">

          <ng-template #header>
            <tr>
              <th pSortableColumn="nombre">
                Nombre Completo <p-sortIcon field="nombre" />
              </th>
              <th pSortableColumn="cc_id">
                Cedula / Identificacion <p-sortIcon field="cc_id" />
              </th>
              <th style="width: 150px; text-align: center">Acciones</th>
            </tr>
          </ng-template>

          <ng-template #body let-firmante>
            <tr>
              <td>
                <span class="firmante-name-cell">{{ firmante.nombre }}</span>
              </td>
              <td>
                <span class="cc-cell">{{ firmante.cc_id }}</span>
              </td>
              <td>
                <div class="actions-cell">
                  <p-button
                    icon="pi pi-eye"
                    [rounded]="true"
                    [text]="true"
                    size="small"
                    severity="info"
                    pTooltip="Ver informacion completa"
                    (onClick)="openDetailModal(firmante)" />
                  <p-button
                    icon="pi pi-pencil"
                    [rounded]="true"
                    [text]="true"
                    size="small"
                    severity="secondary"
                    pTooltip="Editar firmante"
                    (onClick)="openEditModal(firmante)" />
                  <p-button
                    icon="pi pi-trash"
                    [rounded]="true"
                    [text]="true"
                    size="small"
                    severity="danger"
                    pTooltip="Eliminar firmante"
                    (onClick)="confirmDelete(firmante)" />
                </div>
              </td>
            </tr>
          </ng-template>

          <ng-template #emptymessage>
            <tr>
              <td colspan="3">
                <div class="empty-state">
                  <i class="pi pi-user"></i>
                  <p>No hay firmantes registrados</p>
                  <p-button
                    label="Agregar primer firmante"
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

      <!-- Modal Crear/Editar Firmante -->
      <p-dialog
        [header]="isEditing() ? 'Editar Firmante' : 'Crear Nuevo Firmante'"
        [visible]="formModalVisible()"
        (visibleChange)="onFormModalClose($event)"
        [modal]="true"
        [closable]="true"
        [dismissableMask]="false"
        [style]="{ width: '520px' }"
        styleClass="firmante-form-dialog">

        <div class="modal-form">
          <div class="modal-form-grid">
            <div class="modal-field">
              <p-floatlabel>
                <input pInputText id="m_nombre" [(ngModel)]="form.nombre" class="w-full" />
                <label for="m_nombre">Nombre completo *</label>
              </p-floatlabel>
            </div>

            <div class="modal-field">
              <p-floatlabel>
                <input
                  pInputText
                  id="m_cc_id"
                  [(ngModel)]="form.cc_id"
                  class="w-full"
                  [class.cedula-error]="cedulaError()"
                  (blur)="onCedulaBlur()" />
                <label for="m_cc_id">Cedula / Identificacion *</label>
              </p-floatlabel>
              @if (cedulaChecking()) {
                <small class="cedula-checking">Verificando cedula...</small>
              }
              @if (cedulaError()) {
                <small class="cedula-error-msg">{{ cedulaError() }}</small>
              }
            </div>

            <div class="modal-field modal-field--full">
              <label class="field-label">Imagen de firma {{ isEditing() ? '' : '*' }}</label>
              @if (formFirmaPreview()) {
                <div class="firma-preview-area">
                  <img [src]="formFirmaPreview()" alt="Vista previa firma" class="firma-preview-img" />
                  <p-button
                    icon="pi pi-times"
                    [rounded]="true"
                    [text]="true"
                    size="small"
                    severity="danger"
                    styleClass="firma-remove-btn"
                    (onClick)="removeSelectedImage()" />
                </div>
              } @else {
                <app-file-upload
                  accept=".png,.jpg,.jpeg"
                  label="Seleccionar imagen de firma (PNG, JPG - Max 2MB)"
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
              [disabled]="!isFormValid() || !!cedulaError()"
              (onClick)="onSave()" />
          </div>
        </ng-template>
      </p-dialog>

      <!-- Modal Ver Detalle con Blur de Seguridad -->
      <p-dialog
        header="Informacion del Firmante"
        [visible]="detailModalVisible()"
        (visibleChange)="onDetailModalClose($event)"
        [modal]="true"
        [dismissableMask]="true"
        [style]="{ width: '600px' }"
        styleClass="firmante-detail-dialog">

        <div class="detail-content">
          <!-- Seccion firma con blur de seguridad -->
          <div class="firma-section">
            @if (detailFirmaUrl()) {
              <div class="firma-wrapper" (click)="toggleBlur()">
                <img
                  [src]="detailFirmaUrl()"
                  alt="Firma del firmante"
                  class="firma-image"
                  [class.blurred]="firmaBlurred()" />
                @if (firmaBlurred()) {
                  <div class="blur-overlay">
                    <i class="pi pi-eye"></i>
                    <p class="blur-message">Click para visualizar la firma</p>
                  </div>
                }
              </div>
            } @else {
              <div class="firma-placeholder">
                <i class="pi pi-image"></i>
                <p>Sin imagen de firma</p>
              </div>
            }
          </div>

          <p-divider />

          <!-- Informacion del firmante -->
          <div class="info-section">
            <div class="detail-row">
              <div class="detail-row-icon"><i class="pi pi-user"></i></div>
              <div class="detail-row-content">
                <span class="detail-row-label">Nombre Completo</span>
                <span class="detail-row-value">{{ detailFirmante()?.nombre }}</span>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-row-icon"><i class="pi pi-id-card"></i></div>
              <div class="detail-row-content">
                <span class="detail-row-label">Cedula / Identificacion</span>
                <span class="detail-row-value">{{ detailFirmante()?.cc_id }}</span>
              </div>
            </div>
          </div>
        </div>

        <ng-template #footer>
          <div class="modal-footer">
            <p-button
              label="Cerrar"
              icon="pi pi-times"
              severity="secondary"
              [outlined]="true"
              (onClick)="onDetailModalClose(false)" />
          </div>
        </ng-template>
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
    .firmante-name-cell {
      font-size: 14px;
      font-weight: 500;
      color: #1e293b;
    }

    .cc-cell {
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

    /* --- Cedula validation --- */
    :host ::ng-deep .cedula-error {
      border-color: #ef4444 !important;
      &:focus { box-shadow: 0 0 0 1px #ef4444 !important; }
    }

    .cedula-checking {
      display: block;
      margin-top: 4px;
      font-size: 12px;
      color: #64748b;
    }

    .cedula-error-msg {
      display: block;
      margin-top: 4px;
      font-size: 12px;
      color: #ef4444;
    }

    /* --- Firma preview in form modal --- */
    .firma-preview-area {
      position: relative;
      display: inline-flex;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      background: #fafbfc;
    }

    .firma-preview-img {
      display: block;
      max-width: 300px;
      max-height: 150px;
      object-fit: contain;
      border-radius: 4px;
    }

    :host ::ng-deep .firma-remove-btn {
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

    /* --- Detail modal --- */
    .detail-content {
      display: flex;
      flex-direction: column;
    }

    /* --- Firma section with blur security --- */
    .firma-section {
      display: flex;
      justify-content: center;
      padding: 8px 0 16px;
    }

    .firma-wrapper {
      position: relative;
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 8px;
      transition: background 0.2s ease;

      &:hover {
        background: rgba(0, 0, 0, 0.02);
      }
    }

    .firma-image {
      max-width: 350px;
      max-height: 175px;
      width: auto;
      height: auto;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      transition: filter 0.4s ease-in-out;
    }

    .firma-image.blurred {
      filter: blur(12px);
    }

    .blur-overlay {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      pointer-events: none;

      i {
        font-size: 2rem;
        color: #495057;
      }

      .blur-message {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #495057;
        text-align: center;
        white-space: nowrap;
      }
    }

    .firma-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 32px;
      background: #f8fafc;
      border: 1px dashed #e2e8f0;
      border-radius: 8px;
      width: 100%;

      i {
        font-size: 32px;
        color: #cbd5e1;
      }
      p {
        margin: 0;
        font-size: 13px;
        color: #94a3b8;
      }
    }

    /* --- Detail info section --- */
    .info-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding-top: 8px;
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
export class ConfigFirmantePage implements OnInit {
  firmanteService = inject(FirmanteService);
  private notify = inject(NotificationService);
  private confirmService = inject(ConfirmationService);

  dt = viewChild<Table>('dt');

  // Table
  filterValue = '';

  // Form modal
  formModalVisible = signal(false);
  isEditing = signal(false);
  saving = signal(false);
  editingId = signal<number | null>(null);
  originalCcId = signal<string | null>(null);
  formFirmaPreview = signal<string | null>(null);
  private firmaImagenBytes: number[] | null = null;
  private firmaMime: string | null = null;
  private formDirty = false;
  private keepExistingFirma = false;

  form = {
    nombre: '',
    cc_id: '',
  };

  // Cedula validation
  cedulaError = signal<string | null>(null);
  cedulaChecking = signal(false);

  // Detail modal
  detailModalVisible = signal(false);
  detailFirmante = signal<FirmanteListItem | null>(null);
  detailFirmaUrl = signal<string | null>(null);
  firmaBlurred = signal(true);

  ngOnInit() {
    this.firmanteService.loadFirmantes();
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

  async openEditModal(firmante: FirmanteListItem) {
    this.resetForm();
    this.form.nombre = firmante.nombre;
    this.form.cc_id = firmante.cc_id;
    this.editingId.set(firmante.id);
    this.originalCcId.set(firmante.cc_id);
    this.isEditing.set(true);
    this.keepExistingFirma = true;
    this.formModalVisible.set(true);

    // Load existing firma image (SIN blur en contexto edicion)
    if (firmante.has_firma) {
      try {
        const img = await this.firmanteService.getFirmaImagen(firmante.id);
        if (img) {
          const url = FirmanteService.imageBytesToDataUri(img.imagen, img.mime);
          this.formFirmaPreview.set(url);
          this.firmaImagenBytes = img.imagen;
          this.firmaMime = img.mime;
        }
      } catch {
        // Firma not available
      }
    }
  }

  // --- Detail modal with blur ---

  async openDetailModal(firmante: FirmanteListItem) {
    this.detailFirmante.set(firmante);
    this.detailFirmaUrl.set(null);
    this.firmaBlurred.set(true);
    this.detailModalVisible.set(true);

    if (firmante.has_firma) {
      try {
        const img = await this.firmanteService.getFirmaImagen(firmante.id);
        if (img) {
          this.detailFirmaUrl.set(
            FirmanteService.imageBytesToDataUri(img.imagen, img.mime)
          );
        }
      } catch {
        // Firma not available
      }
    }
  }

  toggleBlur() {
    this.firmaBlurred.set(false);
  }

  onDetailModalClose(visible: boolean) {
    this.detailModalVisible.set(visible);
    if (!visible) {
      this.detailFirmante.set(null);
      this.detailFirmaUrl.set(null);
      this.firmaBlurred.set(true);
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

  // --- Cedula validation ---

  async onCedulaBlur() {
    const ccId = this.form.cc_id.trim();
    if (!ccId) {
      this.cedulaError.set(null);
      return;
    }

    if (this.isEditing() && ccId === this.originalCcId()) {
      this.cedulaError.set(null);
      return;
    }

    this.cedulaChecking.set(true);
    try {
      const existing = await this.firmanteService.getFirmanteByCcId(ccId);
      if (existing) {
        this.cedulaError.set(
          `La cedula ${ccId} ya esta registrada para el firmante "${existing.nombre}"`
        );
      } else {
        this.cedulaError.set(null);
      }
    } catch {
      this.cedulaError.set(null);
    } finally {
      this.cedulaChecking.set(false);
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

    const data = await FirmanteService.fileToImageData(file);
    this.firmaImagenBytes = data.firma_imagen;
    this.firmaMime = data.firma_mime;
    this.formFirmaPreview.set(FirmanteService.imageBytesToDataUri(data.firma_imagen, data.firma_mime));
    this.keepExistingFirma = false;
    this.formDirty = true;
  }

  removeSelectedImage() {
    this.firmaImagenBytes = null;
    this.firmaMime = null;
    this.formFirmaPreview.set(null);
    this.keepExistingFirma = false;
    this.formDirty = true;
  }

  // --- Form validation ---

  isFormValid(): boolean {
    const hasBasicFields = !!(this.form.nombre.trim() && this.form.cc_id.trim());
    if (this.isEditing()) {
      return hasBasicFields;
    }
    // For create, firma is required
    return hasBasicFields && !!this.firmaImagenBytes;
  }

  // --- Save ---

  async onSave() {
    if (!this.isFormValid()) {
      this.notify.warn('Campos obligatorios', 'Por favor, completa todos los campos obligatorios');
      return;
    }

    if (this.cedulaError()) {
      this.notify.error('Cedula duplicada', 'La cedula/identificacion ingresada ya existe en el sistema');
      return;
    }

    if (this.isEditing()) {
      this.confirmUpdate();
    } else {
      await this.createFirmante();
    }
  }

  private confirmUpdate() {
    this.confirmService.confirm({
      message: `¿Estas seguro de que deseas actualizar los datos del firmante "${this.form.nombre}"?`,
      header: 'Confirmar actualizacion',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Si, actualizar',
      rejectLabel: 'Cancelar',
      accept: () => this.updateFirmante(),
    });
  }

  private async createFirmante() {
    this.saving.set(true);
    try {
      const firmaData = this.firmaImagenBytes
        ? { firma_imagen: this.firmaImagenBytes, firma_mime: this.firmaMime! }
        : {};

      await this.firmanteService.createFirmante({
        nombre: this.form.nombre,
        cc_id: this.form.cc_id,
        ...firmaData,
      });

      this.notify.success('Firmante creado exitosamente');
      this.formModalVisible.set(false);
      this.resetForm();
    } catch (err) {
      const msg = String(err);
      if (msg.toLowerCase().includes('cedula') || msg.toLowerCase().includes('cc_id')) {
        this.notify.error('Cedula duplicada', 'La cedula/identificacion ingresada ya existe en el sistema');
      } else {
        this.notify.error('Error al crear firmante', msg);
      }
    } finally {
      this.saving.set(false);
    }
  }

  private async updateFirmante() {
    this.saving.set(true);
    try {
      const id = this.editingId()!;
      const dto: any = {
        nombre: this.form.nombre,
        cc_id: this.form.cc_id,
      };

      // Only send firma if user selected a new image
      if (this.firmaImagenBytes && !this.keepExistingFirma) {
        dto.firma_imagen = this.firmaImagenBytes;
        dto.firma_mime = this.firmaMime;
      }

      await this.firmanteService.updateFirmante(id, dto);
      this.notify.success('Firmante actualizado correctamente');
      this.formModalVisible.set(false);
      this.resetForm();
    } catch (err) {
      const msg = String(err);
      if (msg.toLowerCase().includes('cedula') || msg.toLowerCase().includes('cc_id')) {
        this.notify.error('Cedula duplicada', 'La cedula/identificacion ingresada ya existe en el sistema');
      } else {
        this.notify.error('Error al actualizar firmante', msg);
      }
    } finally {
      this.saving.set(false);
    }
  }

  // --- Delete ---

  confirmDelete(firmante: FirmanteListItem) {
    this.confirmService.confirm({
      message: `¿Eliminar al firmante "${firmante.nombre}" (${firmante.cc_id})? Esta accion no se puede deshacer.`,
      header: 'Confirmar eliminacion',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Si, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteFirmante(firmante.id),
    });
  }

  private async deleteFirmante(id: number) {
    try {
      await this.firmanteService.deleteFirmante(id);
      this.notify.success('Firmante eliminado correctamente');
    } catch (err) {
      this.notify.error('Error al eliminar', String(err));
    }
  }

  // --- Reset ---

  private resetForm() {
    this.form = { nombre: '', cc_id: '' };
    this.editingId.set(null);
    this.originalCcId.set(null);
    this.firmaImagenBytes = null;
    this.firmaMime = null;
    this.formFirmaPreview.set(null);
    this.cedulaError.set(null);
    this.cedulaChecking.set(false);
    this.keepExistingFirma = false;
    this.formDirty = false;
  }
}
