import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import { DataService } from '../../services/data.service';
import { DateRanges, ValidationResult, DatasetMetadata } from '../../models/interfaces';

Chart.register(...registerables);

@Component({
  selector: 'app-date-ranges',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatInputModule,
    MatFormFieldModule,
    MatNativeDateModule,
    MatSnackBarModule,
    MatStepperModule,
    MatProgressBarModule
  ],
  template: `
    <div class="container">
      <mat-stepper orientation="horizontal" [selectedIndex]="1">
        <mat-step label="Upload Dataset" state="done">
        </mat-step>
        <mat-step label="Date Ranges" state="edit">
        </mat-step>
        <mat-step label="Model Training">
        </mat-step>
        <mat-step label="Real-Time Simulation">
        </mat-step>
      </mat-stepper>

      <div class="content">
        <h1>Step 2 of 4: Define Date Ranges</h1>
        <p>Configure sequential, non-overlapping time periods for training, testing, and simulation.</p>

        <!-- Dataset Constraints Info -->
        <mat-card *ngIf="datasetMetadata" class="constraints-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>info</mat-icon>
              Dataset Constraints
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="constraints-grid">
              <div class="constraint-item">
                <strong>Available Date Range:</strong>
                <span>{{ formatDateRange() }}</span>
              </div>
              <div class="constraint-item">
                <strong>Total Records:</strong>
                <span>{{ datasetMetadata.recordCount | number }} records</span>
              </div>
              <div class="constraint-item">
                <strong>Pass Rate:</strong>
                <span>{{ (datasetMetadata.passRate * 100).toFixed(1) }}% ({{ datasetMetadata.passCount }} passes, {{ datasetMetadata.failCount }} fails)</span>
              </div>
              <div class="constraint-item">
                <strong>Requirements:</strong>
                <span>All date ranges must be within the available range and be continuous (no gaps or overlaps)</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <form [formGroup]="dateRangeForm" class="date-range-form">
          <!-- Training Period -->
          <mat-card class="period-card training">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>school</mat-icon>
                Training Period
              </mat-card-title>
              <mat-card-subtitle>Data used to train the ML model</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="date-inputs">
                <mat-form-field appearance="outline">
                  <mat-label>Start Date</mat-label>
                  <input matInput [matDatepicker]="trainingStartPicker" 
                         formControlName="trainingStart" readonly>
                  <mat-datepicker-toggle matSuffix [for]="trainingStartPicker"></mat-datepicker-toggle>
                  <mat-datepicker #trainingStartPicker></mat-datepicker>
                </mat-form-field>
                
                <mat-form-field appearance="outline">
                  <mat-label>End Date</mat-label>
                  <input matInput [matDatepicker]="trainingEndPicker" 
                         formControlName="trainingEnd" readonly>
                  <mat-datepicker-toggle matSuffix [for]="trainingEndPicker"></mat-datepicker-toggle>
                  <mat-datepicker #trainingEndPicker></mat-datepicker>
                </mat-form-field>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Testing Period -->
          <mat-card class="period-card testing">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>quiz</mat-icon>
                Testing Period
              </mat-card-title>
              <mat-card-subtitle>Data used to evaluate model performance</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="date-inputs">
                <mat-form-field appearance="outline">
                  <mat-label>Start Date</mat-label>
                  <input matInput [matDatepicker]="testingStartPicker" 
                         formControlName="testingStart" readonly>
                  <mat-datepicker-toggle matSuffix [for]="testingStartPicker"></mat-datepicker-toggle>
                  <mat-datepicker #testingStartPicker></mat-datepicker>
                </mat-form-field>
                
                <mat-form-field appearance="outline">
                  <mat-label>End Date</mat-label>
                  <input matInput [matDatepicker]="testingEndPicker" 
                         formControlName="testingEnd" readonly>
                  <mat-datepicker-toggle matSuffix [for]="testingEndPicker"></mat-datepicker-toggle>
                  <mat-datepicker #testingEndPicker></mat-datepicker>
                </mat-form-field>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Simulation Period -->
          <mat-card class="period-card simulation">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>play_circle</mat-icon>
                Simulation Period
              </mat-card-title>
              <mat-card-subtitle>Data used for real-time prediction simulation</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="date-inputs">
                <mat-form-field appearance="outline">
                  <mat-label>Start Date</mat-label>
                  <input matInput [matDatepicker]="simulationStartPicker" 
                         formControlName="simulationStart" readonly>
                  <mat-datepicker-toggle matSuffix [for]="simulationStartPicker"></mat-datepicker-toggle>
                  <mat-datepicker #simulationStartPicker></mat-datepicker>
                </mat-form-field>
                
                <mat-form-field appearance="outline">
                  <mat-label>End Date</mat-label>
                  <input matInput [matDatepicker]="simulationEndPicker" 
                         formControlName="simulationEnd" readonly>
                  <mat-datepicker-toggle matSuffix [for]="simulationEndPicker"></mat-datepicker-toggle>
                  <mat-datepicker #simulationEndPicker></mat-datepicker>
                </mat-form-field>
              </div>
            </mat-card-content>
          </mat-card>
        </form>

        <div class="validate-section">
          <button mat-raised-button 
                  color="accent" 
                  [disabled]="!dateRangeForm.valid || validating"
                  (click)="validateRanges()">
            <mat-icon>check_circle</mat-icon>
            Validate Ranges
          </button>

          <div *ngIf="validating" class="validating">
            <mat-progress-bar mode="indeterminate"></mat-progress-bar>
            <p>Validating date ranges...</p>
          </div>

          <div *ngIf="validationResult" class="validation-result" 
               [class.valid]="validationResult.isValid" 
               [class.invalid]="!validationResult.isValid">
            <mat-icon>{{ validationResult.isValid ? 'check_circle' : 'error' }}</mat-icon>
            <div>
              <span *ngIf="validationResult.message">{{ validationResult.message }}</span>
              <ul *ngIf="validationResult.errors && validationResult.errors.length > 0">
                <li *ngFor="let error of validationResult.errors">{{ error }}</li>
              </ul>
            </div>
          </div>

          <!-- Data Count Cards (shown after successful validation) -->
          <div *ngIf="validationResult && validationResult.isValid && validationResult.dataDistribution" 
               class="data-counts-section">
            <h3>Data Distribution Summary</h3>
            <div class="data-cards">
              <mat-card class="data-count-card training">
                <mat-card-content>
                  <div class="count-header">
                    <mat-icon>school</mat-icon>
                    <span class="label">Training Data</span>
                  </div>
                  <div class="count-value">{{ validationResult.dataDistribution.trainingRecords | number }}</div>
                  <div class="count-subtitle">records</div>
                </mat-card-content>
              </mat-card>

              <mat-card class="data-count-card testing">
                <mat-card-content>
                  <div class="count-header">
                    <mat-icon>quiz</mat-icon>
                    <span class="label">Testing Data</span>
                  </div>
                  <div class="count-value">{{ validationResult.dataDistribution.testingRecords | number }}</div>
                  <div class="count-subtitle">records</div>
                </mat-card-content>
              </mat-card>

              <mat-card class="data-count-card simulation">
                <mat-card-content>
                  <div class="count-header">
                    <mat-icon>play_circle</mat-icon>
                    <span class="label">Simulation Data</span>
                  </div>
                  <div class="count-value">{{ validationResult.dataDistribution.simulationRecords | number }}</div>
                  <div class="count-subtitle">records</div>
                </mat-card-content>
              </mat-card>
            </div>
          </div>
        </div>

        <!-- Monthly Distribution Chart -->
        <mat-card *ngIf="validationResult && validationResult.isValid && validationResult.dataDistribution" 
                  class="monthly-chart-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>bar_chart</mat-icon>
              Monthly Data Distribution
            </mat-card-title>
            <mat-card-subtitle>Records distribution across months for each data type</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="chart-container monthly-chart-container">
              <canvas #monthlyChart></canvas>
            </div>
          </mat-card-content>
        </mat-card>

        <div class="navigation-buttons">
          <button mat-raised-button (click)="navigatePrevious()">Previous</button>
          <button mat-raised-button 
                  color="primary" 
                  [disabled]="!validationResult || !validationResult.isValid"
                  (click)="navigateNext()">
            Next
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }

    .content {
      margin-top: 30px;
    }

    .date-range-form {
      margin: 20px 0;
    }

    .constraints-card {
      margin: 20px 0;
      background: #f8f9fa;
      border-left: 4px solid #2196f3;
    }

    .constraints-card mat-card-header mat-icon {
      margin-right: 10px;
      color: #2196f3;
    }

    .constraints-grid {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .constraint-item {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .constraint-item strong {
      color: #333;
      font-size: 0.9em;
    }

    .constraint-item span {
      color: #666;
      font-size: 0.85em;
    }

    .period-card {
      margin: 20px 0;
      border-left: 4px solid;
    }

    .period-card.training {
      border-left-color: #4caf50;
    }

    .period-card.testing {
      border-left-color: #ff9800;
    }

    .period-card.simulation {
      border-left-color: #2196f3;
    }

    .period-card mat-card-header mat-icon {
      margin-right: 10px;
    }

    .date-inputs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 20px;
    }

    .record-count {
      margin-top: 10px;
      padding: 10px;
      background: #f5f5f5;
      border-radius: 4px;
      font-weight: 500;
    }

    .validate-section {
      margin: 30px 0;
      text-align: center;
    }

    .validating {
      margin: 20px 0;
    }

    .validation-result {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin: 20px 0;
      padding: 15px;
      border-radius: 8px;
      font-weight: 500;
    }

    .validation-result.valid {
      background: #e8f5e8;
      color: #2e7d2e;
    }

    .validation-result.invalid {
      background: #ffebee;
      color: #c62828;
    }

    .chart-container {
      position: relative;
      height: 300px;
      margin: 20px 0;
    }

    .monthly-chart-container {
      height: 400px;
      overflow-x: auto;
    }

    .data-counts-section {
      margin: 30px 0;
    }

    .data-counts-section h3 {
      color: #333;
      margin-bottom: 20px;
      font-weight: 500;
    }

    .data-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .data-count-card {
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .data-count-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }

    .data-count-card.training {
      border-left: 4px solid #4CAF50;
    }

    .data-count-card.testing {
      border-left: 4px solid #FF9800;
    }

    .data-count-card.simulation {
      border-left: 4px solid #2196F3;
    }

    .count-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
    }

    .count-header mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .count-header .label {
      font-weight: 500;
      color: #666;
    }

    .count-value {
      font-size: 2.5em;
      font-weight: bold;
      color: #333;
      margin: 10px 0 5px 0;
    }

    .count-subtitle {
      color: #999;
      font-size: 0.9em;
    }

    .monthly-chart-card {
      margin: 30px 0;
    }

    .monthly-chart-card mat-card-header mat-icon {
      margin-right: 8px;
    }

    .navigation-buttons {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
    }
  `]
})
export class DateRangesComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('monthlyChart', { static: false }) monthlyChartRef!: ElementRef<HTMLCanvasElement>;
  
  dateRangeForm: FormGroup;
  validating = false;
  validationResult: ValidationResult | null = null;
  datasetMetadata: DatasetMetadata | null = null;
  private monthlyChart: Chart | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private dataService: DataService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.dateRangeForm = this.formBuilder.group({
      trainingStart: ['', Validators.required],
      trainingEnd: ['', Validators.required],
      testingStart: ['', Validators.required],
      testingEnd: ['', Validators.required],
      simulationStart: ['', Validators.required],
      simulationEnd: ['', Validators.required]
    });
  }

  ngOnInit() {
    // Load dataset metadata first
    this.dataService.getDatasetMetadata().subscribe({
      next: (metadata) => {
        this.datasetMetadata = metadata;
        this.setDefaultDateRanges();
      },
      error: (error) => {
        console.error('Error loading dataset metadata:', error);
        this.snackBar.open('Error loading dataset metadata. Please upload a dataset first.', 'Close', { duration: 5000 });
        // Set fallback default dates
        this.setFallbackDateRanges();
      }
    });
  }

  ngAfterViewInit() {
    // Chart will be created after validation
  }

  private setDefaultDateRanges() {
    if (!this.datasetMetadata) {
      this.setFallbackDateRanges();
      return;
    }

    const datasetStart = new Date(this.datasetMetadata.startDate);
    const datasetEnd = new Date(this.datasetMetadata.endDate);
    
    // Calculate total days
    const totalDays = Math.ceil((datasetEnd.getTime() - datasetStart.getTime()) / (1000 * 60 * 60 * 24));
    
    // Split the dataset into 60% training, 20% testing, 20% simulation
    const trainingDays = Math.floor(totalDays * 0.6);
    const testingDays = Math.floor(totalDays * 0.2);
    
    const trainingStart = new Date(datasetStart);
    const trainingEnd = new Date(datasetStart);
    trainingEnd.setDate(trainingEnd.getDate() + trainingDays);
    
    const testingStart = new Date(trainingEnd);
    const testingEnd = new Date(testingStart);
    testingEnd.setDate(testingEnd.getDate() + testingDays);
    
    const simulationStart = new Date(testingEnd);
    const simulationEnd = new Date(datasetEnd);

    this.dateRangeForm.patchValue({
      trainingStart: trainingStart,
      trainingEnd: trainingEnd,
      testingStart: testingStart,
      testingEnd: testingEnd,
      simulationStart: simulationStart,
      simulationEnd: simulationEnd
    });
  }

  private setFallbackDateRanges() {
    // Set default date ranges (fallback when no metadata available)
    const today = new Date();
    const oneMonthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twoMonthsAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
    const threeMonthsAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);

    this.dateRangeForm.patchValue({
      trainingStart: threeMonthsAgo,
      trainingEnd: twoMonthsAgo,
      testingStart: twoMonthsAgo,
      testingEnd: oneMonthAgo,
      simulationStart: oneMonthAgo,
      simulationEnd: today
    });
  }

  validateRanges() {
    if (!this.dateRangeForm.valid) return;

    const formValue = this.dateRangeForm.value;
    const dateRanges: DateRanges = {
      training: {
        start: formValue.trainingStart.toISOString(),
        end: formValue.trainingEnd.toISOString()
      },
      testing: {
        start: formValue.testingStart.toISOString(),
        end: formValue.testingEnd.toISOString()
      },
      simulation: {
        start: formValue.simulationStart.toISOString(),
        end: formValue.simulationEnd.toISOString()
      }
    };

    this.validating = true;
    this.dataService.validateDateRanges(dateRanges).subscribe({
      next: (result) => {
        this.validationResult = result;
        this.validating = false;
        
        if (result.isValid) {
          // Create monthly chart after a small delay to ensure DOM is ready
          setTimeout(() => {
            this.createMonthlyChart();
          }, 100);
          this.snackBar.open('Date ranges validated successfully!', 'Close', { duration: 3000 });
        } else {
          this.snackBar.open('Validation failed: ' + (result.message || result.errors.join(', ')), 'Close', { duration: 5000 });
        }
      },
      error: (error) => {
        this.validating = false;
        this.snackBar.open('Error validating ranges: ' + error.message, 'Close', { duration: 5000 });
      }
    });
  }

  private createMonthlyChart() {
    if (!this.validationResult?.dataDistribution?.monthlyDistribution || !this.monthlyChartRef) {
      return;
    }

    // Destroy existing chart if it exists
    if (this.monthlyChart) {
      this.monthlyChart.destroy();
    }

    const ctx = this.monthlyChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const monthlyData = this.validationResult.dataDistribution.monthlyDistribution;
    const labels = monthlyData.map(m => m.monthName);

    const config: ChartConfiguration = {
      type: 'bar' as ChartType,
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Training',
            data: monthlyData.map(m => m.trainingCount),
            backgroundColor: '#4CAF50',
            borderColor: '#388E3C',
            borderWidth: 1
          },
          {
            label: 'Testing',
            data: monthlyData.map(m => m.testingCount),
            backgroundColor: '#FF9800',
            borderColor: '#F57C00',
            borderWidth: 1
          },
          {
            label: 'Simulation',
            data: monthlyData.map(m => m.simulationCount),
            backgroundColor: '#2196F3',
            borderColor: '#1976D2',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: false,
            title: {
              display: true,
              text: 'Month'
            }
          },
          y: {
            stacked: false,
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Records'
            }
          }
        },
        plugins: {
          title: {
            display: true,
            text: 'Monthly Data Distribution'
          },
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              footer: (tooltipItems) => {
                const dataIndex = tooltipItems[0].dataIndex;
                const monthData = monthlyData[dataIndex];
                return `Total: ${monthData.totalCount} records`;
              }
            }
          }
        },
        interaction: {
          mode: 'index',
          intersect: false
        }
      }
    };

    this.monthlyChart = new Chart(ctx, config);
  }

  navigatePrevious() {
    this.router.navigate(['/upload']);
  }

  navigateNext() {
    if (this.validationResult && this.validationResult.isValid) {
      this.router.navigate(['/training']);
    }
  }

  formatDateRange(): string {
    if (!this.datasetMetadata) return '';
    const start = new Date(this.datasetMetadata.startDate).toLocaleDateString();
    const end = new Date(this.datasetMetadata.endDate).toLocaleDateString();
    return `${start} - ${end}`;
  }

  ngOnDestroy() {
    // Clean up charts
    if (this.monthlyChart) {
      this.monthlyChart.destroy();
    }
  }
}
