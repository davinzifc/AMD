import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import { UserConfigService } from './user-config.service';

@Component({
  selector: 'app-config-usuario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, InputText, Button, Message],
  templateUrl: './config-usuario.component.html',
  styleUrl: './config-usuario.component.scss',
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
