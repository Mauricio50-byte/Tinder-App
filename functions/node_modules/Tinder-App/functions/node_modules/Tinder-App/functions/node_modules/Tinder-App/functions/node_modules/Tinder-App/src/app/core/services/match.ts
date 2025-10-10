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
    const snapshot = await get(child(ref(this.firebase.obtenerDB()), 'usuarios'));
    if (!snapshot.exists()) return [];
    const todos: Record<string, Usuario> = snapshot.val();
    const lista = Object.values(todos).filter(u => u.id !== uid);
    return lista;
  }

  async aceptarUsuario(idUsuario: string): Promise<void> {
    const uid = this.obtenerUID();
    if (!uid) return;
    const ruta = `matches/${uid}/${idUsuario}`;
    const datos = { estado: 'aceptado', timestamp: Date.now() };
    await set(ref(this.firebase.obtenerDB(), ruta), datos);
    await this.notification.success('Has aceptado el usuario');
  }

  async rechazarUsuario(idUsuario: string): Promise<void> {
    const uid = this.obtenerUID();
    if (!uid) return;
    const ruta = `matches/${uid}/${idUsuario}`;
    const datos = { estado: 'rechazado', timestamp: Date.now() };
    await set(ref(this.firebase.obtenerDB(), ruta), datos);
    await this.notification.success('Has rechazado el usuario');
  }

  async listarMatchesDelUsuario(uid?: string): Promise<string[]> {
    const actual = uid ?? this.obtenerUID();
    if (!actual) return [];
    const ruta = `matches/${actual}`;
    const snapshot = await get(child(ref(this.firebase.obtenerDB()), ruta));
    if (!snapshot.exists()) return [];
    const registros: Record<string, { estado: string; timestamp: number }> = snapshot.val();
    return Object.keys(registros).filter(k => registros[k]?.estado === 'aceptado');
  }
}
