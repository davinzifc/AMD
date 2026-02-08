import { Injectable, signal } from '@angular/core';

export interface UserConfig {
  nombre: string;
  cedula: string;
  firma_path: string | null;
}

const STORAGE_KEY = 'amd_user_config';

const DEFAULT_CONFIG: UserConfig = {
  nombre: '',
  cedula: '',
  firma_path: null,
};

@Injectable({ providedIn: 'root' })
export class UserConfigService {
  private readonly _config = signal<UserConfig>(DEFAULT_CONFIG);
  readonly config = this._config.asReadonly();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this._config.set(JSON.parse(stored));
      }
    } catch {
      // Ignore parse errors
    }
  }

  updateConfig(config: Partial<UserConfig>) {
    const updated = { ...this._config(), ...config };
    this._config.set(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  isConfigured(): boolean {
    const c = this._config();
    return c.nombre.trim().length > 0 && c.cedula.trim().length > 0;
  }
}
