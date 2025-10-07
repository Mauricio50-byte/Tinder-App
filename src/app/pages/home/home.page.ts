import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ref, get, child } from 'firebase/database';
import { Firebase } from '../../core/providers/firebase';
import { Notification } from '../../core/providers/notification';
import { Auth } from '../../core/services/auth';
import { Usuario } from '../../shared/interfaces/user';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  usuario: Usuario | null = null;
  cargando = false;

  constructor(
    private router: Router,
    private firebase: Firebase,
    private notification: Notification,
    private auth: Auth,
  ) { }

  async ngOnInit(): Promise<void> {
    await this.cargarUsuario();
  }

  async cargarUsuario(): Promise<void> {
    try {
      this.cargando = true;
      const current = this.firebase.obtenerAuth().currentUser;
      if (!current) {
        await this.notification.error('Sesión no encontrada. Inicia sesión.');
        this.router.navigateByUrl('/login');
        return;
      }
      const uid = current.uid;
      const ruta = `usuarios/${uid}`;
      const snapshot = await get(child(ref(this.firebase.obtenerDB()), ruta));
      if (snapshot.exists()) {
        this.usuario = snapshot.val() as Usuario;
      } else {
        // Fallback mínimo si el perfil aún no existe
        this.usuario = {
          id: uid,
          nombre: current.displayName ?? '',
          edad: 0,
          email: current.email ?? '',
          fotoUrl: current.photoURL ?? ''
        };
      }
    } catch (e: any) {
      const mensaje = e?.message ?? 'No se pudo cargar el usuario.';
      await this.notification.error(mensaje);
    } finally {
      this.cargando = false;
    }
  }

  async refrescar(event: any): Promise<void> {
    await this.cargarUsuario();
    event?.target?.complete?.();
  }

  irAMatches(): void {
    this.router.navigateByUrl('/matches');
  }

  irAChat(): void {
    this.router.navigateByUrl('/chat');
  }

  irAPerfil(): void {
    this.router.navigateByUrl('/profile');
  }

  async cerrarSesion(): Promise<void> {
    await this.auth.cerrarSesion();
    await this.notification.success('Sesión cerrada');
    this.router.navigateByUrl('/login');
  }

  async refrescarHeader(): Promise<void> {
    if (this.cargando) return;
    await this.cargarUsuario();
  }

}
