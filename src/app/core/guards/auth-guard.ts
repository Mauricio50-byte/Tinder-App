import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Firebase } from '../providers/firebase';

/**
 * Guard de autenticación: bloquea acceso si no hay usuario logueado.
 * Redirige a '/login' en caso de no haber sesión.
 */
export const authGuard: CanActivateFn = () => {
  const firebase = inject(Firebase);
  const router = inject(Router);
  const usuario = firebase.obtenerAuth().currentUser;
  if (!usuario) {
    router.navigateByUrl('/login');
    return false;
  }
  return true;
};
