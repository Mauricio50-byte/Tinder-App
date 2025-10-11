import { Injectable } from '@angular/core';
import { getStorage, ref as storageRef, getDownloadURL, uploadBytesResumable, UploadTask } from 'firebase/storage';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class Storage {
  // Forzar bucket correcto usando environment, evitando discrepancias en Android
  private storage = getStorage(undefined, `gs://${environment.firebase.storageBucket}`);

  async subirFotoPerfil(uid: string, archivo: Blob, onProgress?: (progress: number) => void): Promise<string> {
    if (!archivo || archivo.size === 0) {
      throw new Error('La imagen seleccionada está vacía');
    }
    const ref = storageRef(this.storage, `usuarios/${uid}/perfil.jpg`);
    const metadata = { contentType: archivo.type || 'image/jpeg' } as any;

    return new Promise<string>((resolve, reject) => {
      try {
        const task: UploadTask = uploadBytesResumable(ref, archivo, metadata);
        const TIMEOUT_MS = 30000; // cancelar si no progresa
        const timer = setTimeout(() => {
          try { task.cancel(); } catch {}
          reject(new Error('Tiempo de espera al subir la imagen'));
        }, TIMEOUT_MS);
        task.on('state_changed', (snap) => {
          if (onProgress && snap.totalBytes) {
            const progress = snap.bytesTransferred / snap.totalBytes;
            try { onProgress(progress); } catch {}
          }
        }, (err) => {
          try { clearTimeout(timer); } catch {}
          reject(err);
        }, async () => {
          try { clearTimeout(timer); } catch {}
          try {
            const url = await getDownloadURL(ref);
            resolve(url);
          } catch (e) {
            reject(e);
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  }
}
