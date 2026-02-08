import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { FloatLabel } from 'primeng/floatlabel';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import { UserConfigService } from './user-config.service';

@Component({
  selector: 'app-config-usuario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, InputText, FloatLabel, Button, Message],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Configuracion de Usuario</h1>
        <p class="page-subtitle">Datos personales para los certificados generados</p>
      </div>

      <div class="form-card">
        <div class="form-section">
          <h3 class="section-title">Datos del Firmante</h3>
          <p class="section-desc">Esta informacion aparecera en la firma de los certificados.</p>

          <div class="form-grid">
            <p-floatlabel>
              <input pInputText id="nombre" [(ngModel)]="nombre" class="w-full" />
              <label for="nombre">Nombre completo</label>
            </p-floatlabel>

            <p-floatlabel>
              <input pInputText id="cedula" [(ngModel)]="cedula" class="w-full" />
              <label for="cedula">Cedula de ciudadania</label>
            </p-floatlabel>
          </div>
        </div>

        @if (saved()) {
          <p-message severity="success" text="Configuracion guardada correctamente" styleClass="msg-block" />
        }

        <div class="form-actions">
          <p-button
            label="Guardar"
            icon="pi pi-save"
            [disabled]="!nombre.trim() || !cedula.trim()"
            (onClick)="save()" />
        </div>
      </div>
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

    .form-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 24px;
      max-width: 560px;
    }

    .section-title {
      font-size: 15px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 4px;
    }

    .section-desc {
      font-size: 12px;
      color: #94a3b8;
      margin-bottom: 20px;
    }

    .form-grid {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .w-full { width: 100%; }

    :host ::ng-deep .msg-block {
      display: block;
      margin-top: 16px;
    }

    .form-actions {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #f1f5f9;
    }
  `,
})
export class ConfigUsuarioComponent {
  private configService = inject(UserConfigService);

  nombre = this.configService.config().nombre;
  cedula = this.configService.config().cedula;
  saved = signal(false);

  save() {
    this.configService.updateConfig({
      nombre: this.nombre.trim(),
      cedula: this.cedula.trim(),
    });
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 3000);
  }
}
