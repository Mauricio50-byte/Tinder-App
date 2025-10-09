import { Injectable } from '@angular/core';
import { registerPlugin, Capacitor } from '@capacitor/core';
import { Mensaje } from '../shared/interfaces/message';
import { Chat } from '../core/services/chat';
import { Firebase } from '../core/providers/firebase';
import { environment } from '../../environments/environment';
import { ref, get, child, set } from 'firebase/database';

/**
 * Wrapper para el plugin de Mensajería.
 * Si existe implementación nativa (Java/Kotlin) registrada como 'Messaging',
 * se utilizará. En caso contrario, se usa el servicio Chat como fallback web.
 */
@Injectable({ providedIn: 'root' })
export class MessagingPlugin {
  private nativo?: any;

  constructor(private chat: Chat, private firebase: Firebase) {
    try {
      this.nativo = registerPlugin<any>('Messaging');
    } catch {
      this.nativo = undefined;
    }
  }

  async enviarMensaje(remitenteId: string, destinatarioId: string, texto: string): Promise<void> {
    // Intento nativo si no estamos en web y existe método
    if (Capacitor.getPlatform() !== 'web' && this.nativo?.enviarMensaje) {
      try {
        const current = this.firebase.obtenerAuth().currentUser;
        const idToken = await current?.getIdToken?.();
        const databaseURL = environment.firebase.databaseURL;
        if (idToken && databaseURL) {
          const [a, b] = [remitenteId, destinatarioId].sort();
          const convId = `${a}_${b}`;
          const base = ref(this.firebase.obtenerDB(), `mensajes/${convId}`);
          const metaRef = child(base, 'meta');
          const metaSnap = await get(metaRef);
          if (!metaSnap.exists()) {
            await set(metaRef, { a, b });
          }
          await this.nativo.enviarMensaje({ remitenteId, destinatarioId, texto, databaseURL, idToken });
          return;
        }
        return;
      } catch {
        // Fallback si falla
      }
    }
    // Fallback web
    await this.chat.enviarMensaje(remitenteId, destinatarioId, texto);
  }

  suscribirMensajes(uidA: string, uidB: string, callback: (mensaje: Mensaje) => void): () => void {
    // Preferencia por nativo si disponible
    if (Capacitor.getPlatform() !== 'web' && this.nativo?.suscribirMensajes) {
      try {
        const current = this.firebase.obtenerAuth().currentUser;
        const databaseURL = environment.firebase.databaseURL;
        const listener = this.nativo.addListener?.('mensaje', (m: Mensaje) => callback(m));
        current?.getIdToken()?.then(idToken => {
          if (idToken && databaseURL) {
            (async () => {
              const [a, b] = [uidA, uidB].sort();
              const convId = `${a}_${b}`;
              const base = ref(this.firebase.obtenerDB(), `mensajes/${convId}`);
              const metaRef = child(base, 'meta');
              const metaSnap = await get(metaRef);
              if (!metaSnap.exists()) {
                try { await set(metaRef, { a, b }); } catch {}
              }
            })();
            try { this.nativo.suscribirMensajes({ uidA, uidB, databaseURL, idToken }); } catch {}
          }
        });
        return () => {
          try { this.nativo.detenerSuscripcion({ uidA, uidB }); } catch {}
          try { listener?.remove?.(); } catch {}
        };
      } catch {
        // Continuar con fallback web
      }
    }
    return this.chat.suscribirMensajes(uidA, uidB, callback);
  }
}