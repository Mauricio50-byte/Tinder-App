import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { EncabezadoAuthComponent } from './components/encabezado-auth/encabezado-auth.component';
import { BotonGoogleComponent } from './components/boton-google/boton-google.component';
import { SeparadorComponent } from './components/separador/separador.component';
import { LogoComponent } from './components/logo/logo.component';
import { CampoContrasenaComponent } from './components/campo-contrasena/campo-contrasena.component';



@NgModule({
  declarations: [
    EncabezadoAuthComponent,
    BotonGoogleComponent,
    SeparadorComponent,
    LogoComponent,
    CampoContrasenaComponent,
  ],
  imports: [
    CommonModule,
    IonicModule,
  ],
  exports: [
    EncabezadoAuthComponent,
    BotonGoogleComponent,
    SeparadorComponent,
    LogoComponent,
    CampoContrasenaComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SharedModule { }
