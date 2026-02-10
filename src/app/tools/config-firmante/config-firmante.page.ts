import { Component, ChangeDetectionStrategy, inject, signal, OnInit, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { Table, TableModule } from 'primeng/table';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { Divider } from 'primeng/divider';
import { Tooltip } from 'primeng/tooltip';
import { FileUploadComponent } from '../../shared/components/file-upload/file-upload.component';
import { NotificationService } from '../../shared/services/notification.service';
import { FirmanteService } from '../../shared/services/firmante.service';
import { FirmanteListItem } from '../../shared/models/firmante.model';

@Component({
  selector: 'app-config-firmante',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    InputText,
    Button,
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
  templateUrl: './config-firmante.page.html',
  styleUrl: './config-firmante.page.scss',
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
