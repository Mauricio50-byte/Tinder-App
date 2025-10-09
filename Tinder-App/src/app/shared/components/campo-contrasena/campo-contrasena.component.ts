import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-campo-contrasena',
  templateUrl: './campo-contrasena.component.html',
  styleUrls: ['./campo-contrasena.component.scss'],
  standalone: false,
})
export class CampoContrasenaComponent {
  @Input() label = 'Contraseña';
  @Input() placeholder = '••••••••';
  @Input() disabled = false;
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();

  mostrar = false;

  toggle(): void {
    this.mostrar = !this.mostrar;
  }

  onInput(event: any): void {
    const val = event?.detail?.value ?? event?.target?.value ?? '';
    this.value = val ?? '';
    this.valueChange.emit(this.value);
  }
}