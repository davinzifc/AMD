declare module 'jspdf' {
  export class jsPDF {
    constructor(orientation?: string, unit?: string, format?: string | number[]);
    addImage(
      imgData: string,
      format: string,
      x: number,
      y: number,
      width: number,
      height: number
    ): void;
    addPage(): void;
    output(type: 'blob'): Blob;
  }
}

declare module 'html2canvas' {
  function html2canvas(
    element: HTMLElement,
    options?: { scale?: number; useCORS?: boolean; allowTaint?: boolean; logging?: boolean }
  ): Promise<HTMLCanvasElement>;
  export default html2canvas;
}
