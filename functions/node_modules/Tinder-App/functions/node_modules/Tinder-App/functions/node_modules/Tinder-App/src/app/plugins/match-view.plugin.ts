import { registerPlugin } from '@capacitor/core';
import { Injectable } from '@angular/core';
import { Match } from '../core/services/match';
import { Usuario } from '../shared/interfaces/user';
import { Firebase } from '../core/providers/firebase';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MatchViewPlugin {
  private nativo?: any;
  private cache: Usuario[] = [];
  private indice = 0;

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
    // Fallback web: devolver siguiente perfil distinto en cada llamada
    if (!this.cache.length || this.indice >= this.cache.length) {
      const lista = await this.match.listarPosiblesMatches();
      this.cache = this.shuffle(lista);
      this.indice = 0;
    }
    return this.cache[this.indice++];
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

  private shuffle(arr: Usuario[]): Usuario[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}