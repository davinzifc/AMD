import { Injectable, signal } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import {
  FirmanteListItem,
  CreateFirmanteDto,
  UpdateFirmanteDto,
  Firmante,
} from '../models/firmante.model';

export type { Firmante, FirmanteListItem, CreateFirmanteDto, UpdateFirmanteDto } from '../models/firmante.model';

@Injectable({ providedIn: 'root' })
export class FirmanteService {
  private readonly _firmantes = signal<FirmanteListItem[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly firmantes = this._firmantes.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  async loadFirmantes(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const result = await invoke<FirmanteListItem[]>('list_firmantes');
      this._firmantes.set(result);
    } catch (err) {
      this._error.set(String(err));
    } finally {
      this._loading.set(false);
    }
  }

  async createFirmante(dto: CreateFirmanteDto): Promise<Firmante> {
    const result = await invoke<Firmante>('create_firmante', { firmante: dto });
    await this.loadFirmantes();
    return result;
  }

  async getFirmante(id: number): Promise<Firmante | null> {
    return invoke<Firmante | null>('get_firmante', { id });
  }

  async updateFirmante(id: number, dto: UpdateFirmanteDto): Promise<Firmante> {
    const result = await invoke<Firmante>('update_firmante', { id, firmante: dto });
    await this.loadFirmantes();
    return result;
  }

  async deleteFirmante(id: number): Promise<void> {
    await invoke('delete_firmante', { id });
    await this.loadFirmantes();
  }

  async getFirmanteByCcId(ccId: string): Promise<FirmanteListItem | null> {
    return invoke<FirmanteListItem | null>('get_firmante_by_cc_id', { ccId });
  }

  async getFirmaImagen(id: number): Promise<{ imagen: number[]; mime: string } | null> {
    return invoke<{ imagen: number[]; mime: string } | null>('get_firma_imagen', { id });
  }

  /** Convert a File to the number[] + mime format expected by Tauri */
  static async fileToImageData(file: File): Promise<{ firma_imagen: number[]; firma_mime: string }> {
    const buffer = await file.arrayBuffer();
    const bytes = Array.from(new Uint8Array(buffer));
    return { firma_imagen: bytes, firma_mime: file.type };
  }

  /** Convert number[] + mime to a data URI for <img> src */
  static imageBytesToDataUri(bytes: number[], mime: string): string {
    const uint8 = new Uint8Array(bytes);
    let binary = '';
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const base64 = btoa(binary);
    return `data:${mime};base64,${base64}`;
  }
}
