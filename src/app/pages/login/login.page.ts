import { Component } from '@angular/core';
import { Auth } from '../../core/services/auth';
import { Router } from '@angular/router';
import { Notification } from '../../core/providers/notification';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage {
  correo = '';
  contrasena = '';
  cargando = false;

  constructor(private auth: Auth, private router: Router, private notification: Notification) {}

  async iniciarSesion(): Promise<void> {
    if (!this.correo || !this.contrasena) {
      await this.notification.error('Ingresa correo y contraseña.');
      return;
    }
    this.cargando = true;
    try {
      await this.auth.iniciarSesionConCorreo(this.correo, this.contrasena);
      await this.notification.success('Inicio de sesión exitoso');
      this.router.navigateByUrl('/home');
    } catch (e: any) {
      const mensaje = e?.message ?? 'Error al iniciar sesión.';
      await this.notification.error(mensaje);
    } finally {
      this.cargando = false;
    }
  }

  async iniciarSesionConGoogle(): Promise<void> {
    this.cargando = true;
    try {
      await this.auth.iniciarSesionConGoogle();
      await this.notification.success('Inicio de sesión exitoso');
      this.router.navigateByUrl('/home');
    } catch (e: any) {
      const mensaje = e?.message ?? 'Error con Google.';
      await this.notification.error(mensaje);
    } finally {
      this.cargando = false;
    }
  }
}
