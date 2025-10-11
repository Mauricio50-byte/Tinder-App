import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ref, set, update, get, child } from 'firebase/database';

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
  comprimiendo = false;
  progreso = 0;
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
      const db = this.firebase.obtenerDB();
      const ruta = `usuarios/${uid}`;
      const snapshot = await get(child(ref(db), ruta));
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
        await set(ref(db, ruta), this.usuario);
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
    if (this.previewUrl) {
      try { URL.revokeObjectURL(this.previewUrl); } catch {}
    }
    this.previewUrl = undefined;
    this.fotoBlob = undefined;
    this.progreso = 0;
  }

  async guardarFoto(): Promise<void> {
    try {
      if (!this.fotoBlob) {
        await this.notification.error('Primero selecciona o toma una foto');
        return;
      }
      const current = this.firebase.obtenerAuth().currentUser;
      if (!current) return;
      // Comprimir antes de subir
      this.comprimiendo = true;
      let blobOptimizado: Blob;
      try {
        blobOptimizado = await this.comprimirImagen(this.fotoBlob);
      } finally {
        this.comprimiendo = false;
      }
      this.subiendo = true;
      const dataUrl = await this.blobToDataURL(blobOptimizado);
      const db = this.firebase.obtenerDB();
      const ruta = `usuarios/${current.uid}`;
      await update(ref(db, ruta), { fotoBase64: dataUrl });
      if (this.usuario) this.usuario.fotoBase64 = dataUrl;
      this.progreso = 1;
      this.cancelarPreview();
      await this.notification.success('Foto de perfil actualizada');
    } catch (e: any) {
      await this.notification.error(e?.message ?? 'No se pudo actualizar la foto');
    } finally {
      this.subiendo = false;
      this.progreso = 0;
    }
  }

  private async comprimirImagen(blob: Blob, maxDim = 1024, calidad = 0.7): Promise<Blob> {
    // Si ya es muy pequeña, retorna igual
    if (blob.size < 150 * 1024) return blob;
    const img = await this.cargarImagenDesdeBlob(blob);
    const { width, height } = img;
    const ratio = Math.min(1, maxDim / Math.max(width, height));
    const targetW = Math.round(width * ratio);
    const targetH = Math.round(height * ratio);
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return blob;
    ctx.drawImage(img, 0, 0, targetW, targetH);
    const tipo = 'image/jpeg';
    const blobResult: Blob | null = await new Promise(resolve => canvas.toBlob(b => resolve(b), tipo, calidad));
    return blobResult ?? blob;
  }

  private async cargarImagenDesdeBlob(blob: Blob): Promise<HTMLImageElement> {
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.src = url;
      await new Promise((res, rej) => {
        img.onload = () => res(undefined);
        img.onerror = (e) => rej(e);
      });
      return img;
    } finally {
      try { URL.revokeObjectURL(url); } catch {}
    }
  }

  private async blobToDataURL(blob: Blob): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(blob);
    });
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
      const db = this.firebase.obtenerDB();
      const ruta = `usuarios/${current.uid}`;
      const cambios: Partial<Usuario> = { nombre, edad, bio };
      await update(ref(db, ruta), cambios);
      const snapshot = await get(child(ref(db), ruta));
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
