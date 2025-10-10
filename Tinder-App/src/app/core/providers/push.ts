import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Firebase } from './firebase';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';
import { ref, update } from 'firebase/database';

@Injectable({ providedIn: 'root' })
export class PushService {
  private initialized = false;

  constructor(private firebase: Firebase, private router: Router) {}

  async init(): Promise<void> {
    if (this.initialized) return;
    if (Capacitor.getPlatform() === 'web') return;
    try {
      const perm = await PushNotifications.requestPermissions();
      if (perm.receive !== 'granted') return;

      // Si el flag está desactivado, no registramos FCM pero ya pedimos permisos
      if (!environment.enablePush) {
        console.warn('Push disabled by environment flag (permissions granted)');
        this.initialized = true;
        return;
      }

      await PushNotifications.register();

      PushNotifications.addListener('registration', (token: Token) => {
        // Guardar token para el usuario autenticado
        const current = this.firebase.obtenerAuth().currentUser;
        if (current) {
          try {
            const db = this.firebase.obtenerDB();
            update(ref(db, `usuarios/${current.uid}`), { pushToken: token.value });
          } catch (e) {
            console.error('Error guardando push token', e);
          }
        }
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error', error);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        this.handleDeepLink(notification);
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        this.handleDeepLink(action.notification);
      });

      this.initialized = true;
    } catch (e) {
      console.error('Push init failed', e);
    }
  }

  private handleDeepLink(notification: PushNotificationSchema): void {
    try {
      const data: any = notification?.data || {};
      const current = this.firebase.obtenerAuth().currentUser;
      const uidActual = current?.uid;
      let uidDestino: string | undefined = data?.uid || data?.usuarioId || data?.destinatarioId;

      // Si viene convId del tipo a_b, deducir el otro
      if (!uidDestino && typeof data?.convId === 'string' && uidActual) {
        const [a, b] = data.convId.split('_');
        uidDestino = a === uidActual ? b : b === uidActual ? a : undefined;
      }

      // Si viene uidA y uidB
      if (!uidDestino && uidActual && data?.uidA && data?.uidB) {
        const a = String(data.uidA);
        const b = String(data.uidB);
        uidDestino = a === uidActual ? b : b === uidActual ? a : undefined;
      }

      if (uidDestino) {
        this.router.navigate(['/chat'], { queryParams: { uid: uidDestino } });
      }
    } catch (e) {
      console.error('Deep link handling failed', e);
    }
  }
}