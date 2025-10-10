import { Injectable } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';

/**
 * Wrapper para el plugin nativo Java de selección de archivos.
 * La implementación Java debe exponer un puente (por ejemplo, vía Capacitor/Cordova)
 * con los métodos: pickImage() y pickFile(). Este wrapper define la interfaz
 * y provee un fallback web para desarrollo.
 */
@Injectable({ providedIn: 'root' })
export class FilePickerPlugin {
  /**
   * Selecciona una imagen desde el dispositivo.
   * En Android, debe delegar al plugin Java (p. ej. mediante Capacitor).
   */
  async pickImage(): Promise<Blob> {
    // Intentar plugin nativo primero
    try {
      if (Capacitor.getPlatform() !== 'web') {
        const NativeFilePicker = this.getNative();
        if (NativeFilePicker?.pickImage) {
          const res = await NativeFilePicker.pickImage();
          const blob = this.toBlob(res);
          this.ensureImageType(blob);
          return blob;
        }
      }
    } catch (_) {
      // Continuar con fallback web si falla
    }

    // Fallback web: input file
    const input = this.createHiddenInput('image/*');
    const file = await this.waitForFile(input);
    this.ensureImageType(file);
    return file;
  }

  /**
   * Selecciona un archivo genérico desde el dispositivo.
   * No valida tipo de imagen; devuelve Blob según mimeType.
   */
  async pickFile(): Promise<Blob> {
    try {
      if (Capacitor.getPlatform() !== 'web') {
        const NativeFilePicker = this.getNative();
        if (NativeFilePicker?.pickFile) {
          const res = await NativeFilePicker.pickFile();
          return this.toBlob(res);
        }
      }
    } catch (_) {
      // Fallback web si falla el nativo
    }

    const input = this.createHiddenInput('*/*');
    const file = await this.waitForFile(input);
    return file;
  }

  // --- Fallback helpers ---
  private getNative(): any | undefined {
    try {
      // registerPlugin crea un proxy hacia el plugin nativo si existe
      return registerPlugin<any>('FilePicker');
    } catch {
      return undefined;
    }
  }

  private createHiddenInput(accept: string): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    document.body.appendChild(input);
    return input;
  }

  private waitForFile(input: HTMLInputElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const cleanup = () => input.remove();
      input.onchange = () => {
        const file = input.files?.[0];
        cleanup();
        if (!file) return reject(new Error('No se seleccionó archivo'));
        resolve(file);
      };
      input.click();
    });
  }

  private toBlob(res: any): Blob {
    if (!res) throw new Error('Respuesta vacía del plugin');
    // Si ya es Blob
    if (res instanceof Blob) return res;
    // dataUrl: "data:image/jpeg;base64,..."
    if (typeof res.dataUrl === 'string') {
      return this.dataUrlToBlob(res.dataUrl);
    }
    // base64 + mimeType
    if (typeof res.base64 === 'string' && typeof res.mimeType === 'string') {
      return this.base64ToBlob(res.base64, res.mimeType);
    }
    // Algunos plugins devuelven 'data' con base64
    if (typeof res.data === 'string' && typeof res.mimeType === 'string') {
      const data = res.data.startsWith('data:') ? res.data.split(',')[1] : res.data;
      return this.base64ToBlob(data, res.mimeType);
    }
    throw new Error('Formato de respuesta no soportado por FilePicker');
  }

  private dataUrlToBlob(dataUrl: string): Blob {
    const [header, base64] = dataUrl.split(',');
    const mime = header.match(/data:(.*?);base64/)?.[1] || 'application/octet-stream';
    return this.base64ToBlob(base64, mime);
  }

  private base64ToBlob(base64: string, mime: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mime });
  }

  private ensureImageType(blob: Blob): void {
    const type = blob.type || '';
    if (!type.startsWith('image/')) {
      throw new Error('Solo se permiten imágenes y fotos');
    }
  }
}