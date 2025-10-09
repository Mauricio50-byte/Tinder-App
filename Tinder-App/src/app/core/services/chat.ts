import { Injectable } from '@angular/core';
import { Firebase } from '../providers/firebase';
import { Mensaje } from '../../shared/interfaces/message';
import { ref, push, onChildAdded, off, child, get, set } from 'firebase/database';

@Injectable({ providedIn: 'root' })
export class Chat {
  constructor(private firebase: Firebase) {}

  idConversacion(uid1: string, uid2: string): string {
    const [a, b] = [uid1, uid2].sort();
    return `${a}_${b}`;
  }

  async enviarMensaje(uidRemitente: string, uidDestinatario: string, texto: string): Promise<void> {
    const convId = this.idConversacion(uidRemitente, uidDestinatario);
    const base = ref(this.firebase.obtenerDB(), `mensajes/${convId}`);
    // Asegurar metadatos de conversación (participantes) para reglas
    try {
      const metaRef = child(base, 'meta');
      const [a, b] = [uidRemitente, uidDestinatario].sort();
      const metaSnap = await get(metaRef);
      if (!metaSnap.exists()) {
        await set(metaRef, { a, b });
      }
    } catch {}
    const mensaje: Mensaje = {
      id: '',
      remitenteId: uidRemitente,
      destinatarioId: uidDestinatario,
      texto,
      timestamp: Date.now(),
    };
    await push(base, mensaje);
  }

  suscribirMensajes(uidA: string, uidB: string, onMensaje: (m: Mensaje) => void): () => void {
    const convId = this.idConversacion(uidA, uidB);
    const base = ref(this.firebase.obtenerDB(), `mensajes/${convId}`);
    const callback = (snap: any) => {
      const m = snap.val() as Mensaje;
      if (m && m.texto) onMensaje(m);
    };
    // Suscribir sólo después de garantizar meta para evitar PERMISSION_DENIED
    let unsubscribe: () => void = () => {};
    (async () => {
      try {
        const metaRef = child(base, 'meta');
        const [a, b] = [uidA, uidB].sort();
        const metaSnap = await get(metaRef);
        if (!metaSnap.exists()) {
          await set(metaRef, { a, b });
        }
      } catch {}
      onChildAdded(base, callback);
      unsubscribe = () => off(base, 'child_added', callback as any);
    })();
    return () => unsubscribe();
  }
}
