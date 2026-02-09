import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { Stepper, StepList, StepPanels, StepPanel, Step } from 'primeng/stepper';
import { Button } from 'primeng/button';
import { formatNit } from '../../../../shared/pipes/format-nit.pipe';
import { CryptoReportService } from '../../services/crypto-report.service';
import { PdfGeneratorService } from '../../services/pdf-generator.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ThirdParty } from '../../components/third-party-selector/third-party-selector.component';
import { RawTransaction } from '../../models/raw-transaction.model';
import { StepUploadComponent } from './steps/step-upload/step-upload.component';
import { StepThirdPartyComponent } from './steps/step-third-party/step-third-party.component';
import { StepReviewComponent } from './steps/step-review/step-review.component';
import { StepProcessingComponent } from './steps/step-processing/step-processing.component';
import { StepResultsComponent } from './steps/step-results/step-results.component';

@Component({
  selector: 'app-crypto-main',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Stepper, StepList, StepPanels, StepPanel, Step, Button,
    StepUploadComponent, StepThirdPartyComponent, StepReviewComponent,
    StepProcessingComponent, StepResultsComponent,
  ],
  templateUrl: './main.page.html',
  styleUrl: './main.page.scss',
})
export class CryptoMainPage {
  reportService = inject(CryptoReportService);
  private pdfService = inject(PdfGeneratorService);
  private notify = inject(NotificationService);

  activeStep = signal(1);
  selectedThirdParties = signal<ThirdParty[]>([]);
  selectedTransactions = signal<RawTransaction[]>([]);
  isGeneratingPdf = signal(false);
  pdfSuccess = signal<string | null>(null);
  pdfPreviewUrl = signal<string | null>(null);

  empresaInfo = computed(() => {
    const emp = this.reportService.empresa();
    return emp ? `${emp.nombre} (NIT: ${formatNit(emp.nit)})` : null;
  });

  filteredTransactions = computed(() => {
    const ids = new Set(this.selectedThirdParties().map(p => p.id));
    if (ids.size === 0) return [];
    return this.reportService.transactions().filter(t => ids.has(t.id));
  });

  onStepChange(event: number | undefined) {
    if (event !== undefined) {
      this.activeStep.set(event);
      if (event === 2) {
        this.selectedThirdParties.set([]);
      }
    }
  }

  resetAll() {
    this.reportService.reset();
    this.selectedThirdParties.set([]);
    this.selectedTransactions.set([]);
    this.pdfSuccess.set(null);
    this.closePdfPreview();
    this.activeStep.set(1);
  }

  closePdfPreview() {
    const url = this.pdfPreviewUrl();
    if (url) URL.revokeObjectURL(url);
    this.pdfPreviewUrl.set(null);
  }

  async selectExcelFile(activateCallback: (step: number) => void) {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const filePath = await open({
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
        multiple: false,
      });

      if (filePath) {
        await this.reportService.uploadExcel(filePath as string);
        activateCallback(2);
      }
    } catch {
      // Error is already stored in the service
    }
  }

  async startProcessing(activateCallback: (step: number) => void) {
    const txns = this.reportService.transactions();
    const ids = [...new Set(this.selectedThirdParties().map(p => p.id))];

    try {
      const result = await this.reportService.processSelected(txns, ids);
      if (result.total_valid > 0) {
        activateCallback(5);
      }
    } catch {
      // Error is already stored in the service
    }
  }

  async onGeneratePdfs(event: {
    selectedIds: string[];
    year: string;
    includeDetails: boolean;
    firmanteId: number;
    pageSize: { widthMm: number; heightMm: number };
    margins: { top: number; right: number; bottom: number; left: number };
  }) {
    const result = this.reportService.processingResult();
    const empresa = this.reportService.empresa();
    if (!result || !empresa) return;

    const selectedGroups = result.valid_groups.filter(g => event.selectedIds.includes(g.id));
    if (selectedGroups.length === 0) return;

    this.isGeneratingPdf.set(true);
    this.pdfSuccess.set(null);

    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const outputDir = await open({ directory: true, title: 'Seleccionar carpeta de destino' });

      if (!outputDir) {
        this.isGeneratingPdf.set(false);
        return;
      }

      const { invoke } = await import('@tauri-apps/api/core');

      const prepared = await invoke<{ output_dir: string; items: { pdf_file_name: string; html: string }[] }>(
        'prepare_pdf_htmls',
        {
          groups: selectedGroups,
          empresaNit: empresa.nit,
          year: event.year,
          outputDir: outputDir as string,
          includeDetails: event.includeDetails,
          firmanteId: event.firmanteId,
        }
      );

      const total = prepared.items.length;
      for (let i = 0; i < prepared.items.length; i++) {
        const item = prepared.items[i];
        const blob = await this.pdfService.htmlToPdfBlob(item.html, event.pageSize, event.margins);
        const base64 = await this.pdfService.blobToBase64(blob);
        await invoke('write_pdf_file', {
          outputDir: prepared.output_dir,
          fileName: item.pdf_file_name,
          contentsBase64: base64,
        });
      }

      this.pdfSuccess.set(`Se generaron ${total} archivo(s) en ${prepared.output_dir}`);
      this.notify.success('PDFs generados', `${total} archivo(s) creados`);
    } catch (err) {
      this.notify.error('Error generando PDFs', String(err));
    } finally {
      this.isGeneratingPdf.set(false);
    }
  }

  async onPreviewPdf(event: {
    selectedIds: string[];
    year: string;
    includeDetails: boolean;
    firmanteId: number;
    pageSize: { widthMm: number; heightMm: number };
    margins: { top: number; right: number; bottom: number; left: number };
  }) {
    const result = this.reportService.processingResult();
    const empresa = this.reportService.empresa();
    if (!result || !empresa || event.selectedIds.length === 0) return;

    const firstGroup = result.valid_groups.find(g => g.id === event.selectedIds[0]);
    if (!firstGroup) return;

    this.closePdfPreview();
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const outputDir = await invoke<string>('get_temp_dir');

      const prepared = await invoke<{ output_dir: string; items: { pdf_file_name: string; html: string }[] }>(
        'prepare_pdf_htmls',
        {
          groups: [firstGroup],
          empresaNit: empresa.nit,
          year: event.year,
          outputDir,
          includeDetails: event.includeDetails,
          firmanteId: event.firmanteId,
        }
      );
      if (prepared.items.length === 0) return;

      const blob = await this.pdfService.htmlToPdfBlob(prepared.items[0].html, event.pageSize, event.margins);
      const url = URL.createObjectURL(blob);
      this.pdfPreviewUrl.set(url);
    } catch (err) {
      this.notify.error('Error en vista previa', String(err));
    }
  }
}
