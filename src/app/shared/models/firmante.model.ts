export interface Firmante {
  id?: number;
  nombre: string;
  cc_id: string;
  firma_imagen?: number[];
  firma_mime?: string;
}

export interface FirmanteListItem {
  id: number;
  nombre: string;
  cc_id: string;
  has_firma: boolean;
}

export interface CreateFirmanteDto {
  nombre: string;
  cc_id: string;
  firma_imagen?: number[];
  firma_mime?: string;
}

export interface UpdateFirmanteDto {
  nombre?: string;
  cc_id?: string;
  firma_imagen?: number[];
  firma_mime?: string;
}
