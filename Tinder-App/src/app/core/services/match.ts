import { Injectable } from '@angular/core';
import { Firebase } from '../providers/firebase';
import { Notification } from '../providers/notification';
import { Usuario } from '../../shared/interfaces/user';
import { ref, get, child, set } from 'firebase/database';

@Injectable({ providedIn: 'root' })
export class Match {
  constructor(private firebase: Firebase, private notification: Notification) {}

  private obtenerUID(): string | undefined {
    return this.firebase.obtenerAuth().currentUser?.uid ?? undefined;
  }

  async listarPosiblesMatches(): Promise<Usuario[]> {
    const uid = this.obtenerUID();
    if (!uid) return [];
    const db = this.firebase.obtenerDB();
    const usuariosSnap = await get(child(ref(db), 'usuarios'));
    if (!usuariosSnap.exists()) return [];
    const todos: Record<string, Usuario> = usuariosSnap.val();

    // Excluir usuarios ya vistos (like o pass) y coincidencias previas
    const [likesSnap, passesSnap, matchesSnap] = await Promise.all([
      get(child(ref(db), `likes/${uid}`)).catch(() => undefined as any),
      get(child(ref(db), `passes/${uid}`)).catch(() => undefined as any),
      get(child(ref(db), `matches/${uid}`)).catch(() => undefined as any),
    ]);
    const yaVistos = new Set<string>();
    if (likesSnap?.exists()) Object.keys(likesSnap.val() || {}).forEach(k => yaVistos.add(k));
    if (passesSnap?.exists()) Object.keys(passesSnap.val() || {}).forEach(k => yaVistos.add(k));
    if (matchesSnap?.exists()) Object.keys(matchesSnap.val() || {}).forEach(k => yaVistos.add(k));

    const lista = Object.values(todos)
      .filter(u => u.id !== uid)
      .filter(u => !yaVistos.has(u.id));
    return lista;
  }

  async aceptarUsuario(idUsuario: string): Promise<void> {
    const uid = this.obtenerUID();
    if (!uid) return;
    const db = this.firebase.obtenerDB();
    const ahora = Date.now();
    // Registrar like del usuario actual
    await set(ref(db, `likes/${uid}/${idUsuario}`), { timestamp: ahora });

    // Comprobar si el otro usuario ya dio like al actual
    const likeMutuoSnap = await get(child(ref(db), `likes/${idUsuario}/${uid}`));
    if (likeMutuoSnap.exists()) {
      const datosMatch = { estado: 'mutuo', timestamp: ahora };
      await Promise.all([
        set(ref(db, `matches/${uid}/${idUsuario}`), datosMatch),
        set(ref(db, `matches/${idUsuario}/${uid}`), datosMatch),
      ]);
      // Notificación de Match
      let nombre = 'Tu match';
      try {
        const uSnap = await get(child(ref(db), `usuarios/${idUsuario}`));
        if (uSnap.exists()) {
          const u = uSnap.val() as Usuario;
          if (u?.nombre) nombre = u.nombre;
        }
      } catch {}
      await this.notification.success(`¡Es un match con ${nombre}!`);
      return;
    }

    // Si no hay reciprocidad todavía, dejar estado pendiente para referencia
    await set(ref(db, `matches/${uid}/${idUsuario}`), { estado: 'pendiente', timestamp: ahora });
    await this.notification.success('Has dado like');
  }

  async rechazarUsuario(idUsuario: string): Promise<void> {
    const uid = this.obtenerUID();
    if (!uid) return;
    const db = this.firebase.obtenerDB();
    const ahora = Date.now();
    await set(ref(db, `passes/${uid}/${idUsuario}`), { timestamp: ahora });
    await set(ref(db, `matches/${uid}/${idUsuario}`), { estado: 'rechazado', timestamp: ahora });
    await this.notification.success('Has rechazado el usuario');
  }

  async listarMatchesDelUsuario(uid?: string): Promise<string[]> {
    const actual = uid ?? this.obtenerUID();
    if (!actual) return [];
    const db = this.firebase.obtenerDB();
    const ruta = `matches/${actual}`;
    const snapshot = await get(child(ref(db), ruta));
    if (!snapshot.exists()) return [];
    const registros: Record<string, { estado: string; timestamp: number }> = snapshot.val();
    // Devolver todos los no rechazados para preservar chats históricos
    return Object.keys(registros).filter(k => {
      const est = registros[k]?.estado;
      return est && est !== 'rechazado';
    });
  }
}
