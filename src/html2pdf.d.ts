declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | number[];
    image?: { type?: string; quality?: number };
    jsPDF?: { unit?: string; format?: string; orientation?: string };
  }

  interface Html2PdfWorker {
    set(opt: Html2PdfOptions): Html2PdfWorker;
    from(src: string | HTMLElement, type?: string): Html2PdfWorker;
    outputPdf(type: 'blob'): Html2PdfWorker;
    thenExternal<T>(onFulfilled: (value: Blob) => T): Html2PdfWorker;
    catchExternal(onRejected: (err: unknown) => unknown): Html2PdfWorker;
  }

  function html2pdf(): Html2PdfWorker;
  export default html2pdf;
}
