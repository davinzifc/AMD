export interface Empresa {
  id?: number;
  nombre: string;
  nit: string;
  imagen_path?: string;
  representante_nombre: string;
  representante_id: string;
  tipo_documento: string;
  genero_representante: string;
}

export interface CreateEmpresaDto {
  nombre: string;
  nit: string;
  imagen_path?: string;
  representante_nombre: string;
  representante_id: string;
  tipo_documento: string;
  genero_representante: string;
}

export interface UpdateEmpresaDto {
  nombre?: string;
  nit?: string;
  imagen_path?: string;
  representante_nombre?: string;
  representante_id?: string;
  tipo_documento?: string;
  genero_representante?: string;
}
