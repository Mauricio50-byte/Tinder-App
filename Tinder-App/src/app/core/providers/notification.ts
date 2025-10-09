import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';

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
}
