import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-separador',
  templateUrl: './separador.component.html',
  styleUrls: ['./separador.component.scss'],
  standalone: false,
})
export class SeparadorComponent {
  @Input() texto = 'o continuar con';
}