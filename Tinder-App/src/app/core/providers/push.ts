import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Firebase } from './firebase';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';
import { ref, update } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';

@Injectable({ providedIn: 'root' })
export class PushService {
  private initialized = false;
  private lastToken?: string;

  constructor(private firebase: Firebase, private router: Router) {}

  async init(): Promise<void> {
    if (this.initialized) return;
    if (Capacitor.getPlatform() === 'web') return;
    try {
      // Asegurar canal Android para FCM ('mensajes')
      await this.ensureAndroidChannel();

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
        // Persistir token incluso si el usuario inicia sesión después
        this.lastToken = token.value;
        this.guardarTokenSiSesion(token.value);
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error', error);
      });

      PushNotifications.addListener('pushNotificationReceived', async (notification: PushNotificationSchema) => {
        // En primer plano, mostrar notificación local con título y cuerpo
        try {
          const title = (notification as any)?.title || 'Nuevo mensaje';
          const body = (notification as any)?.body || (typeof notification?.data?.texto === 'string' ? String(notification.data.texto) : 'Tienes un nuevo mensaje');
          await LocalNotifications.schedule({
            notifications: [
              {
                id: Date.now() % 2147483647,
                title,
                body,
                smallIcon: 'ic_stat_name',
                extra: {},
              },
            ],
          });
        } catch {}
        this.handleDeepLink(notification);
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        this.handleDeepLink(action.notification);
      });

      // Si el usuario inicia sesión después del registro de push, guardar el token
      try {
        const auth = this.firebase.obtenerAuth();
        onAuthStateChanged(auth, (user) => {
          if (user && this.lastToken) {
            try {
              const db = this.firebase.obtenerDB();
              update(ref(db, `usuarios/${user.uid}`), { pushToken: this.lastToken });
            } catch (e) {
              console.error('Error guardando push token tras login', e);
            }
          }
        });
      } catch (e) {
        console.error('Auth state subscribe failed', e);
      }

      this.initialized = true;
    } catch (e) {
      console.error('Push init failed', e);
    }
  }

  private guardarTokenSiSesion(token: string): void {
    const current = this.firebase.obtenerAuth().currentUser;
    if (!current) return;
    try {
      const db = this.firebase.obtenerDB();
      update(ref(db, `usuarios/${current.uid}`), { pushToken: token });
    } catch (e) {
      console.error('Error guardando push token', e);
    }
  }

  private async ensureAndroidChannel(): Promise<void> {
    if (Capacitor.getPlatform() !== 'android') return;
    try {
      await LocalNotifications.createChannel({
        id: 'mensajes',
        name: 'Mensajes',
        description: 'Notificaciones de nuevos mensajes',
        importance: 5, // HIGH
        visibility: 1, // PUBLIC
        lights: true,
        vibration: true,
      });
    } catch (e) {
      // No bloquear inicio si falla la creación del canal
      console.warn('No se pudo crear el canal de notificaciones', e);
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