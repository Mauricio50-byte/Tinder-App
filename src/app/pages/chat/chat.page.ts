import { Component, OnDestroy, OnInit } from '@angular/core';
import { Firebase } from '../../core/providers/firebase';
import { Match } from '../../core/services/match';
import { MessagingPlugin } from '../../plugins/messaging';
import { Mensaje } from '../../shared/interfaces/message';
import { Usuario } from '../../shared/interfaces/user';
import { ref, get, child } from 'firebase/database';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: false,
})
export class ChatPage implements OnInit, OnDestroy {
  matches: Usuario[] = [];
  seleccionado?: Usuario;
  mensajes: Mensaje[] = [];
  texto = '';
  cargando = false;
  private unsubMensajes?: () => void;

  constructor(private firebase: Firebase, private match: Match, private messaging: MessagingPlugin) { }

  async ngOnInit(): Promise<void> {
    await this.cargarMatches();
  }

  ngOnDestroy(): void {
    this.desuscribir();
  }

  private desuscribir(): void {
    if (this.unsubMensajes) {
      this.unsubMensajes();
      this.unsubMensajes = undefined;
    }
  }

  async cargarMatches(): Promise<void> {
    const current = this.firebase.obtenerAuth().currentUser;
    if (!current) return;
    this.cargando = true;
    try {
      const ids = await this.match.listarMatchesDelUsuario(current.uid);
      const usuarios: Usuario[] = [];
      for (const id of ids) {
        const snap = await get(child(ref(this.firebase.obtenerDB()), `usuarios/${id}`));
        if (snap.exists()) usuarios.push(snap.val() as Usuario);
      }
      this.matches = usuarios;
    } finally {
      this.cargando = false;
    }
  }

  seleccionarUsuario(u: Usuario): void {
    this.seleccionado = u;
    this.mensajes = [];
    const current = this.firebase.obtenerAuth().currentUser;
    if (!current) return;
    this.desuscribir();
    this.unsubMensajes = this.messaging.suscribirMensajes(current.uid, u.id, (m) => {
      this.mensajes = [...this.mensajes, m];
    });
  }

  async enviar(): Promise<void> {
    const current = this.firebase.obtenerAuth().currentUser;
    if (!current || !this.seleccionado) return;
    const texto = (this.texto || '').trim();
    if (!texto) return;
    await this.messaging.enviarMensaje(current.uid, this.seleccionado.id, texto);
    this.texto = '';
  }
}
