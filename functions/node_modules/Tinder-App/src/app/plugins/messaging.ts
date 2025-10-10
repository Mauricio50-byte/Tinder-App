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
  // Ajuste: por estabilidad, preferir servicio web hasta validar nativo
  private readonly PREFERIR_NATIVO = true;

  constructor(private chat: Chat, private firebase: Firebase) {
    try {
      this.nativo = registerPlugin<any>('Messaging');
    } catch {
      this.nativo = undefined;
    }
  }

  async enviarMensaje(remitenteId: string, destinatarioId: string, texto: string): Promise<void> {
    // Intento nativo si no estamos en web y existe método
    if (this.PREFERIR_NATIVO && Capacitor.getPlatform() !== 'web' && this.nativo?.enviarMensaje) {
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
    if (this.PREFERIR_NATIVO && Capacitor.getPlatform() !== 'web' && this.nativo?.suscribirMensajes) {
      try {
        const current = this.firebase.obtenerAuth().currentUser;
        const databaseURL = environment.firebase.databaseURL;
        let recibioNativo = false;
        const listener = this.nativo.addListener?.('mensaje', (payload: any) => {
          recibioNativo = true;
          const m = this.mapMensaje(payload);
          if (!m) return;
          const esDeA = m.remitenteId === uidA && m.destinatarioId === uidB;
          const esDeB = m.remitenteId === uidB && m.destinatarioId === uidA;
          if (esDeA || esDeB) {
            callback(m);
          }
        });
        // Fallback a web si el nativo no emite pronto
        let webUnsub: (() => void) | undefined;
        const fallbackTimer = setTimeout(() => {
          if (!recibioNativo) {
            webUnsub = this.chat.suscribirMensajes(uidA, uidB, callback);
          }
        }, 1500);
        current?.getIdToken()?.then(idToken => {
          if (idToken && databaseURL) {
            const [a, b] = [uidA, uidB].sort();
            const convId = `${a}_${b}`;
            (async () => {
              const base = ref(this.firebase.obtenerDB(), `mensajes/${convId}`);
              const metaRef = child(base, 'meta');
              const metaSnap = await get(metaRef);
              if (!metaSnap.exists()) {
                try { await set(metaRef, { a, b }); } catch {}
              }
            })();
            try { this.nativo.suscribirMensajes({ uidA, uidB, convId, databaseURL, idToken }); } catch {}
          }
        });
        return () => {
          clearTimeout(fallbackTimer);
          try { this.nativo.detenerSuscripcion({ uidA, uidB }); } catch {}
          try { listener?.remove?.(); } catch {}
          try { this.nativo.removeAllListeners?.(); } catch {}
          try { webUnsub?.(); } catch {}
        };
      } catch {
        // Continuar con fallback web
      }
    }
    return this.chat.suscribirMensajes(uidA, uidB, callback);
  }

  async cargarMensajes(uidA: string, uidB: string, limite?: number): Promise<Mensaje[]> {
    // Forzar modo web en Android para estabilidad de tiempo real
    if (Capacitor.getPlatform() === 'android') {
      return await this.chat.listarMensajes(uidA, uidB, limite);
    }
    if (this.PREFERIR_NATIVO && Capacitor.getPlatform() !== 'web' && this.nativo?.cargarMensajes) {
      try {
        const current = this.firebase.obtenerAuth().currentUser;
        const idToken = await current?.getIdToken?.();
        const databaseURL = environment.firebase.databaseURL;
        const [a, b] = [uidA, uidB].sort();
        const convId = `${a}_${b}`;
        if (idToken && databaseURL) {
          const res = await this.nativo.cargarMensajes({ uidA, uidB, convId, databaseURL, idToken, limite });
          const arr = Array.isArray(res) ? res : res?.mensajes;
          const list = (arr || []).map((x: any) => this.mapMensaje(x)).filter(Boolean) as Mensaje[];
          return list.sort((m1, m2) => m1.timestamp - m2.timestamp);
        }
      } catch {
        // Fallback si falla el nativo
      }
    }
    return await this.chat.listarMensajes(uidA, uidB, limite);
  }

  private mapMensaje(raw: any): Mensaje | undefined {
    if (!raw) return undefined;
    const m = raw.mensaje ?? raw;
    const id = typeof m.id === 'string' ? m.id : '';
    const remitenteId = m.remitenteId ?? m.senderId ?? m.from;
    const destinatarioId = m.destinatarioId ?? m.receiverId ?? m.to;
    const texto = m.texto ?? m.text ?? m.body;
    const timestamp = m.timestamp ?? m.time ?? m.ts;
    if (typeof texto !== 'string' || typeof timestamp !== 'number') return undefined;
    return { id, remitenteId, destinatarioId, texto, timestamp } as Mensaje;
  }
}