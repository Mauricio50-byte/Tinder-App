import { Injectable } from '@angular/core';
import { registerPlugin, Capacitor } from '@capacitor/core';
import { Mensaje } from '../shared/interfaces/message';
import { Chat } from '../core/services/chat';

/**
 * Wrapper para el plugin de Mensajería.
 * Si existe implementación nativa (Java/Kotlin) registrada como 'Messaging',
 * se utilizará. En caso contrario, se usa el servicio Chat como fallback web.
 */
@Injectable({ providedIn: 'root' })
export class MessagingPlugin {
  private nativo?: any;

  constructor(private chat: Chat) {
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
        await this.nativo.enviarMensaje({ remitenteId, destinatarioId, texto });
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
        // Se asume que el plugin nativo expone una suscripción y devuelve una función de desuscripción
        return this.nativo.suscribirMensajes({ uidA, uidB }, callback);
      } catch {
        // Continuar con fallback web
      }
    }
    return this.chat.suscribirMensajes(uidA, uidB, callback);
  }
}