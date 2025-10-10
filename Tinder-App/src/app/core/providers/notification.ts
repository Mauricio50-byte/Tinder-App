import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

@Injectable({ providedIn: 'root' })
export class Notification {
  constructor(private toastController: ToastController) {}

  async show(message: string, color: 'success' | 'danger' | 'primary' | 'medium' = 'primary'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      color,
      position: 'top',
    });
    await toast.present();
  }

  async success(message: string): Promise<void> {
    await this.show(message, 'success');
  }

  async error(message: string): Promise<void> {
    await this.show(message, 'danger');
  }

  async requestLocalPermission(): Promise<boolean> {
    if (Capacitor.getPlatform() === 'web') return false;
    try {
      const { display } = await LocalNotifications.requestPermissions();
      return display === 'granted';
    } catch {
      return false;
    }
  }

  async scheduleLocal(title: string, body: string): Promise<void> {
    if (Capacitor.getPlatform() === 'web') return;
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Date.now() % 2147483647,
            title,
            body,
            smallIcon: 'ic_stat_name',
            sound: undefined,
            extra: {},
          },
        ],
      });
    } catch {}
  }
}
