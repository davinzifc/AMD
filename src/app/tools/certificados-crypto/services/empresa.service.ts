import { Injectable, signal } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';

export interface Empresa {
  id?: number;
  nombre: string;
  nit: string;
  imagen_path?: string;
  representante_nombre: string;
  representante_id: string;
}

export interface CreateEmpresaDto {
  nombre: string;
  nit: string;
  imagen_path?: string;
  representante_nombre: string;
  representante_id: string;
}

export interface UpdateEmpresaDto {
  nombre?: string;
  imagen_path?: string;
  representante_nombre?: string;
  representante_id?: string;
}

@Injectable({ providedIn: 'root' })
export class EmpresaService {
  private readonly _empresas = signal<Empresa[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly empresas = this._empresas.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  async loadEmpresas(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const result = await invoke<Empresa[]>('list_empresas');
      this._empresas.set(result);
    } catch (err) {
      this._error.set(String(err));
    } finally {
      this._loading.set(false);
    }
  }

  async createEmpresa(dto: CreateEmpresaDto): Promise<Empresa> {
    const result = await invoke<Empresa>('create_empresa', { empresa: dto });
    this._empresas.update((list) => [...list, result]);
    return result;
  }

  async getEmpresaByNit(nit: string): Promise<Empresa | null> {
    return invoke<Empresa | null>('get_empresa_by_nit', { nit });
  }

  async updateEmpresa(nit: string, dto: UpdateEmpresaDto): Promise<Empresa> {
    const result = await invoke<Empresa>('update_empresa', { nit, empresa: dto });
    this._empresas.update((list) =>
      list.map((e) => (e.nit === nit ? result : e))
    );
    return result;
  }
}
