import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { Firebase } from '../../core/providers/firebase';
import { Match } from '../../core/services/match';
import { MessagingPlugin } from '../../plugins/messaging';
import { Mensaje } from '../../shared/interfaces/message';
import { Usuario } from '../../shared/interfaces/user';
import { ref, get, child } from 'firebase/database';
import { Notification } from '../../core/providers/notification';

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
  cargandoMensajes = false;
  private ultimoTsVisto = 0;
  private unsubMensajes?: () => void;

  constructor(private firebase: Firebase, private match: Match, private messaging: MessagingPlugin, private router: Router, private notification: Notification, private route: ActivatedRoute) { }

  async ngOnInit(): Promise<void> {
    await this.notification.requestLocalPermission();
    await this.cargarMatches();
    const uidDestino = this.route.snapshot.queryParamMap.get('uid');
    if (uidDestino) {
      const u = this.matches.find(x => x.id === uidDestino);
      if (u) this.seleccionarUsuario(u);
    }
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
        if (snap.exists()) {
          usuarios.push(snap.val() as Usuario);
        } else {
          // Resiliencia: si el perfil del otro usuario no existe en DB, aún mostrar el chat por UID
          usuarios.push({ id, nombre: id, edad: 0, email: '', fotoUrl: '', bio: '' } as Usuario);
        }
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
    // Cargar historial primero para que se vea al abrir el chat
    this.cargandoMensajes = true;
    this.messaging.cargarMensajes(current.uid, u.id, 50).then(hist => {
      this.mensajes = hist;
      // Establecer corte para evitar duplicados y notificaciones de históricos
      const last = hist.length ? hist[hist.length - 1].timestamp : Date.now();
      this.ultimoTsVisto = Math.max(this.ultimoTsVisto, last);
    }).finally(() => {
      this.cargandoMensajes = false;
      // Suscribirse a nuevos mensajes
      this.unsubMensajes = this.messaging.suscribirMensajes(current.uid, u.id, (m) => {
        // Ignorar mensajes anteriores al corte para evitar duplicados y notificaciones históricas
        if (!m || typeof m.timestamp !== 'number' || m.timestamp <= this.ultimoTsVisto) return;
        // Notificar solo si el mensaje es entrante (destinatario actual) y NO lo enviaste tú
        const currentUid = this.firebase.obtenerAuth().currentUser?.uid;
        const isIncoming = !!(m && currentUid && m.destinatarioId === currentUid && m.remitenteId !== currentUid);
        if (isIncoming) {
          const nombreRem = this.seleccionado?.nombre || 'Tu match';
          this.notification.scheduleLocal(`Nuevo mensaje de ${nombreRem}`, m.texto || 'Tienes un nuevo mensaje');
        }
        this.mensajes = [...this.mensajes, m];
        if (m.timestamp > this.ultimoTsVisto) this.ultimoTsVisto = m.timestamp;
      });
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

  irAHome(): void {
    this.router.navigateByUrl('/home');
  }

  diaLabel(ts: number | undefined): string {
    if (!ts) return '';
    const d = new Date(ts);
    const hoy = new Date();
    const ayer = new Date();
    ayer.setDate(hoy.getDate() - 1);
    const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    if (sameDay(d, hoy)) return 'Hoy';
    if (sameDay(d, ayer)) return 'Ayer';
    return d.toLocaleDateString();
  }
}
