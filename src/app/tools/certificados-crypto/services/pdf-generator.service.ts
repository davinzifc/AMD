import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export interface PdfPageSize {
  widthMm: number;
  heightMm: number;
  label: string;
}

export interface PdfMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type PdfPageSizeKey = 'letter' | 'a4' | 'legal';

const PDF_PAGE_SIZES: Record<PdfPageSizeKey, PdfPageSize> = {
  letter: { widthMm: 216, heightMm: 279, label: 'Carta (Letter)' },
  a4: { widthMm: 210, heightMm: 297, label: 'A4' },
  legal: { widthMm: 216, heightMm: 356, label: 'Legal' },
};

@Injectable({ providedIn: 'root' })
export class PdfGeneratorService {
  private static readonly PAGE_BREAK_MARKER =
    '<div class="html2pdf__page-break" style="page-break-before: always;"></div>';

  readonly pageSizeOptions: { value: PdfPageSizeKey; label: string }[] = [
    { value: 'letter', label: PDF_PAGE_SIZES.letter.label },
    { value: 'a4', label: PDF_PAGE_SIZES.a4.label },
    { value: 'legal', label: PDF_PAGE_SIZES.legal.label },
  ];

  getPageSizeMm(key: PdfPageSizeKey): { widthMm: number; heightMm: number } {
    const s = PDF_PAGE_SIZES[key] ?? PDF_PAGE_SIZES.letter;
    return { widthMm: s.widthMm, heightMm: s.heightMm };
  }

  async htmlToPdfBlob(
    html: string,
    pageSize?: { widthMm: number; heightMm: number },
    margins?: PdfMargins
  ): Promise<Blob> {
    const size = pageSize ?? { widthMm: 216, heightMm: 279 };
    const pageWidthMm = size.widthMm;
    const pageHeightMm = size.heightMm;
    const widthPx = Math.round((pageWidthMm / 216) * 794);
    const scalePxPerMm = widthPx / pageWidthMm;
    const m = margins ?? { top: 20, right: 20, bottom: 20, left: 20 };
    const padTop = Math.round(m.top * scalePxPerMm);
    const padRight = Math.round(m.right * scalePxPerMm);
    const padBottom = Math.round(m.bottom * scalePxPerMm);
    const padLeft = Math.round(m.left * scalePxPerMm);

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const styles = doc.querySelectorAll('style');
    const bodyContent = doc.body?.innerHTML ?? '';
    const styleClones: Node[] = [];
    styles.forEach((s) => styleClones.push(s.cloneNode(true)));

    const addCanvasToPdf = (
      pdf: InstanceType<typeof jsPDF>,
      canvas: HTMLCanvasElement,
      isFirstPage: boolean
    ) => {
      const imgData = canvas.toDataURL('image/png');
      const imgWidthMm = pageWidthMm;
      const imgHeightMm = (canvas.height * pageWidthMm) / canvas.width;
      let heightLeft = imgHeightMm;
      let position = 0;
      if (!isFirstPage) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidthMm, imgHeightMm);
      heightLeft -= pageHeightMm;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeightMm;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidthMm, imgHeightMm);
        heightLeft -= pageHeightMm;
      }
    };

    const renderFragment = async (fragmentHtml: string): Promise<HTMLCanvasElement> => {
      const wrapper = document.createElement('div');
      wrapper.style.cssText = `
        position: absolute; left: -9999px; top: 0;
        width: ${widthPx}px; overflow: visible; background: #ffffff;
        padding: ${padTop}px ${padRight}px ${padBottom}px ${padLeft}px; box-sizing: border-box;
      `;
      styleClones.forEach((n) => wrapper.appendChild(n.cloneNode(true)));
      const bodyDiv = document.createElement('div');
      bodyDiv.innerHTML = fragmentHtml;
      wrapper.appendChild(bodyDiv);
      document.body.appendChild(wrapper);
      const canvas = await html2canvas(wrapper, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      document.body.removeChild(wrapper);
      return canvas;
    };

    const idx = bodyContent.indexOf(PdfGeneratorService.PAGE_BREAK_MARKER);
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: [pageWidthMm, pageHeightMm] as [number, number],
    });

    if (idx !== -1) {
      const certHtml = bodyContent.substring(0, idx).trim();
      const detailsHtml = bodyContent
        .substring(idx + PdfGeneratorService.PAGE_BREAK_MARKER.length)
        .trim();
      const canvasCert = await renderFragment(certHtml);
      addCanvasToPdf(pdf, canvasCert, true);
      const canvasDetails = await renderFragment(detailsHtml);
      addCanvasToPdf(pdf, canvasDetails, false);
    } else {
      const canvas = await renderFragment(bodyContent);
      addCanvasToPdf(pdf, canvas, true);
    }

    return pdf.output('blob');
  }

  blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1] ?? '';
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
