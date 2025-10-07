import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CameraPlugin {
  // Fallback web-compatible implementation that works without @capacitor/camera
  async tomarFoto(): Promise<Blob> {
    const input = this.crearInputArchivo('image/*', 'environment');
    const file = await this.esperarArchivo(input);
    return file;
  }

  async seleccionarDeGaleria(): Promise<Blob> {
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
}