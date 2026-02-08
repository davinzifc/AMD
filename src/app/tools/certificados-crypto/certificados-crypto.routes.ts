import { Routes } from '@angular/router';
import { CryptoMainPage } from './pages/main/main.page';
import { ConfigEmpresaPage } from './pages/config-empresa/config-empresa.page';
import { ConfigFirmantePage } from './pages/config-firmante/config-firmante.page';

export const CERTIFICADOS_CRYPTO_ROUTES: Routes = [
  {
    path: '',
    component: CryptoMainPage,
  },
  {
    path: 'config-empresa',
    component: ConfigEmpresaPage,
  },
  {
    path: 'config-firmante',
    component: ConfigFirmantePage,
  },
];
