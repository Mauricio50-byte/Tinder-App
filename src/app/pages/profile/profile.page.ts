import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ref, get, child, update } from 'firebase/database';

import { Firebase } from '../../core/providers/firebase';
import { Notification } from '../../core/providers/notification';
import { Storage } from '../../core/providers/storage';
import { CameraPlugin } from '../../plugins/camera';
import { FilePickerPlugin } from '../../plugins/file-picker';
import { Usuario } from '../../shared/interfaces/user';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false
})
export class ProfilePage implements OnInit {
  usuario?: Usuario;
  cargando = false;
  subiendo = false;
  previewUrl?: string;
  private fotoBlob?: Blob;
  // Estado del formulario (sin mutar directamente this.usuario)
  formNombre = '';
  formEdad: number | null = null;
  formBio = '';

  constructor(
    private firebase: Firebase,
    private notification: Notification,
    private storage: Storage,
    private camera: CameraPlugin,
    private filePicker: FilePickerPlugin,
    private router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.cargarUsuario();
  }

  private async cargarUsuario(): Promise<void> {
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
        this.usuario = {
          id: uid,
          nombre: current.displayName ?? '',
          edad: 0,
          email: current.email ?? '',
          fotoUrl: current.photoURL ?? ''
        };
        await update(ref(this.firebase.obtenerDB(), ruta), this.usuario);
      }
      this.sincronizarFormulario();
    } catch (e: any) {
      await this.notification.error(e?.message ?? 'No se pudo cargar el perfil');
    } finally {
      this.cargando = false;
    }
  }

  private sincronizarFormulario(): void {
    this.formNombre = this.usuario?.nombre ?? '';
    this.formEdad = typeof this.usuario?.edad === 'number' ? this.usuario!.edad : null;
    this.formBio = this.usuario?.bio ?? '';
  }

  async tomarFoto(): Promise<void> {
    try {
      this.fotoBlob = await this.camera.tomarFoto();
      this.previewUrl = URL.createObjectURL(this.fotoBlob);
    } catch (e: any) {
      await this.notification.error(e?.message ?? 'No se pudo tomar la foto');
    }
  }

  async seleccionarFoto(): Promise<void> {
    try {
      // Preferir plugin nativo Java si está disponible; fallback al wrapper de cámara
      try {
        this.fotoBlob = await this.filePicker.pickImage();
      } catch {
        this.fotoBlob = await this.camera.seleccionarDeGaleria();
      }
      this.previewUrl = URL.createObjectURL(this.fotoBlob);
    } catch (e: any) {
      await this.notification.error(e?.message ?? 'No se pudo seleccionar la foto');
    }
  }

  cancelarPreview(): void {
    this.previewUrl = undefined;
    this.fotoBlob = undefined;
  }

  async guardarFoto(): Promise<void> {
    try {
      if (!this.fotoBlob) {
        await this.notification.error('Primero selecciona o toma una foto');
        return;
      }
      const current = this.firebase.obtenerAuth().currentUser;
      if (!current) return;
      this.subiendo = true;
      const url = await this.storage.subirFotoPerfil(current.uid, this.fotoBlob);
      await update(ref(this.firebase.obtenerDB(), `usuarios/${current.uid}`), { fotoUrl: url });
      if (this.usuario) this.usuario.fotoUrl = url;
      this.cancelarPreview();
      await this.notification.success('Foto de perfil actualizada');
    } catch (e: any) {
      await this.notification.error(e?.message ?? 'No se pudo actualizar la foto');
    } finally {
      this.subiendo = false;
    }
  }

  async guardarInfo(): Promise<void> {
    try {
      const current = this.firebase.obtenerAuth().currentUser;
      if (!current) return;

      // Validaciones básicas
      const nombre = (this.formNombre || '').trim();
      // Forzar número entero no negativo
      const edad = Number.isFinite(Number(this.formEdad)) ? Math.max(0, Math.floor(Number(this.formEdad))) : 0;
      const bio = (this.formBio || '').trim();
      if (!nombre) {
        await this.notification.error('El nombre es obligatorio');
        return;
      }
      if (isNaN(edad) || edad < 0) {
        await this.notification.error('La edad debe ser un número válido');
        return;
      }

      this.cargando = true;
      const cambios: Partial<Usuario> = { nombre, edad, bio };
      await update(ref(this.firebase.obtenerDB(), `usuarios/${current.uid}`), cambios);
      // Releer desde la BD para asegurar sincronización y confirmar actualización
      const snapshot = await get(child(ref(this.firebase.obtenerDB()), `usuarios/${current.uid}`));
      if (snapshot.exists()) {
        this.usuario = snapshot.val() as Usuario;
        this.sincronizarFormulario();
      } else if (this.usuario) {
        this.usuario.nombre = nombre;
        this.usuario.edad = edad;
        this.usuario.bio = bio;
      }
      await this.notification.success('Información actualizada');
    } catch (e: any) {
      await this.notification.error(e?.message ?? 'No se pudo guardar los cambios');
    } finally {
      this.cargando = false;
    }
  }
}
