import { Component, inject, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { NotificationService } from './shared/services/notification.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toast],
  providers: [MessageService],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private messageService = inject(MessageService);
  private notificationService = inject(NotificationService);

  constructor() {
    effect(() => {
      const msg = this.notificationService.message();
      if (msg) {
        this.messageService.add({
          severity: msg.severity,
          summary: msg.summary,
          detail: msg.detail,
          life: msg.life ?? 4000,
        });
      }
    });
  }
}
