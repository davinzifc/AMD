import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Stepper, StepList, StepPanels, StepPanel, Step } from 'primeng/stepper';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import { Select } from 'primeng/select';
import { InputNumber } from 'primeng/inputnumber';
import { FormsModule } from '@angular/forms';
import { formatNit } from '../../../../shared/pipes/format-nit.pipe';
import { CryptoReportService } from '../../services/crypto-report.service';
import { DataTableComponent } from '../../components/data-table/data-table.component';
import { ExcelUploadZoneComponent } from '../../components/excel-upload-zone/excel-upload-zone.component';
import { ProcessingProgressComponent } from '../../components/processing-progress/processing-progress.component';
import { ValidationErrorsComponent } from '../../components/validation-errors/validation-errors.component';
import { ResultsTableComponent } from '../../components/results-table/results-table.component';
import { ThirdPartySelectorComponent, ThirdParty } from '../../components/third-party-selector/third-party-selector.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { RawTransaction } from '../../models/raw-transaction.model';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/** Tamaños de hoja para el PDF (ancho x alto en mm) */
const PDF_PAGE_SIZES: Record<string, { widthMm: number; heightMm: number; label: string }> = {
  letter: { widthMm: 216, heightMm: 279, label: 'Carta (Letter)' },
  a4: { widthMm: 210, heightMm: 297, label: 'A4' },
  legal: { widthMm: 216, heightMm: 356, label: 'Legal' },
};
type PdfPageSizeKey = keyof typeof PDF_PAGE_SIZES;

@Component({
  selector: 'app-crypto-main',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Stepper, StepList, StepPanels, StepPanel, Step,
    Button, Message, Select, InputNumber, FormsModule, DataTableComponent,
    ExcelUploadZoneComponent,
    ProcessingProgressComponent, ValidationErrorsComponent,
    ResultsTableComponent, ThirdPartySelectorComponent,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Certificados Crypto</h1>
        <p class="page-subtitle">Genera certificados tributarios a partir de archivos Excel</p>
      </div>

      <div class="stepper-card">
        @if (activeStep() > 1) {
          <div class="stepper-card-actions">
            <p-button
              label="Cargar Nuevo Excel"
              icon="pi pi-refresh"
              severity="secondary"
              [outlined]="true"
              size="small"
              (onClick)="resetAll()" />
          </div>
        }

        <p-stepper [value]="activeStep()" (valueChange)="onStepChange($event)" [linear]="true">
          <p-step-list>
            <p-step [value]="1">Cargar Excel</p-step>
            <p-step [value]="2">Seleccionar Tercero</p-step>
            <p-step [value]="3">Revisar Datos</p-step>
            <p-step [value]="4">Procesamiento</p-step>
            <p-step [value]="5">Resultados</p-step>
          </p-step-list>

          <p-step-panels>
            <!-- Step 1: Cargar Excel -->
            <p-step-panel [value]="1">
              <ng-template #content let-activateCallback="activateCallback">
                <div class="step-content">
                  @if (reportService.error()) {
                    <p-message severity="error" [text]="reportService.error()!" styleClass="msg-block" />
                  }

                  <div class="upload-area">
                    <app-excel-upload-zone
                      [loading]="reportService.loading()"
                      (fileRequest)="selectExcelFile(activateCallback)" />
                  </div>

                  @if (empresaInfo()) {
                    <div class="empresa-badge">
                      <i class="pi pi-building"></i>
                      <span>Empresa: <strong>{{ empresaInfo() }}</strong></span>
                    </div>
                  }
                </div>
              </ng-template>
            </p-step-panel>

            <!-- Step 2: Seleccionar Tercero -->
            <p-step-panel [value]="2">
              <ng-template #content let-activateCallback="activateCallback">
                <div class="step-content">
                  @if (reportService.transactions().length > 0) {
                    <app-third-party-selector
                      [transactions]="reportService.transactions()"
                      [(selectedItems)]="selectedThirdParties" />

                    <div class="step-actions">
                      <p-button
                        label="Volver"
                        icon="pi pi-arrow-left"
                        severity="secondary"
                        [outlined]="true"
                        (onClick)="activateCallback(1)" />
                      <p-button
                        label="Revisar Datos"
                        icon="pi pi-arrow-right"
                        [disabled]="selectedThirdParties().length === 0"
                        [badge]="selectedThirdParties().length.toString()"
                        (onClick)="activateCallback(3)" />
                    </div>
                  } @else {
                    <div class="empty-state">
                      <p>No hay datos cargados. Vuelve al paso anterior.</p>
                      <p-button
                        label="Volver"
                        icon="pi pi-arrow-left"
                        severity="secondary"
                        (onClick)="activateCallback(1)" />
                    </div>
                  }
                </div>
              </ng-template>
            </p-step-panel>

            <!-- Step 3: Revisar Datos -->
            <p-step-panel [value]="3">
              <ng-template #content let-activateCallback="activateCallback">
                <div class="step-content">
                  @if (filteredTransactions().length > 0) {
                    <app-data-table
                      [transactions]="filteredTransactions()"
                      [(selected)]="selectedTransactions" />

                    <div class="step-actions">
                      <p-button
                        label="Volver"
                        icon="pi pi-arrow-left"
                        severity="secondary"
                        [outlined]="true"
                        (onClick)="activateCallback(2)" />
                      <p-button
                        label="Procesar"
                        icon="pi pi-cog"
                        [disabled]="selectedTransactions().length === 0"
                        [badge]="selectedTransactions().length.toString()"
                        (onClick)="activateCallback(4)" />
                    </div>
                  } @else {
                    <div class="empty-state">
                      <p>No hay datos para los terceros seleccionados.</p>
                      <p-button
                        label="Volver"
                        icon="pi pi-arrow-left"
                        severity="secondary"
                        (onClick)="activateCallback(2)" />
                    </div>
                  }
                </div>
              </ng-template>
            </p-step-panel>

            <!-- Step 4: Procesamiento -->
            <p-step-panel [value]="4">
              <ng-template #content let-activateCallback="activateCallback">
                <div class="step-content">
                  @if (!reportService.isProcessing() && !reportService.processingResult()) {
                    <div class="process-start">
                      <div class="process-summary">
                        <i class="pi pi-cog" style="font-size: 32px; color: #3b82f6;"></i>
                        <p><strong>{{ selectedTransactions().length }}</strong> registros seleccionados</p>
                        <p class="process-hint">Se agruparán por ID, se validará la consistencia de datos y se calcularán los totales</p>
                      </div>
                      <p-button
                        label="Iniciar Procesamiento"
                        icon="pi pi-play"
                        (onClick)="startProcessing(activateCallback)" />
                    </div>
                  }

                  @if (reportService.isProcessing()) {
                    <app-processing-progress [progress]="reportService.progress()" />
                  }

                  @if (reportService.processingResult(); as result) {
                    <div class="process-complete">
                      <div class="result-summary">
                        <div class="result-stat result-stat--success">
                          <span class="stat-value">{{ result.total_valid }}</span>
                          <span class="stat-label">Grupos válidos</span>
                        </div>
                        @if (result.total_invalid > 0) {
                          <div class="result-stat result-stat--error">
                            <span class="stat-value">{{ result.total_invalid }}</span>
                            <span class="stat-label">Grupos con errores</span>
                          </div>
                        }
                        <div class="result-stat">
                          <span class="stat-value">{{ result.total_processed }}</span>
                          <span class="stat-label">Registros procesados</span>
                        </div>
                      </div>

                      <app-validation-errors [errors]="result.validation_errors" />
                    </div>

                    <div class="step-actions">
                      <p-button
                        label="Volver"
                        icon="pi pi-arrow-left"
                        severity="secondary"
                        [outlined]="true"
                        (onClick)="activateCallback(3)" />
                      @if (result.total_valid > 0) {
                        <p-button
                          label="Ver Resultados"
                          icon="pi pi-arrow-right"
                          (onClick)="activateCallback(5)" />
                      }
                    </div>
                  }

                  @if (reportService.error() && !reportService.isProcessing()) {
                    <p-message severity="error" [text]="reportService.error()!" styleClass="msg-block" />
                  }
                </div>
              </ng-template>
            </p-step-panel>

            <!-- Step 5: Resultados -->
            <p-step-panel [value]="5">
              <ng-template #content let-activateCallback="activateCallback">
                <div class="step-content">
                  @if (reportService.error()) {
                    <p-message severity="error" [text]="reportService.error()!" styleClass="msg-block" />
                  }

                  @if (pdfSuccess()) {
                    <div class="pdf-success">
                      <i class="pi pi-check-circle"></i>
                      <span>{{ pdfSuccess() }}</span>
                    </div>
                  }

                  @if (reportService.processingResult(); as result) {
                    <div class="results-step-toolbar">
                      <div class="pdf-options-row">
                        <div class="pdf-options">
                          <label for="pdf-page-size">Tamaño de hoja:</label>
                          <p-select
                            id="pdf-page-size"
                            [options]="pdfPageSizeOptions"
                            [(ngModel)]="pdfPageSizeKey"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Carta"
                            [style]="{ width: '180px' }" />
                        </div>
                        <div class="pdf-margins">
                          <span class="margins-label">Márgenes (mm):</span>
                          <div class="margins-inputs">
                            <div class="margin-field" title="Arriba"><label for="pdf-margin-top">Arriba</label><p-inputnumber inputId="pdf-margin-top" [(ngModel)]="pdfMarginTop" [min]="0" [max]="50" [useGrouping]="false" styleClass="margin-input" /></div>
                            <div class="margin-field" title="Abajo"><label for="pdf-margin-bottom">Abajo</label><p-inputnumber inputId="pdf-margin-bottom" [(ngModel)]="pdfMarginBottom" [min]="0" [max]="50" [useGrouping]="false" styleClass="margin-input" /></div>
                            <div class="margin-field" title="Izquierda"><label for="pdf-margin-left">Izq.</label><p-inputnumber inputId="pdf-margin-left" [(ngModel)]="pdfMarginLeft" [min]="0" [max]="50" [useGrouping]="false" styleClass="margin-input" /></div>
                            <div class="margin-field" title="Derecha"><label for="pdf-margin-right">Der.</label><p-inputnumber inputId="pdf-margin-right" [(ngModel)]="pdfMarginRight" [min]="0" [max]="50" [useGrouping]="false" styleClass="margin-input" /></div>
                          </div>
                        </div>
                      </div>
                      @if (pdfPreviewUrl()) {
                        <div class="preview-actions">
                          <span class="preview-label">Vista previa</span>
                          <p-button
                            label="Cerrar"
                            icon="pi pi-times"
                            [text]="true"
                            severity="secondary"
                            size="small"
                            (onClick)="closePdfPreview()" />
                        </div>
                      }
                    </div>
                    @if (pdfPreviewUrl(); as url) {
                      <div class="pdf-preview-container">
                        <iframe [src]="sanitizedPdfPreviewUrl()" title="Vista previa del certificado" class="pdf-preview-iframe"></iframe>
                      </div>
                    }
                    <app-results-table
                      [groups]="result.valid_groups"
                      (generatePdfs)="onGeneratePdfs($event)"
                      (previewPdf)="onPreviewPdf($event)" />
                  }

                  @if (isGeneratingPdf()) {
                    <div class="pdf-generating">
                      <i class="pi pi-spin pi-spinner"></i>
                      <span>Generando PDFs...</span>
                    </div>
                  }

                  <div class="step-actions">
                    <p-button
                      label="Volver"
                      icon="pi pi-arrow-left"
                      severity="secondary"
                      [outlined]="true"
                      (onClick)="activateCallback(4)" />
                  </div>
                </div>
              </ng-template>
            </p-step-panel>
          </p-step-panels>
        </p-stepper>
      </div>
    </div>
  `,
  styles: `
    .page-header {
      margin-bottom: 24px;
      h1 {
        font-size: 22px;
        font-weight: 600;
        color: #0f172a;
        letter-spacing: -0.3px;
      }
      .page-subtitle {
        margin-top: 4px;
        font-size: 13px;
        color: #64748b;
      }
    }

    .stepper-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 24px;
      position: relative;
    }

    .stepper-card-actions {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
    }

    :host ::ng-deep .msg-block {
      display: block;
      margin-bottom: 16px;
    }

    .step-content {
      padding: 16px 0;
    }

    .upload-area {
      display: flex;
      justify-content: center;
      padding: 16px 0;
    }

    .empresa-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-top: 16px;
      padding: 8px 16px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 6px;
      font-size: 13px;
      color: #166534;
    }

    .step-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #f1f5f9;
    }

    .placeholder-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 48px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      color: #64748b;
      font-size: 14px;
    }

    .placeholder-hint {
      font-size: 12px;
      color: #94a3b8;
    }

    .empty-state {
      text-align: center;
      padding: 32px;
      color: #64748b;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .results-step-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 16px;
      padding: 12px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .pdf-options-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
    }
    .pdf-options {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .pdf-options label {
      font-size: 13px;
      color: #475569;
      white-space: nowrap;
    }
    .pdf-margins {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .margins-label {
      font-size: 12px;
      color: #475569;
      white-space: nowrap;
    }
    .margins-inputs {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .margin-field {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .margin-field label {
      font-size: 11px;
      color: #64748b;
      white-space: nowrap;
      width: 32px;
    }
    :host ::ng-deep .margin-input input {
      width: 44px !important;
      min-width: 44px !important;
      padding: 4px 6px;
      font-size: 12px;
    }
    .preview-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .preview-label {
      font-size: 13px;
      color: #64748b;
    }
    .pdf-preview-container {
      margin: 16px 0;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      background: #f8fafc;
    }
    .pdf-preview-iframe {
      display: block;
      width: 100%;
      min-height: 600px;
      height: 70vh;
      border: none;
    }

    .process-start {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      padding: 24px 0;
    }

    .process-summary {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      color: #334155;
      font-size: 15px;
    }

    .process-hint {
      font-size: 12px;
      color: #94a3b8;
      max-width: 400px;
      line-height: 1.5;
    }

    .process-complete {
      padding: 16px 0;
    }

    .result-summary {
      display: flex;
      justify-content: center;
      gap: 32px;
      padding: 16px 0;
    }

    .result-stat {
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #1e293b;
      font-family: 'SF Mono', 'Cascadia Code', monospace;
    }

    .result-stat--success .stat-value { color: #16a34a; }
    .result-stat--error .stat-value { color: #dc2626; }

    .stat-label {
      font-size: 12px;
      color: #64748b;
    }

    .pdf-success {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 6px;
      font-size: 13px;
      color: #166534;
      margin-bottom: 16px;

      i { font-size: 18px; color: #16a34a; }
    }

    .pdf-generating {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 16px;
      color: #3b82f6;
      font-size: 14px;
    }
  `,
})
export class CryptoMainPage {
  reportService = inject(CryptoReportService);
  private notify = inject(NotificationService);
  private sanitizer = inject(DomSanitizer);

  activeStep = signal(1);
  selectedThirdParties = signal<ThirdParty[]>([]);
  selectedTransactions = signal<RawTransaction[]>([]);
  isGeneratingPdf = signal(false);
  pdfSuccess = signal<string | null>(null);
  pdfPreviewUrl = signal<string | null>(null);

  pdfPageSizeKey: PdfPageSizeKey = 'letter';
  pdfPageSizeOptions = [
    { value: 'letter', label: PDF_PAGE_SIZES['letter'].label },
    { value: 'a4', label: PDF_PAGE_SIZES['a4'].label },
    { value: 'legal', label: PDF_PAGE_SIZES['legal'].label },
  ];

  /** Márgenes del PDF en mm (por defecto estándar 20) */
  pdfMarginTop = 20;
  pdfMarginRight = 20;
  pdfMarginBottom = 20;
  pdfMarginLeft = 20;

  getPageSizeMm(): { widthMm: number; heightMm: number } {
    const s = PDF_PAGE_SIZES[this.pdfPageSizeKey] ?? PDF_PAGE_SIZES['letter'];
    return { widthMm: s.widthMm, heightMm: s.heightMm };
  }

  getPdfMargins(): { top: number; right: number; bottom: number; left: number } {
    return {
      top: this.pdfMarginTop ?? 20,
      right: this.pdfMarginRight ?? 20,
      bottom: this.pdfMarginBottom ?? 20,
      left: this.pdfMarginLeft ?? 20,
    };
  }

  sanitizedPdfPreviewUrl = computed(() => {
    const url = this.pdfPreviewUrl();
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

  onStepChange(event: number | undefined) {
    if (event !== undefined) {
      this.activeStep.set(event);
      // Al volver al paso de selección de tercero, limpiar la selección para elegir de nuevo
      if (event === 2) {
        this.selectedThirdParties.set([]);
      }
    }
  }

  empresaInfo = computed(() => {
    const emp = this.reportService.empresa();
    return emp ? `${emp.nombre} (NIT: ${formatNit(emp.nit)})` : null;
  });

  filteredTransactions = computed(() => {
    const ids = new Set(this.selectedThirdParties().map(p => p.id));
    if (ids.size === 0) return [];
    return this.reportService.transactions().filter(t => ids.has(t.id));
  });

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

  async onGeneratePdfs(event: { selectedIds: string[]; year: string; includeDetails: boolean; firmanteId: number }) {
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

      // Backend prepara HTML; frontend convierte a PDF con jsPDF + html2canvas (como certificado-app)
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
      const pageSize = this.getPageSizeMm();
      const margins = this.getPdfMargins();
      for (let i = 0; i < prepared.items.length; i++) {
        const item = prepared.items[i];
        const blob = await this.htmlToPdfBlob(item.html, jsPDF, html2canvas, pageSize, margins);
        const base64 = await this.blobToBase64(blob);
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

  async onPreviewPdf(event: { selectedIds: string[]; year: string; includeDetails: boolean; firmanteId: number }) {
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

      const pageSize = this.getPageSizeMm();
      const margins = this.getPdfMargins();
      const blob = await this.htmlToPdfBlob(prepared.items[0].html, jsPDF, html2canvas, pageSize, margins);
      const url = URL.createObjectURL(blob);
      this.pdfPreviewUrl.set(url);
    } catch (err) {
      this.notify.error('Error en vista previa', String(err));
    }
  }

  private static readonly PAGE_BREAK_MARKER = '<div class="html2pdf__page-break" style="page-break-before: always;"></div>';

  /**
   * Genera un Blob PDF a partir del HTML. Si el HTML contiene el marcador de salto de página,
   * renderiza certificado y detalle por separado para que queden en hojas distintas.
   */
  private async htmlToPdfBlob(
    html: string,
    jsPDFClass: typeof jsPDF,
    html2canvasFn: (element: HTMLElement, options?: object) => Promise<HTMLCanvasElement>,
    pageSizeMm?: { widthMm: number; heightMm: number },
    marginsMm?: { top: number; right: number; bottom: number; left: number }
  ): Promise<Blob> {
    const size = pageSizeMm ?? { widthMm: 216, heightMm: 279 };
    const pageWidthMm = size.widthMm;
    const pageHeightMm = size.heightMm;
    const widthPx = Math.round((pageWidthMm / 216) * 794);
    const scalePxPerMm = widthPx / pageWidthMm;
    const m = marginsMm ?? { top: 20, right: 20, bottom: 20, left: 20 };
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
      const canvas = await html2canvasFn(wrapper, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      document.body.removeChild(wrapper);
      return canvas;
    };

    const idx = bodyContent.indexOf(CryptoMainPage.PAGE_BREAK_MARKER);
    const pdf = new jsPDFClass({ orientation: 'p', unit: 'mm', format: [pageWidthMm, pageHeightMm] as [number, number] });

    if (idx !== -1) {
      const certHtml = bodyContent.substring(0, idx).trim();
      const detailsHtml = bodyContent.substring(idx + CryptoMainPage.PAGE_BREAK_MARKER.length).trim();
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

  private blobToBase64(blob: Blob): Promise<string> {
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

interface PdfInstance {
  addImage(imgData: string, format: string, x: number, y: number, w: number, h: number): void;
  addPage(): void;
  output(type: 'blob'): Blob;
}
