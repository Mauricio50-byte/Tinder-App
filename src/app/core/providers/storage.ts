import { Injectable } from '@angular/core';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

@Injectable({ providedIn: 'root' })
export class Storage {
  private storage = getStorage();

  async subirFotoPerfil(uid: string, archivo: Blob): Promise<string> {
    const ref = storageRef(this.storage, `usuarios/${uid}/perfil.jpg`);
    const metadata = { contentType: archivo.type || 'image/jpeg' } as any;
    await uploadBytes(ref, archivo, metadata);
    const url = await getDownloadURL(ref);
    return url;
  }
}
