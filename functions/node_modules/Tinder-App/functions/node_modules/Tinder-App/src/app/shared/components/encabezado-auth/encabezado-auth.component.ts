import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-encabezado-auth',
  templateUrl: './encabezado-auth.component.html',
  styleUrls: ['./encabezado-auth.component.scss'],
  standalone: false,
})
export class EncabezadoAuthComponent {
  @Input() titulo = '';
  @Input() subtitulo = '';
}