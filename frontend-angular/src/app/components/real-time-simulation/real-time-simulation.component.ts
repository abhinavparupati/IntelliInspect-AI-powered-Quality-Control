import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import { Subscription } from 'rxjs';
import { DataService } from '../../services/data.service';
import { PredictionResult, SimulationStatus, DateRanges } from '../../models/interfaces';

Chart.register(...registerables);

@Component({
  selector: 'app-real-time-simulation',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSnackBarModule,
    MatStepperModule
  ],
  template: `
    <div class="container">
      <mat-stepper orientation="horizontal" [selectedIndex]="3">
        <mat-step label="Upload Dataset" state="done">
        </mat-step>
        <mat-step label="Date Ranges" state="done">
        </mat-step>
        <mat-step label="Model Training" state="done">
        </mat-step>
        <mat-step label="Real-Time Simulation" state="edit">
        </mat-step>
      </mat-stepper>

      <div class="content">
        <h1>Step 4 of 4: Real-Time Prediction Simulation</h1>
        <p>Simulate real-time model inference on production line data with live updates.</p>

        <!-- Simulation Info -->
        <mat-card class="info-card" *ngIf="simulationStatus.expectedCount || dateRanges || currentSimulationData">
          <mat-card-content>
            <div class="info-content">
              <mat-icon color="primary">info</mat-icon>
              <div>
                <h4>Real Data Simulation</h4>
                <p *ngIf="simulationStatus.expectedCount">
                  This simulation will process <strong>{{ simulationStatus.expectedCount }}</strong> real data records from your uploaded dataset.
                </p>
                <p *ngIf="dateRanges" class="date-range-info">
                  <strong>Simulation Period:</strong> 
                  {{ formatDate(dateRanges.simulation.start) }} to {{ formatDate(dateRanges.simulation.end) }}
                  ({{ calculateDaysBetween(dateRanges.simulation.start, dateRanges.simulation.end) }} days)
                </p>
                <div *ngIf="currentSimulationData" class="data-info">
                  <p><strong>Available Records:</strong> {{ currentSimulationData.totalRecords }} actual data rows in simulation period</p>
                  <p class="data-description">Each prediction uses real feature values from your dataset, providing authentic model performance evaluation.</p>
                </div>
                <p class="scope-explanation">
                  The model will make predictions on actual data that falls within your selected simulation date range.
                </p>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Control Panel -->
        <mat-card class="control-panel">
          <mat-card-content>
            <div class="control-content">
              <div class="simulation-controls">
                <button mat-raised-button 
                        color="primary" 
                        [disabled]="simulationStatus.isRunning"
                        (click)="startSimulation()">
                  <mat-icon>play_arrow</mat-icon>
                  Start Simulation
                </button>
                
                <button mat-raised-button 
                        color="warn" 
                        [disabled]="!simulationStatus.isRunning"
                        (click)="stopSimulation()">
                  <mat-icon>stop</mat-icon>
                  Stop Simulation
                </button>
              </div>
              
              <div class="simulation-status" [class.running]="simulationStatus.isRunning">
                <mat-icon>{{ simulationStatus.isRunning ? 'radio_button_checked' : 'radio_button_unchecked' }}</mat-icon>
                <span>{{ simulationStatus.isRunning ? 'Simulation Running' : 'Simulation Stopped' }}</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Live Statistics -->
        <div class="stats-grid">
          <mat-card class="stat-card total">
            <mat-card-content>
              <div class="stat-content">
                <mat-icon>assessment</mat-icon>
                <div>
                  <h3>Total Predictions</h3>
                  <p class="stat-value">
                    {{ simulationStatus.totalPredictions }}
                    <span *ngIf="simulationStatus.expectedCount" class="progress-text">
                      / {{ simulationStatus.expectedCount }}
                    </span>
                  </p>
                  <div *ngIf="simulationStatus.expectedCount" class="progress-bar">
                    <div class="progress-fill" 
                         [style.width.%]="(simulationStatus.totalPredictions / simulationStatus.expectedCount) * 100">
                    </div>
                  </div>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card pass">
            <mat-card-content>
              <div class="stat-content">
                <mat-icon>check_circle</mat-icon>
                <div>
                  <h3>Pass Count</h3>
                  <p class="stat-value">{{ simulationStatus.passCount }}</p>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card fail">
            <mat-card-content>
              <div class="stat-content">
                <mat-icon>cancel</mat-icon>
                <div>
                  <h3>Fail Count</h3>
                  <p class="stat-value">{{ simulationStatus.failCount }}</p>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card confidence">
            <mat-card-content>
              <div class="stat-content">
                <mat-icon>trending_up</mat-icon>
                <div>
                  <h3>Avg Confidence</h3>
                  <p class="stat-value">{{ (simulationStatus.averageConfidence * 100) | number:'1.1-1' }}%</p>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Real-Time Charts -->
        <div class="charts-row">
          <mat-card class="chart-card">
            <mat-card-header>
              <mat-card-title>Real-Time Quality Predictions</mat-card-title>
              <mat-card-subtitle>Quality Score vs Date</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="chart-container">
                <canvas #qualityChart></canvas>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="chart-card">
            <mat-card-header>
              <mat-card-title>Prediction Confidence Distribution</mat-card-title>
              <mat-card-subtitle>Pass/Fail Breakdown</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="chart-container">
                <canvas #confidenceChart></canvas>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Live Predictions Table -->
        <mat-card class="table-card">
          <mat-card-header>
            <mat-card-title>Live Predictions Stream</mat-card-title>
            <mat-card-subtitle>Real-time prediction results</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="table-container">
              <table mat-table [dataSource]="predictionsDataSource" class="predictions-table">
                <ng-container matColumnDef="sampleId">
                  <th mat-header-cell *matHeaderCellDef>Sample ID</th>
                  <td mat-cell *matCellDef="let prediction">{{ prediction.sampleId }}</td>
                </ng-container>

                <ng-container matColumnDef="timestamp">
                  <th mat-header-cell *matHeaderCellDef>Date</th>
                  <td mat-cell *matCellDef="let prediction">{{ formatTimestamp(prediction.timestamp) }}</td>
                </ng-container>

                <ng-container matColumnDef="prediction">
                  <th mat-header-cell *matHeaderCellDef>Prediction</th>
                  <td mat-cell *matCellDef="let prediction">
                    <span [class]="'prediction-' + prediction.prediction.toLowerCase()">
                      {{ prediction.prediction }}
                    </span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="confidence">
                  <th mat-header-cell *matHeaderCellDef>Confidence</th>
                  <td mat-cell *matCellDef="let prediction">
                    <span [class]="getConfidenceClass(prediction.confidence)">
                      {{ (prediction.confidence * 100) | number:'1.1-1' }}%
                    </span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="actualResponse">
                  <th mat-header-cell *matHeaderCellDef>Actual Response</th>
                  <td mat-cell *matCellDef="let prediction">
                    <span [class]="'prediction-' + (prediction.actualResponse || 'unknown').toLowerCase()">
                      {{ prediction.actualResponse || 'Unknown' }}
                    </span>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
              </table>
            </div>
          </mat-card-content>
        </mat-card>

        <div class="navigation-buttons">
          <button mat-raised-button (click)="navigatePrevious()">Previous</button>
          <button mat-raised-button 
                  color="primary" 
                  (click)="restartWorkflow()">
            Start New Analysis
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }

    .content {
      margin-top: 30px;
    }

    .info-card {
      margin: 20px 0;
      background: #e3f2fd;
      border-left: 4px solid #2196f3;
    }

    .info-content {
      display: flex;
      align-items: flex-start;
      gap: 15px;
    }

    .info-content h4 {
      margin: 0 0 8px 0;
      color: #1976d2;
    }

    .info-content p {
      margin: 0 0 8px 0;
      color: #424242;
    }

    .date-range-info {
      font-size: 0.9em;
      padding: 8px;
      background: #f5f5f5;
      border-radius: 4px;
      margin: 8px 0;
    }

    .scope-explanation {
      font-style: italic;
      color: #666;
    }

    .data-info {
      background: #f8f9ff;
      border-left: 3px solid #2196f3;
      padding: 10px;
      margin: 10px 0;
      border-radius: 4px;
    }

    .data-description {
      font-size: 0.9em;
      color: #555;
    }

    .control-panel {
      margin: 20px 0;
    }

    .control-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
    }

    .simulation-controls {
      display: flex;
      gap: 15px;
    }

    .simulation-status {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 500;
    }

    .simulation-status.running {
      color: #4caf50;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 30px 0;
    }

    .stat-card {
      border-left: 4px solid;
    }

    .stat-card.total {
      border-left-color: #3f51b5;
    }

    .stat-card.pass {
      border-left-color: #4caf50;
    }

    .stat-card.fail {
      border-left-color: #f44336;
    }

    .stat-card.confidence {
      border-left-color: #ff9800;
    }

    .stat-content {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 10px;
    }

    .stat-content mat-icon {
      font-size: 32px;
      height: 32px;
      width: 32px;
      color: #3f51b5;
    }

    .stat-content h3 {
      margin: 0 0 5px 0;
      font-size: 0.9em;
      color: #666;
    }

    .stat-value {
      margin: 0;
      font-size: 1.8em;
      font-weight: bold;
      color: #333;
    }

    .progress-text {
      font-size: 0.6em;
      color: #666;
      margin-left: 5px;
    }

    .progress-bar {
      width: 100%;
      height: 4px;
      background-color: #e0e0e0;
      border-radius: 2px;
      overflow: hidden;
      margin-top: 8px;
    }

    .progress-fill {
      height: 100%;
      background-color: #3f51b5;
      transition: width 0.3s ease;
    }

    .charts-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 30px 0;
    }

    .chart-card {
      min-height: 400px;
    }

    .chart-container {
      position: relative;
      height: 300px;
      margin: 20px 0;
    }

    .table-card {
      margin: 30px 0;
    }

    .table-container {
      max-height: 400px;
      overflow-y: auto;
    }

    .predictions-table {
      width: 100%;
    }

    .prediction-pass {
      color: #4caf50;
      font-weight: bold;
    }

    .prediction-fail {
      color: #f44336;
      font-weight: bold;
    }

    .confidence-high {
      color: #4caf50;
      font-weight: bold;
    }

    .confidence-medium {
      color: #ff9800;
      font-weight: bold;
    }

    .confidence-low {
      color: #f44336;
      font-weight: bold;
    }

    .navigation-buttons {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
    }

    @media (max-width: 768px) {
      .charts-row {
        grid-template-columns: 1fr;
      }
      
      .control-content {
        flex-direction: column;
        gap: 20px;
      }
    }

    /* Error snackbar styling */
    ::ng-deep .error-snackbar {
      background-color: #f44336 !important;
      color: white !important;
    }

    ::ng-deep .error-snackbar .mat-snack-bar-action {
      color: white !important;
    }
  `]
})
export class RealTimeSimulationComponent implements OnInit, OnDestroy {
  @ViewChild('qualityChart', { static: false }) qualityChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('confidenceChart', { static: false }) confidenceChartRef!: ElementRef<HTMLCanvasElement>;

  simulationStatus: SimulationStatus = {
    isRunning: false,
    totalPredictions: 0,
    passCount: 0,
    failCount: 0,
    averageConfidence: 0
  };

  predictions: PredictionResult[] = [];
  predictionsDataSource = new MatTableDataSource<PredictionResult>();
  displayedColumns = ['sampleId', 'timestamp', 'prediction', 'confidence', 'actualResponse'];
  
  dateRanges: DateRanges | null = null;
  currentSimulationData: any = null;

  private subscriptions: Subscription[] = [];
  private qualityChart: Chart | null = null;
  private confidenceChart: Chart | null = null;

  constructor(
    private dataService: DataService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  @HostListener('window:beforeunload', ['$event'])
  beforeUnloadHandler(event: any): string | undefined {
    // Stop simulation if it's running when user tries to leave/refresh page
    if (this.simulationStatus.isRunning) {
      this.dataService.stopSimulation().subscribe();
      // Return a message to show confirmation dialog
      event.returnValue = 'Simulation is running. Are you sure you want to leave?';
      return 'Simulation is running. Are you sure you want to leave?';
    }
    return undefined;
  }

  ngOnInit() {
    // Reset simulation state when component initializes (handles page refresh)
    this.dataService.resetSimulation().subscribe({
      next: () => {
        console.log('Simulation state reset on component initialization');
      },
      error: (error) => {
        console.error('Error resetting simulation state:', error);
      }
    });

    // Load validated date ranges
    this.dataService.getValidatedDateRanges().subscribe({
      next: (dateRanges) => {
        this.dateRanges = dateRanges;
      },
      error: (error) => {
        console.error('Error loading date ranges:', error);
      }
    });

    // Load current simulation data
    this.dataService.getCurrentSimulationData().subscribe({
      next: (data) => {
        this.currentSimulationData = data;
      },
      error: (error) => {
        console.error('Error loading simulation data:', error);
      }
    });

    // Subscribe to prediction stream
    this.subscriptions.push(
      this.dataService.predictionStream$.subscribe(prediction => {
        this.addPrediction(prediction);
      })
    );

    // Subscribe to simulation status
    this.subscriptions.push(
      this.dataService.simulationStatus$.subscribe(status => {
        this.simulationStatus = status;
      })
    );

    // Initialize charts
    setTimeout(() => {
      this.initializeCharts();
    }, 100);
  }

  ngOnDestroy() {
    // Stop simulation if it's running
    if (this.simulationStatus.isRunning) {
      this.dataService.stopSimulation().subscribe({
        next: () => {
          console.log('Simulation stopped during component destruction');
        },
        error: (error) => {
          console.error('Error stopping simulation during component destruction:', error);
        }
      });
    }

    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Destroy charts
    if (this.qualityChart) {
      this.qualityChart.destroy();
    }
    if (this.confidenceChart) {
      this.confidenceChart.destroy();
    }
  }

  startSimulation() {
    console.log('Starting simulation...');
    this.dataService.startSimulation().subscribe({
      next: () => {
        console.log('Simulation started successfully');
        this.snackBar.open('Real data simulation started! Data will update in real-time.', 'Close', { duration: 3000 });
      },
      error: (error) => {
        console.error('Error starting simulation:', error);
        
        // Extract error message from response
        let errorMessage = 'Error starting simulation';
        if (error.error && typeof error.error === 'string') {
          errorMessage = error.error;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        this.snackBar.open(errorMessage, 'Close', { 
          duration: 8000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  stopSimulation() {
    this.dataService.stopSimulation().subscribe({
      next: () => {
        this.snackBar.open('Real data simulation stopped!', 'Close', { duration: 3000 });
      },
      error: (error) => {
        this.snackBar.open('Error stopping simulation: ' + error.message, 'Close', { duration: 5000 });
      }
    });
  }

  private addPrediction(prediction: PredictionResult) {
    this.predictions.unshift(prediction);
    if (this.predictions.length > 50) {
      this.predictions = this.predictions.slice(0, 50);
    }

    this.predictionsDataSource.data = [...this.predictions];

    // Update charts
    this.updateCharts();
  }

  private initializeCharts() {
    this.createQualityChart();
    this.createConfidenceChart();
  }

  private createQualityChart() {
    if (!this.qualityChartRef) return;

    const ctx = this.qualityChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'line' as ChartType,
      data: {
        labels: [],
        datasets: [{
          label: 'Quality Score',
          data: [],
          borderColor: '#3f51b5',
          backgroundColor: 'rgba(63, 81, 181, 0.1)',
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Date'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Quality Score'
            },
            min: 0,
            max: 1
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    };

    this.qualityChart = new Chart(ctx, config);
  }

  private createConfidenceChart() {
    if (!this.confidenceChartRef) return;

    const ctx = this.confidenceChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'doughnut' as ChartType,
      data: {
        labels: ['Pass', 'Fail'],
        datasets: [{
          data: [0, 0],
          backgroundColor: ['#4caf50', '#f44336']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    };

    this.confidenceChart = new Chart(ctx, config);
  }

  private updateCharts() {
    if (this.qualityChart && this.predictions.length > 0) {
      const labels = this.predictions.slice(0, 20).reverse().map(p => 
        this.formatDateForChart(p.timestamp)
      );
      const data = this.predictions.slice(0, 20).reverse().map(p => p.confidence);

      this.qualityChart.data.labels = labels;
      this.qualityChart.data.datasets[0].data = data;
      this.qualityChart.update();
    }

    if (this.confidenceChart) {
      this.confidenceChart.data.datasets[0].data = [
        this.simulationStatus.passCount,
        this.simulationStatus.failCount
      ];
      this.confidenceChart.update();
    }
  }

  getConfidenceClass(confidence: number): string {
    if (confidence >= 0.8) return 'confidence-high';
    if (confidence >= 0.6) return 'confidence-medium';
    return 'confidence-low';
  }

  formatTimestamp(timestamp: string): string {
    // Format as date only (YYYY-MM-DD) instead of time
    return new Date(timestamp).toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD format
  }

  formatDateForChart(timestamp: string): string {
    // Format for chart labels - shorter format like MM/DD
    const date = new Date(timestamp);
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  calculateDaysBetween(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  navigatePrevious() {
    this.router.navigate(['/training']);
  }

  restartWorkflow() {
    // Reset simulation state before navigating away
    this.dataService.resetSimulation().subscribe({
      next: () => {
        console.log('Simulation state reset before restart');
        this.router.navigate(['/upload']);
      },
      error: (error) => {
        console.error('Error resetting simulation state:', error);
        // Navigate anyway
        this.router.navigate(['/upload']);
      }
    });
  }
}
