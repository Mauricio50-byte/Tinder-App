import { Component } from '@angular/core';
import { Auth } from '../../core/services/auth';
import { Router } from '@angular/router';

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
  mensajeError = '';

  constructor(private auth: Auth, private router: Router) {}

  async registrar(): Promise<void> {
    this.mensajeError = '';
    if (!this.nombre || !this.edad || !this.correo || !this.contrasena) {
      this.mensajeError = 'Completa todos los campos.';
      return;
    }
    this.cargando = true;
    try {
      await this.auth.registrarConCorreo(this.nombre, this.edad!, this.correo, this.contrasena);
      this.router.navigateByUrl('/home');
    } catch (e: any) {
      this.mensajeError = e?.message ?? 'Error al registrarse.';
    } finally {
      this.cargando = false;
    }
  }

  async registrarConGoogle(): Promise<void> {
    this.mensajeError = '';
    this.cargando = true;
    try {
      await this.auth.iniciarSesionConGoogle();
      this.router.navigateByUrl('/home');
    } catch (e: any) {
      this.mensajeError = e?.message ?? 'Error con Google.';
    } finally {
      this.cargando = false;
    }
  }
}
