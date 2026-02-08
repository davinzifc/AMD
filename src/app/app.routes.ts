import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'tools/certificados-crypto',
        pathMatch: 'full',
      },
      {
        path: 'tools/certificados-crypto',
        loadChildren: () =>
          import('./tools/certificados-crypto/certificados-crypto.routes').then(
            (m) => m.CERTIFICADOS_CRYPTO_ROUTES
          ),
      },
      {
        path: 'config/usuario',
        loadComponent: () =>
          import('./tools/config-usuario/config-usuario.component').then(
            (m) => m.ConfigUsuarioComponent
          ),
      },
    ],
  },
];
