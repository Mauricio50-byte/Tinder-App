export interface Usuario {
  id: string;
  nombre: string;
  edad: number;
  email: string;
  bio?: string;
  fotoUrl?: string;
}

export type User = Usuario;
