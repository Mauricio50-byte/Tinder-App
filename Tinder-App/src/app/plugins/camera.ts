import { Injectable } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';

@Injectable({ providedIn: 'root' })
export class CameraPlugin {
  // En móvil usa plugin nativo de FilePicker; en web usa input file
  async tomarFoto(): Promise<Blob> {
    // Intentar plugin nativo (selección de imagen desde cámara/galería según SO)
    try {
      if (Capacitor.getPlatform() !== 'web') {
        const NativeFilePicker = this.obtenerFilePicker();
        if (NativeFilePicker?.pickImage) {
          const res = await NativeFilePicker.pickImage();
          return this.aBlob(res);
        }
      }
    } catch {
      // Continuar con fallback web
    }
    const input = this.crearInputArchivo('image/*', 'environment');
    const file = await this.esperarArchivo(input);
    return file;
  }

  async seleccionarDeGaleria(): Promise<Blob> {
    try {
      if (Capacitor.getPlatform() !== 'web') {
        const NativeFilePicker = this.obtenerFilePicker();
        if (NativeFilePicker?.pickImage) {
          const res = await NativeFilePicker.pickImage();
          return this.aBlob(res);
        }
      }
    } catch {}
    const input = this.crearInputArchivo('image/*');
    const file = await this.esperarArchivo(input);
    return file;
  }

  private crearInputArchivo(accept: string, capture?: 'user' | 'environment'): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    if (capture) input.setAttribute('capture', capture);
    input.style.display = 'none';
    document.body.appendChild(input);
    return input;
  }

  private esperarArchivo(input: HTMLInputElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        input.remove();
      };
      input.onchange = () => {
        const file = input.files?.[0];
        cleanup();
        if (!file) return reject(new Error('No se seleccionó archivo'));
        resolve(file);
      };
      input.click();
    });
  }

  private obtenerFilePicker(): any | undefined {
    try {
      return registerPlugin<any>('FilePicker');
    } catch {
      return undefined;
    }
  }

  private aBlob(res: any): Blob {
    if (!res) throw new Error('Respuesta vacía del plugin');
    if (res instanceof Blob) return res;
    if (typeof res.dataUrl === 'string') {
      return this.dataUrlABlob(res.dataUrl);
    }
    if (typeof res.base64 === 'string' && typeof res.mimeType === 'string') {
      return this.base64ABlob(res.base64, res.mimeType);
    }
    if (typeof res.data === 'string' && typeof res.mimeType === 'string') {
      const data = res.data.startsWith('data:') ? res.data.split(',')[1] : res.data;
      return this.base64ABlob(data, res.mimeType);
    }
    throw new Error('Formato de respuesta no soportado');
  }

  private dataUrlABlob(dataUrl: string): Blob {
    const [header, base64] = dataUrl.split(',');
    const mime = header.match(/data:(.*?);base64/)?.[1] || 'application/octet-stream';
    return this.base64ABlob(base64, mime);
  }

  private base64ABlob(base64: string, mime: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mime });
  }
}