import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { Button } from 'primeng/button';
import { FloatLabel } from 'primeng/floatlabel';
import { Message } from 'primeng/message';
import { FileUploadComponent } from '../../../../shared/components/file-upload/file-upload.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { EmpresaService, Empresa } from '../../services/empresa.service';

@Component({
  selector: 'app-config-empresa',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, InputText, Button, FloatLabel, Message, FileUploadComponent],
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
              <input
                pInputText
                id="nit"
                [(ngModel)]="form.nit"
                class="w-full"
                [disabled]="isEditing()" />
              <label for="nit">NIT *</label>
            </p-floatlabel>
            @if (isEditing()) {
              <small class="field-hint">El NIT no se puede modificar</small>
            }
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
                  <span class="empresa-nit">NIT: {{ emp.nit }}</span>
                </div>
                <i class="pi pi-chevron-right"></i>
              </div>
            }
          </div>
        </div>
      }
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

  onImageSelected(file: File) {
    // For now, store the file name — in full implementation,
    // we'd save via tauri-plugin-fs and store the path
    this.form.imagen_path = file.name;
  }

  loadEmpresa(empresa: Empresa) {
    this.form.nombre = empresa.nombre;
    this.form.nit = empresa.nit;
    this.form.imagen_path = empresa.imagen_path ?? '';
    this.form.representante_nombre = empresa.representante_nombre;
    this.form.representante_id = empresa.representante_id;
    this.isEditing.set(true);
    this.clearMessages();
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
    this.clearMessages();
  }

  async onSave() {
    this.saving.set(true);
    this.clearMessages();

    try {
      if (this.isEditing()) {
        await this.empresaService.updateEmpresa(this.form.nit, {
          nombre: this.form.nombre,
          imagen_path: this.form.imagen_path || undefined,
          representante_nombre: this.form.representante_nombre,
          representante_id: this.form.representante_id,
        });
        this.successMessage.set('Empresa actualizada correctamente');
        this.notify.success('Empresa actualizada');
      } else {
        await this.empresaService.createEmpresa({
          nombre: this.form.nombre,
          nit: this.form.nit,
          imagen_path: this.form.imagen_path || undefined,
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
