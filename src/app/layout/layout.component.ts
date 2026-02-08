import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { HeaderComponent } from './header/header.component';

@Component({
  selector: 'app-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent],
  template: `
    <div class="layout">
      <app-sidebar [collapsed]="sidebarCollapsed()" />

      <div class="layout-main">
        <app-header (toggleSidebar)="toggleSidebar()" />
        <main class="layout-content">
          <router-outlet />
        </main>
      </div>
    </div>

    @if (sidebarCollapsed()) {
      <div class="sidebar-overlay" (click)="sidebarCollapsed.set(true)"></div>
    }
  `,
  styles: `
    .layout {
      display: flex;
      min-height: 100vh;
    }

    .layout-main {
      flex: 1;
      margin-left: var(--sidebar-width);
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      transition: margin-left 0.2s ease;
    }

    .layout-content {
      flex: 1;
      padding: var(--content-padding);
      background: #f8fafc;
    }

    .sidebar-overlay {
      display: none;
    }

    @media (max-width: 768px) {
      .layout-main {
        margin-left: 0;
      }

      :host ::ng-deep .sidebar {
        transform: translateX(-100%);
      }

      :host ::ng-deep .sidebar:not(.collapsed) {
        transform: translateX(0);
      }

      .sidebar-overlay {
        display: block;
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.3);
        z-index: 99;
      }
    }
  `,
})
export class LayoutComponent {
  sidebarCollapsed = signal(true);

  toggleSidebar() {
    this.sidebarCollapsed.update(v => !v);
  }
}
