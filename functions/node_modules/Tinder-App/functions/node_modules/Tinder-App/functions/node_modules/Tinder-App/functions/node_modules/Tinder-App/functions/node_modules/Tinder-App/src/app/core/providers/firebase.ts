import { Injectable } from '@angular/core';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase, Database } from 'firebase/database';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class Firebase {
  private app?: FirebaseApp;
  private auth?: Auth;
  private db?: Database;
  private proveedorGoogle = new GoogleAuthProvider();

  constructor() {
    this.inicializar();
  }

  private inicializar(): void {
    if (!getApps().length) {
      this.app = initializeApp(environment.firebase);
    } else {
      this.app = getApps()[0];
    }
    this.auth = getAuth(this.app);
    this.db = getDatabase(this.app);
  }

  obtenerAuth(): Auth {
    return this.auth!;
  }

  obtenerDB(): Database {
    return this.db!;
  }

  obtenerProveedorGoogle(): GoogleAuthProvider {
    return this.proveedorGoogle;
  }
}
