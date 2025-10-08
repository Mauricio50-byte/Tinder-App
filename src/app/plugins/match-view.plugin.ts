import { registerPlugin } from '@capacitor/core';
import { Injectable } from '@angular/core';
import { Match } from '../core/services/match';
import { Usuario } from '../shared/interfaces/user';

@Injectable({ providedIn: 'root' })
export class MatchViewPlugin {
  private nativo?: any;

  constructor(private match: Match) {
    try {
      this.nativo = registerPlugin<any>('MatchView');
    } catch {
      this.nativo = undefined;
    }
  }

  async cargarSiguientePerfil(): Promise<Usuario | undefined> {
    if (this.nativo?.cargarSiguientePerfil) {
      try {
        const r = await this.nativo.cargarSiguientePerfil();
        return r?.usuario as Usuario;
      } catch {}
    }
    const lista = await this.match.listarPosiblesMatches();
    return lista[0];
  }

  async marcarAceptado(idUsuario: string): Promise<void> {
    if (this.nativo?.marcarAceptado) {
      try { await this.nativo.marcarAceptado({ idUsuario }); return; } catch {}
    }
    await this.match.aceptarUsuario(idUsuario);
  }

  async marcarRechazado(idUsuario: string): Promise<void> {
    if (this.nativo?.marcarRechazado) {
      try { await this.nativo.marcarRechazado({ idUsuario }); return; } catch {}
    }
    await this.match.rechazarUsuario(idUsuario);
  }
}