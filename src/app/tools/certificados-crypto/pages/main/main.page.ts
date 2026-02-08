import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { Stepper, StepList, StepPanels, StepPanel, Step } from 'primeng/stepper';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import { CryptoReportService } from '../../services/crypto-report.service';
import { DataTableComponent } from '../../components/data-table/data-table.component';
import { ExcelUploadZoneComponent } from '../../components/excel-upload-zone/excel-upload-zone.component';
import { ProcessingProgressComponent } from '../../components/processing-progress/processing-progress.component';
import { ValidationErrorsComponent } from '../../components/validation-errors/validation-errors.component';
import { ResultsTableComponent } from '../../components/results-table/results-table.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { RawTransaction } from '../../models/raw-transaction.model';
import { ProcessedGroup } from '../../models/processing.model';

@Component({
  selector: 'app-crypto-main',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Stepper, StepList, StepPanels, StepPanel, Step,
    Button, Message, DataTableComponent,
    ExcelUploadZoneComponent,
    ProcessingProgressComponent, ValidationErrorsComponent,
    ResultsTableComponent,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Certificados Crypto</h1>
        <p class="page-subtitle">Genera certificados tributarios a partir de archivos Excel</p>
      </div>

      <div class="stepper-card">
        <p-stepper [value]="activeStep()" (valueChange)="onStepChange($event)" [linear]="true">
          <p-step-list>
            <p-step [value]="1">Cargar Excel</p-step>
            <p-step [value]="2">Revisar Datos</p-step>
            <p-step [value]="3">Procesamiento</p-step>
            <p-step [value]="4">Resultados</p-step>
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

            <!-- Step 2: Revisar Datos -->
            <p-step-panel [value]="2">
              <ng-template #content let-activateCallback="activateCallback">
                <div class="step-content">
                  @if (reportService.transactions().length > 0) {
                    <app-data-table
                      [transactions]="reportService.transactions()"
                      [(selected)]="selectedTransactions" />

                    <div class="step-actions">
                      <p-button
                        label="Volver"
                        icon="pi pi-arrow-left"
                        severity="secondary"
                        [outlined]="true"
                        (onClick)="activateCallback(1)" />
                      <p-button
                        label="Generar Reportes"
                        icon="pi pi-cog"
                        [disabled]="selectedTransactions().length === 0"
                        [badge]="selectedTransactions().length.toString()"
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

            <!-- Step 3: Procesamiento -->
            <p-step-panel [value]="3">
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
                        (onClick)="activateCallback(2)" />
                      @if (result.total_valid > 0) {
                        <p-button
                          label="Ver Resultados"
                          icon="pi pi-arrow-right"
                          (onClick)="activateCallback(4)" />
                      }
                    </div>
                  }

                  @if (reportService.error() && !reportService.isProcessing()) {
                    <p-message severity="error" [text]="reportService.error()!" styleClass="msg-block" />
                  }
                </div>
              </ng-template>
            </p-step-panel>

            <!-- Step 4: Resultados -->
            <p-step-panel [value]="4">
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
                    <app-results-table
                      [groups]="result.valid_groups"
                      (generatePdfs)="onGeneratePdfs($event)" />
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
                      (onClick)="activateCallback(3)" />
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

  activeStep = signal(1);
  selectedTransactions = signal<RawTransaction[]>([]);
  isGeneratingPdf = signal(false);
  pdfSuccess = signal<string | null>(null);

  onStepChange(event: number | undefined) {
    if (event !== undefined) {
      this.activeStep.set(event);
    }
  }

  empresaInfo = computed(() => {
    const emp = this.reportService.empresa();
    return emp ? `${emp.nombre} (NIT: ${emp.nit})` : null;
  });

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
    const ids = [...new Set(this.selectedTransactions().map(t => t.id))];

    try {
      const result = await this.reportService.processSelected(txns, ids);
      if (result.total_valid > 0) {
        activateCallback(4);
      }
    } catch {
      // Error is already stored in the service
    }
  }

  async onGeneratePdfs(event: { selectedIds: string[]; year: string; includeDetails: boolean }) {
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
      const pdfResult = await invoke<{ generated_files: string[]; total_files: number; output_dir: string }>(
        'generate_pdfs',
        {
          groups: selectedGroups,
          empresaNit: empresa.nit,
          year: event.year,
          outputDir: outputDir as string,
          includeDetails: event.includeDetails,
        }
      );

      this.pdfSuccess.set(`Se generaron ${pdfResult.total_files} archivo(s) en ${pdfResult.output_dir}`);
      this.notify.success('PDFs generados', `${pdfResult.total_files} archivo(s) creados`);
    } catch (err) {
      this.notify.error('Error generando PDFs', String(err));
    } finally {
      this.isGeneratingPdf.set(false);
    }
  }
}
