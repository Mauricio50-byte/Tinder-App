import { Component } from '@angular/core';
import { Auth } from '../../core/services/auth';
import { Router } from '@angular/router';
import { Notification } from '../../core/providers/notification';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false,
})
export class RegisterPage {
  nombre = '';
  edad: number | null = null;
  correo = '';
  contrasena = '';
  cargando = false;

  constructor(private auth: Auth, private router: Router, private notification: Notification) {}

  async registrar(): Promise<void> {
    if (!this.nombre || !this.edad || !this.correo || !this.contrasena) {
      await this.notification.error('Completa todos los campos.');
      return;
    }
    this.cargando = true;
    try {
      await this.auth.registrarConCorreo(this.nombre, this.edad!, this.correo, this.contrasena);
      await this.notification.success('Registro exitoso');
      this.router.navigateByUrl('/login');
    } catch (e: any) {
      const mensaje = e?.message ?? 'Error al registrarse.';
      await this.notification.error(mensaje);
    } finally {
      this.cargando = false;
    }
  }

  async registrarConGoogle(): Promise<void> {
    this.cargando = true;
    try {
      await this.auth.iniciarSesionConGoogle();
      await this.notification.success('Registro exitoso');
      this.router.navigateByUrl('/login');
    } catch (e: any) {
      const mensaje = e?.message ?? 'Error con Google.';
      await this.notification.error(mensaje);
    } finally {
      this.cargando = false;
    }
  }

  irALogin(): void {
    this.router.navigateByUrl('/login');
  }
}
