import { registerPlugin } from '@capacitor/core';
import { Injectable } from '@angular/core';
import { Match } from '../core/services/match';
import { Usuario } from '../shared/interfaces/user';
import { Firebase } from '../core/providers/firebase';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MatchViewPlugin {
  private nativo?: any;

  constructor(private match: Match, private firebase: Firebase) {
    try {
      this.nativo = registerPlugin<any>('MatchView');
    } catch {
      this.nativo = undefined;
    }
  }

  async cargarSiguientePerfil(): Promise<Usuario | undefined> {
    if (this.nativo?.cargarSiguientePerfil) {
      try {
        const current = this.firebase.obtenerAuth().currentUser;
        const idToken = await current?.getIdToken?.();
        const uidActual = current?.uid;
        const databaseURL = environment.firebase.databaseURL;
        if (idToken && uidActual && databaseURL) {
          const r = await this.nativo.cargarSiguientePerfil({ uidActual, databaseURL, idToken });
          return r?.usuario as Usuario;
        }
      } catch {}
    }
    const lista = await this.match.listarPosiblesMatches();
    return lista[0];
  }

  async marcarAceptado(idUsuario: string): Promise<void> {
    if (this.nativo?.marcarAceptado) {
      try {
        const current = this.firebase.obtenerAuth().currentUser;
        const idToken = await current?.getIdToken?.();
        const uidActual = current?.uid;
        const databaseURL = environment.firebase.databaseURL;
        if (idToken && uidActual && databaseURL) {
          await this.nativo.marcarAceptado({ idUsuario, uidActual, databaseURL, idToken });
          return;
        }
      } catch {}
    }
    await this.match.aceptarUsuario(idUsuario);
  }

  async marcarRechazado(idUsuario: string): Promise<void> {
    if (this.nativo?.marcarRechazado) {
      try {
        const current = this.firebase.obtenerAuth().currentUser;
        const idToken = await current?.getIdToken?.();
        const uidActual = current?.uid;
        const databaseURL = environment.firebase.databaseURL;
        if (idToken && uidActual && databaseURL) {
          await this.nativo.marcarRechazado({ idUsuario, uidActual, databaseURL, idToken });
          return;
        }
      } catch {}
    }
    await this.match.rechazarUsuario(idUsuario);
  }
}