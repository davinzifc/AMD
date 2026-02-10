import { Injectable, signal } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { Empresa, CreateEmpresaDto, UpdateEmpresaDto } from '../models/empresa.model';

export type { Empresa, CreateEmpresaDto, UpdateEmpresaDto } from '../models/empresa.model';

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
    this._empresas.update((list) => {
      const withoutOld = list.filter((e) => e.nit !== nit);
      return [...withoutOld, result].sort((a, b) => a.nombre.localeCompare(b.nombre));
    });
    return result;
  }

  async deleteEmpresa(nit: string): Promise<void> {
    await invoke('delete_empresa', { nit });
    this._empresas.update((list) => list.filter((e) => e.nit !== nit));
  }

  /** Obtiene la imagen del logo de la empresa (base64 + mime) si existe. */
  async getEmpresaImagen(nit: string): Promise<{ imagenBase64: string; mime: string } | null> {
    const result = await invoke<{ imagen_base64: string; mime: string } | null>(
      'get_empresa_imagen',
      { nit }
    );
    if (!result) return null;
    return {
      imagenBase64: result.imagen_base64,
      mime: result.mime,
    };
  }

  /** Guarda la imagen del logo en disco y devuelve la ruta para guardar en la empresa. */
  async saveEmpresaImagen(
    nit: string,
    contentsBase64: string,
    mime: string
  ): Promise<string> {
    return invoke<string>('save_empresa_imagen', {
      nit,
      contentsBase64,
      mime,
    });
  }
}
