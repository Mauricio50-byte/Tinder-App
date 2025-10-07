import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-boton-google',
  templateUrl: './boton-google.component.html',
  styleUrls: ['./boton-google.component.scss'],
  standalone: false,
})
export class BotonGoogleComponent {
  @Output() clickGoogle = new EventEmitter<void>();

  onClick(): void {
    this.clickGoogle.emit();
  }
}