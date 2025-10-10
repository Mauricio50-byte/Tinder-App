import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatchViewPlugin } from '../../plugins/match-view.plugin';
import { Usuario } from '../../shared/interfaces/user';

@Component({
  selector: 'app-matches',
  templateUrl: './matches.page.html',
  styleUrls: ['./matches.page.scss'],
  standalone: false,
})
export class MatchesPage implements OnInit {
  candidatos: Usuario[] = [];
  cargando = false;
  estadoMsg?: string;

  constructor(private matchView: MatchViewPlugin, private router: Router) {}

  async ngOnInit(): Promise<void> {
    await this.cargarCandidatos();
  }

  async cargarCandidatos(cantidad: number = 5): Promise<void> {
    this.cargando = true;
    this.estadoMsg = undefined;
    try {
      const nuevos: Usuario[] = [];
      const vistos = new Set<string>(this.candidatos.map(c => c.id));
      const maxIntentos = cantidad * 2;
      let intentos = 0;

      while (nuevos.length < cantidad && intentos < maxIntentos) {
        intentos++;
        const siguiente = await this.matchView.cargarSiguientePerfil();
        if (!siguiente) break;
        const yaVisto = vistos.has(siguiente.id) || nuevos.some(x => x.id === siguiente.id);
        if (yaVisto) {
          // Evita bucles si el plugin retorna repetidos
          break;
        }
        nuevos.push(siguiente);
      }

      this.candidatos = nuevos;
      this.estadoMsg = this.candidatos.length
        ? `Cargados ${this.candidatos.length} candidato(s)`
        : 'No hay candidatos disponibles';
    } catch (e: any) {
      console.error('Error cargando candidatos', e);
      this.estadoMsg = e?.message ?? 'Error al cargar candidatos';
    } finally {
      this.cargando = false;
    }
  }

  async aceptar(u: Usuario): Promise<void> {
    await this.matchView.marcarAceptado(u.id);
    this.candidatos = this.candidatos.filter(c => c.id !== u.id);
    if (this.candidatos.length === 0) {
      await this.cargarCandidatos();
    } else {
      this.estadoMsg = `${this.candidatos.length} candidato(s) restantes`;
    }
  }

  async rechazar(u: Usuario): Promise<void> {
    await this.matchView.marcarRechazado(u.id);
    this.candidatos = this.candidatos.filter(c => c.id !== u.id);
    if (this.candidatos.length === 0) {
      await this.cargarCandidatos();
    } else {
      this.estadoMsg = `${this.candidatos.length} candidato(s) restantes`;
    }
  }

  irAHome(): void {
    this.router.navigateByUrl('/home');
  }
}
