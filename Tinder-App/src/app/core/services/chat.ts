import { Injectable } from '@angular/core';
import { Firebase } from '../providers/firebase';
import { Mensaje } from '../../shared/interfaces/message';
import { ref, push, onChildAdded, off } from 'firebase/database';

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
    onChildAdded(base, callback);
    return () => off(base, 'child_added', callback as any);
  }
}
