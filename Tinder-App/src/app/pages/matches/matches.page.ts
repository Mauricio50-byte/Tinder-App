import { Component, OnInit } from '@angular/core';
import { Match } from '../../core/services/match';
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

  constructor(private match: Match) {}

  async ngOnInit(): Promise<void> {
    await this.cargarCandidatos();
  }

  async cargarCandidatos(): Promise<void> {
    this.cargando = true;
    try {
      this.candidatos = await this.match.listarPosiblesMatches();
    } finally {
      this.cargando = false;
    }
  }

  async aceptar(u: Usuario): Promise<void> {
    await this.match.aceptarUsuario(u.id);
    this.candidatos = this.candidatos.filter(c => c.id !== u.id);
  }

  async rechazar(u: Usuario): Promise<void> {
    await this.match.rechazarUsuario(u.id);
    this.candidatos = this.candidatos.filter(c => c.id !== u.id);
  }
}
