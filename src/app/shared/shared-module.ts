import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { EncabezadoAuthComponent } from './components/encabezado-auth/encabezado-auth.component';
import { BotonGoogleComponent } from './components/boton-google/boton-google.component';
import { MensajeErrorComponent } from './components/mensaje-error/mensaje-error.component';
import { SeparadorComponent } from './components/separador/separador.component';
import { LogoComponent } from './components/logo/logo.component';



@NgModule({
  declarations: [
    EncabezadoAuthComponent,
    BotonGoogleComponent,
    MensajeErrorComponent,
    SeparadorComponent,
    LogoComponent,
  ],
  imports: [
    CommonModule,
    IonicModule,
  ],
  exports: [
    EncabezadoAuthComponent,
    BotonGoogleComponent,
    MensajeErrorComponent,
    SeparadorComponent,
    LogoComponent,
  ]
})
export class SharedModule { }
