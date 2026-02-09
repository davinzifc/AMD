import { Component, ChangeDetectionStrategy, inject, input, output, computed } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import { Select } from 'primeng/select';
import { InputNumber } from 'primeng/inputnumber';
import { ResultsTableComponent } from '../../../../components/results-table/results-table.component';
import { PdfGeneratorService, PdfPageSizeKey } from '../../../../services/pdf-generator.service';
import { ProcessingResult } from '../../../../models/processing.model';

@Component({
  selector: 'app-step-results',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Message, Select, InputNumber, FormsModule, ResultsTableComponent],
  templateUrl: './step-results.component.html',
  styleUrl: './step-results.component.scss',
})
export class StepResultsComponent {
  pdfService = inject(PdfGeneratorService);
  private sanitizer = inject(DomSanitizer);

  processingResult = input.required<ProcessingResult | null>();
  error = input<string | null>(null);
  isGeneratingPdf = input(false);
  pdfSuccess = input<string | null>(null);
  pdfPreviewUrl = input<string | null>(null);

  generatePdfs = output<{ selectedIds: string[]; year: string; includeDetails: boolean; firmanteId: number; pageSize: { widthMm: number; heightMm: number }; margins: { top: number; right: number; bottom: number; left: number } }>();
  previewPdf = output<{ selectedIds: string[]; year: string; includeDetails: boolean; firmanteId: number; pageSize: { widthMm: number; heightMm: number }; margins: { top: number; right: number; bottom: number; left: number } }>();
  closePdfPreview = output<void>();
  navigate = output<number>();

  pdfPageSizeKey: PdfPageSizeKey = 'letter';
  pdfMarginTop = 20;
  pdfMarginRight = 20;
  pdfMarginBottom = 20;
  pdfMarginLeft = 20;

  sanitizedPdfPreviewUrl = computed(() => {
    const url = this.pdfPreviewUrl();
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

  private getPdfConfig() {
    return {
      pageSize: this.pdfService.getPageSizeMm(this.pdfPageSizeKey),
      margins: {
        top: this.pdfMarginTop ?? 20,
        right: this.pdfMarginRight ?? 20,
        bottom: this.pdfMarginBottom ?? 20,
        left: this.pdfMarginLeft ?? 20,
      },
    };
  }

  onGenerate(event: { selectedIds: string[]; year: string; includeDetails: boolean; firmanteId: number }) {
    const config = this.getPdfConfig();
    this.generatePdfs.emit({ ...event, ...config });
  }

  onPreview(event: { selectedIds: string[]; year: string; includeDetails: boolean; firmanteId: number }) {
    const config = this.getPdfConfig();
    this.previewPdf.emit({ ...event, ...config });
  }
}
