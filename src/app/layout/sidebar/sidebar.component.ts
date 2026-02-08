import { Component, ChangeDetectionStrategy, model } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="sidebar" [class.collapsed]="collapsed()">
      <div class="sidebar-brand">
        <span class="brand-icon">A</span>
        <span class="brand-text">AMD Tools</span>
      </div>

      <div class="sidebar-nav">
        <div class="nav-section">
          <span class="nav-section-label">Herramientas</span>
          <a class="nav-item"
             routerLink="/tools/certificados-crypto"
             routerLinkActive="active">
            <i class="pi pi-file-check"></i>
            <span>Certificados Crypto</span>
          </a>
          <a class="nav-item"
             routerLink="/tools/certificados-crypto/config-empresa"
             routerLinkActive="active">
            <i class="pi pi-building"></i>
            <span>Config. Empresa</span>
          </a>
          <a class="nav-item"
             routerLink="/tools/certificados-crypto/config-firmante"
             routerLinkActive="active">
            <i class="pi pi-pen-to-square"></i>
            <span>Config. Firmante</span>
          </a>
        </div>

        <div class="nav-section">
          <span class="nav-section-label">Sistema</span>
          <a class="nav-item"
             routerLink="/config/usuario"
             routerLinkActive="active">
            <i class="pi pi-user-edit"></i>
            <span>Config. Usuario</span>
          </a>
        </div>
      </div>
    </nav>
  `,
  styles: `
    .sidebar {
      width: var(--sidebar-width);
      height: 100vh;
      background: #0f172a;
      color: #94a3b8;
      display: flex;
      flex-direction: column;
      border-right: 1px solid #1e293b;
      position: fixed;
      left: 0;
      top: 0;
      z-index: 100;
      transition: width 0.2s ease;
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      border-bottom: 1px solid #1e293b;
    }

    .brand-icon {
      width: 32px;
      height: 32px;
      background: #3b82f6;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 16px;
      flex-shrink: 0;
    }

    .brand-text {
      font-size: 16px;
      font-weight: 600;
      color: #f1f5f9;
      letter-spacing: -0.3px;
    }

    .sidebar-nav {
      flex: 1;
      padding: 12px 0;
      overflow-y: auto;
    }

    .nav-section {
      margin-bottom: 8px;
    }

    .nav-section-label {
      display: block;
      padding: 8px 20px 6px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #475569;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 20px;
      font-size: 13px;
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.15s ease;
      border-left: 3px solid transparent;
      text-decoration: none;

      &:hover {
        background: #1e293b;
        color: #e2e8f0;
      }

      &.active {
        background: #1e293b;
        color: #f1f5f9;
        border-left-color: #3b82f6;
      }

      i {
        font-size: 15px;
        width: 20px;
        text-align: center;
      }
    }
  `,
})
export class SidebarComponent {
  collapsed = model(false);
}
