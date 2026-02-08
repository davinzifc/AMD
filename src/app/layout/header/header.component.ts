import { Component, ChangeDetectionStrategy, output } from '@angular/core';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="header">
      <button class="menu-toggle" (click)="toggleSidebar.emit()">
        <i class="pi pi-bars"></i>
      </button>
      <div class="header-spacer"></div>
    </header>
  `,
  styles: `
    .header {
      height: var(--header-height);
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      padding: 0 20px;
    }

    .menu-toggle {
      display: none;
      background: none;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 10px;
      cursor: pointer;
      color: #475569;
      font-size: 16px;
      transition: all 0.15s ease;

      &:hover {
        background: #f1f5f9;
        color: #1e293b;
      }
    }

    .header-spacer {
      flex: 1;
    }

    @media (max-width: 768px) {
      .menu-toggle {
        display: flex;
      }
    }
  `,
})
export class HeaderComponent {
  toggleSidebar = output<void>();
}
