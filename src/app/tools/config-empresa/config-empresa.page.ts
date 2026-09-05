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
import { Select } from 'primeng/select';
import { FileUploadComponent } from '../../shared/components/file-upload/file-upload.component';
import { FormatNitPipe, formatNit } from '../../shared/pipes/format-nit.pipe';
import { NotificationService } from '../../shared/services/notification.service';
import { EmpresaService, Empresa, UpdateEmpresaDto } from '../../shared/services/empresa.service';

@Component({
  selector: 'app-config-empresa',
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
    Select,
    FormatNitPipe,
    FileUploadComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './config-empresa.page.html',
  styleUrl: './config-empresa.page.scss',
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

  tipoDocumentoOptions = [
    { label: 'Cédula de ciudadanía', value: 'CC' },
    { label: 'Cédula de extranjería', value: 'CE' },
  ];

  generoOptions = [
    { label: 'Hombre', value: 'M' },
    { label: 'Mujer', value: 'F' },
  ];

  form = {
    nombre: '',
    nit: '',
    imagen_path: '',
    representante_nombre: '',
    representante_id: '',
    tipo_documento: 'CC',
    genero_representante: 'M',
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
    this.form.tipo_documento = empresa.tipo_documento || 'CC';
    this.form.genero_representante = empresa.genero_representante || 'M';
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
        tipo_documento: this.form.tipo_documento,
        genero_representante: this.form.genero_representante,
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
        tipo_documento: this.form.tipo_documento,
        genero_representante: this.form.genero_representante,
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
      tipo_documento: 'CC',
      genero_representante: 'M',
    };
    this.originalNit.set(null);
    this.selectedImageData = null;
    this.formLogoPreview.set(null);
    this.nitError.set(null);
    this.nitChecking.set(false);
    this.formDirty = false;
  }
}
