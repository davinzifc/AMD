import { Routes } from '@angular/router';
import { CryptoMainPage } from './pages/main/main.page';
import { ConfigEmpresaPage } from './pages/config-empresa/config-empresa.page';

export const CERTIFICADOS_CRYPTO_ROUTES: Routes = [
  {
    path: '',
    component: CryptoMainPage,
  },
  {
    path: 'config-empresa',
    component: ConfigEmpresaPage,
  },
];
