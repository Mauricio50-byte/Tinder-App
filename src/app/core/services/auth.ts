import { Injectable } from '@angular/core';
import { Firebase } from '../providers/firebase';
import { Usuario } from '../../shared/interfaces/user';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, signInWithPopup, UserCredential } from 'firebase/auth';
import { ref, set, update, get, child } from 'firebase/database';

@Injectable({
  providedIn: 'root'
})
export class Auth {
  constructor(private firebase: Firebase) {}

  async registrarConCorreo(nombre: string, edad: number, correo: string, contrasena: string): Promise<Usuario> {
    const cred: UserCredential = await createUserWithEmailAndPassword(this.firebase.obtenerAuth(), correo, contrasena);
    const usuario: Usuario = {
      id: cred.user.uid,
      nombre,
      edad,
      email: correo,
      bio: '',
      fotoUrl: cred.user.photoURL ?? ''
    };
    await set(ref(this.firebase.obtenerDB(), `usuarios/${cred.user.uid}`), usuario);
    return usuario;
  }

  async iniciarSesionConCorreo(correo: string, contrasena: string): Promise<Usuario> {
    const cred = await signInWithEmailAndPassword(this.firebase.obtenerAuth(), correo, contrasena);
    const datos = await get(child(ref(this.firebase.obtenerDB()), `usuarios/${cred.user.uid}`));
    if (datos.exists()) {
      return datos.val() as Usuario;
    }
    // Si no existe perfil, lo creamos mínimo
    const usuario: Usuario = {
      id: cred.user.uid,
      nombre: cred.user.displayName ?? '',
      edad: 0,
      email: cred.user.email ?? correo,
      fotoUrl: cred.user.photoURL ?? ''
    };
    await set(ref(this.firebase.obtenerDB(), `usuarios/${cred.user.uid}`), usuario);
    return usuario;
  }

  async iniciarSesionConGoogle(): Promise<Usuario> {
    const cred = await signInWithPopup(this.firebase.obtenerAuth(), this.firebase.obtenerProveedorGoogle());
    const uid = cred.user.uid;
    const correo = cred.user.email ?? '';
    const ruta = `usuarios/${uid}`;
    const snapshot = await get(child(ref(this.firebase.obtenerDB()), ruta));
    const usuario: Usuario = {
      id: uid,
      nombre: cred.user.displayName ?? '',
      edad: 0,
      email: correo,
      fotoUrl: cred.user.photoURL ?? ''
    };
    if (snapshot.exists()) {
      await update(ref(this.firebase.obtenerDB(), ruta), usuario);
    } else {
      await set(ref(this.firebase.obtenerDB(), ruta), usuario);
    }
    return usuario;
  }

  async cerrarSesion(): Promise<void> {
    await signOut(this.firebase.obtenerAuth());
  }
}
