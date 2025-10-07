import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-mensaje-error',
  templateUrl: './mensaje-error.component.html',
  styleUrls: ['./mensaje-error.component.scss'],
  standalone: false,
})
export class MensajeErrorComponent {
  @Input() mensaje = '';
}