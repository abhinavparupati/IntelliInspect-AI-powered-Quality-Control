import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import { DataService } from '../../services/data.service';
import { ModelMetrics } from '../../models/interfaces';

Chart.register(...registerables);

@Component({
  selector: 'app-model-training',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatStepperModule
  ],
  template: `
    <div class="container">
      <mat-stepper orientation="horizontal" [selectedIndex]="2">
        <mat-step label="Upload Dataset" state="done">
        </mat-step>
        <mat-step label="Date Ranges" state="done">
        </mat-step>
        <mat-step label="Model Training" state="edit">
        </mat-step>
        <mat-step label="Real-Time Simulation">
        </mat-step>
      </mat-stepper>

      <div class="content">
        <h1>Step 3 of 4: Model Training & Evaluation</h1>
        <p>Train the machine learning model using the configured date ranges and evaluate its performance.</p>

        <div *ngIf="!isTraining && !metrics" class="training-start">
          <mat-card class="action-card">
            <mat-card-content>
              <div class="action-content">
                <mat-icon class="action-icon">psychology</mat-icon>
                <h3>Ready to Train Model</h3>
                <p>This will train an XGBoost model using your configured data splits and evaluate its performance on the test set.</p>
                <button mat-raised-button 
                        color="primary" 
                        size="large"
                        (click)="startTraining()">
                  <mat-icon>play_arrow</mat-icon>
                  Train Model
                </button>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <div *ngIf="isTraining" class="training-progress">
          <mat-card>
            <mat-card-content>
              <div class="progress-content">
                <mat-icon class="spinning">autorenew</mat-icon>
                <h3>Training Model...</h3>
                <p>{{ trainingStatus }}</p>
                <mat-progress-bar mode="indeterminate"></mat-progress-bar>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <div *ngIf="metrics" class="results-section">
          <!-- Performance Metrics -->
          <div class="metrics-grid">
            <mat-card class="metric-card accuracy">
              <mat-card-content>
                <div class="metric-content">
                  <mat-icon>trending_up</mat-icon>
                  <div>
                    <h3>Accuracy</h3>
                    <p class="metric-value">{{ (metrics.accuracy * 100) | number:'1.2-2' }}%</p>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <mat-card class="metric-card precision">
              <mat-card-content>
                <div class="metric-content">
                  <mat-icon>gps_fixed</mat-icon>
                  <div>
                    <h3>Precision</h3>
                    <p class="metric-value">{{ getTotalTestSamples() > 0 ? ((metrics.precision * 100) | number:'1.2-2') + '%' : 'N/A' }}</p>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <mat-card class="metric-card recall">
              <mat-card-content>
                <div class="metric-content">
                  <mat-icon>find_in_page</mat-icon>
                  <div>
                    <h3>Recall</h3>
                    <p class="metric-value">{{ getTotalTestSamples() > 0 ? ((metrics.recall * 100) | number:'1.2-2') + '%' : 'N/A' }}</p>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <mat-card class="metric-card f1-score">
              <mat-card-content>
                <div class="metric-content">
                  <mat-icon>balance</mat-icon>
                  <div>
                    <h3>F1-Score</h3>
                    <p class="metric-value">{{ getTotalTestSamples() > 0 ? ((metrics.f1Score * 100) | number:'1.2-2') + '%' : 'N/A' }}</p>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>

          <!-- Training History Chart -->
          <mat-card class="chart-card">
            <mat-card-header>
              <mat-card-title>Training History</mat-card-title>
              <mat-card-subtitle>Accuracy and Loss over Training Epochs</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="chart-container">
                <canvas #trainingChart></canvas>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Confusion Matrix -->
          <mat-card class="chart-card">
            <mat-card-header>
              <mat-card-title>Confusion Matrix</mat-card-title>
              <mat-card-subtitle>Model Performance Breakdown</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="chart-container">
                <canvas #confusionChart></canvas>
              </div>
              <div class="confusion-legend" *ngIf="getTotalTestSamples() > 0">
                <div class="legend-item">
                  <span class="legend-color true-positive"></span>
                  <span>True Positive: {{ metrics.confusionMatrix.truePositive }}</span>
                </div>
                <div class="legend-item">
                  <span class="legend-color true-negative"></span>
                  <span>True Negative: {{ metrics.confusionMatrix.trueNegative }}</span>
                </div>
                <div class="legend-item">
                  <span class="legend-color false-positive"></span>
                  <span>False Positive: {{ metrics.confusionMatrix.falsePositive }}</span>
                </div>
                <div class="legend-item">
                  <span class="legend-color false-negative"></span>
                  <span>False Negative: {{ metrics.confusionMatrix.falseNegative }}</span>
                </div>
              </div>
              <div class="no-test-data" *ngIf="getTotalTestSamples() === 0">
                <mat-icon>info</mat-icon>
                <p>No test data available in the selected testing date range. The model was trained successfully, but evaluation metrics require test data.</p>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <div class="navigation-buttons">
          <button mat-raised-button (click)="navigatePrevious()">Previous</button>
          <button mat-raised-button 
                  color="primary" 
                  [disabled]="!metrics"
                  (click)="navigateNext()">
            Next
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 20px;
    }

    .content {
      margin-top: 30px;
    }

    .training-start {
      margin: 40px 0;
    }

    .action-card {
      text-align: center;
      padding: 20px;
    }

    .action-content {
      padding: 40px 20px;
    }

    .action-icon {
      font-size: 64px;
      height: 64px;
      width: 64px;
      color: #3f51b5;
      margin-bottom: 20px;
    }

    .training-progress {
      margin: 40px 0;
    }

    .progress-content {
      text-align: center;
      padding: 40px 20px;
    }

    .spinning {
      animation: spin 2s linear infinite;
      font-size: 48px;
      height: 48px;
      width: 48px;
      color: #3f51b5;
      margin-bottom: 20px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .results-section {
      margin: 40px 0;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }

    .metric-card {
      border-left: 4px solid;
    }

    .metric-card.accuracy {
      border-left-color: #4caf50;
    }

    .metric-card.precision {
      border-left-color: #2196f3;
    }

    .metric-card.recall {
      border-left-color: #ff9800;
    }

    .metric-card.f1-score {
      border-left-color: #9c27b0;
    }

    .metric-content {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 10px;
    }

    .metric-content mat-icon {
      font-size: 32px;
      height: 32px;
      width: 32px;
      color: #3f51b5;
    }

    .metric-content h3 {
      margin: 0 0 5px 0;
      font-size: 1em;
      color: #666;
    }

    .metric-value {
      margin: 0;
      font-size: 1.5em;
      font-weight: bold;
      color: #333;
    }

    .chart-card {
      margin: 30px 0;
    }

    .chart-container {
      position: relative;
      height: 400px;
      margin: 20px 0;
    }

    .confusion-legend {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 20px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .legend-color {
      width: 20px;
      height: 20px;
      border-radius: 3px;
    }

    .legend-color.true-positive {
      background-color: #4caf50;
    }

    .legend-color.true-negative {
      background-color: #2196f3;
    }

    .legend-color.false-positive {
      background-color: #ff9800;
    }

    .legend-color.false-negative {
      background-color: #f44336;
    }

    .no-test-data {
      text-align: center;
      padding: 20px;
      color: #666;
      background-color: #f5f5f5;
      border-radius: 8px;
      margin-top: 20px;
    }

    .no-test-data mat-icon {
      font-size: 32px;
      height: 32px;
      width: 32px;
      color: #999;
      margin-bottom: 10px;
    }

    .no-test-data p {
      margin: 0;
      font-size: 1em;
      line-height: 1.5;
    }

    .navigation-buttons {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
    }
  `]
})
export class ModelTrainingComponent implements OnInit {
  @ViewChild('trainingChart', { static: false }) trainingChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('confusionChart', { static: false }) confusionChartRef!: ElementRef<HTMLCanvasElement>;

  isTraining = false;
  trainingStatus = '';
  metrics: ModelMetrics | null = null;

  constructor(
    private dataService: DataService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {}

  getTotalTestSamples(): number {
    if (!this.metrics) return 0;
    const cm = this.metrics.confusionMatrix;
    return cm.truePositive + cm.trueNegative + cm.falsePositive + cm.falseNegative;
  }

  startTraining() {
    this.isTraining = true;
    this.trainingStatus = 'Initializing training process...';

    // First, get the validated date ranges from the backend
    this.dataService.getValidatedDateRanges().subscribe({
      next: (dateRanges) => {
        // Simulate training steps
        setTimeout(() => {
          this.trainingStatus = 'Loading and preprocessing data...';
        }, 1000);

        setTimeout(() => {
          this.trainingStatus = 'Training XGBoost model...';
        }, 3000);

        setTimeout(() => {
          this.trainingStatus = 'Evaluating model performance...';
        }, 6000);

        // Use the actual validated date ranges
        this.dataService.trainModel(dateRanges).subscribe({
          next: (metrics) => {
            this.metrics = metrics;
            this.isTraining = false;
            this.snackBar.open('Model trained successfully!', 'Close', { duration: 3000 });
            
            // Create charts after the view updates
            setTimeout(() => {
              this.createTrainingChart();
              this.createConfusionChart();
            }, 100);
          },
          error: (error) => {
            this.isTraining = false;
            this.snackBar.open('Error training model: ' + error.message, 'Close', { duration: 5000 });
          }
        });
      },
      error: (error) => {
        this.isTraining = false;
        this.snackBar.open('Error getting date ranges: ' + error.message, 'Close', { duration: 5000 });
      }
    });
  }

  private createTrainingChart() {
    if (!this.metrics || !this.trainingChartRef) return;

    const ctx = this.trainingChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'line' as ChartType,
      data: {
        labels: this.metrics.trainingHistory.epochs,
        datasets: [
          {
            label: 'Accuracy',
            data: this.metrics.trainingHistory.accuracy,
            borderColor: '#4caf50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            fill: false
          },
          {
            label: 'Loss',
            data: this.metrics.trainingHistory.loss,
            borderColor: '#f44336',
            backgroundColor: 'rgba(244, 67, 54, 0.1)',
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Epoch'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Value'
            }
          }
        }
      }
    };

    new Chart(ctx, config);
  }

  private createConfusionChart() {
    if (!this.metrics || !this.confusionChartRef) return;

    const ctx = this.confusionChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const cm = this.metrics.confusionMatrix;
    
    // Check if all confusion matrix values are zero (no test data)
    const totalTestSamples = cm.truePositive + cm.trueNegative + cm.falsePositive + cm.falseNegative;
    
    let config: ChartConfiguration;
    
    if (totalTestSamples === 0) {
      // No test data available - show a placeholder message
      config = {
        type: 'doughnut' as ChartType,
        data: {
          labels: ['No Test Data Available'],
          datasets: [{
            data: [1],
            backgroundColor: ['#e0e0e0'],
            borderColor: ['#bdbdbd'],
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom'
            },
            tooltip: {
              callbacks: {
                label: function() {
                  return 'No test data in the selected date range';
                }
              }
            }
          }
        }
      };
    } else {
      // Normal confusion matrix with actual data
      config = {
        type: 'doughnut' as ChartType,
        data: {
          labels: ['True Positive', 'True Negative', 'False Positive', 'False Negative'],
          datasets: [{
            data: [cm.truePositive, cm.trueNegative, cm.falsePositive, cm.falseNegative],
            backgroundColor: [
              '#4caf50',
              '#2196f3',
              '#ff9800',
              '#f44336'
            ]
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
    }

    new Chart(ctx, config);
  }

  navigatePrevious() {
    this.router.navigate(['/date-ranges']);
  }

  navigateNext() {
    if (this.metrics) {
      this.router.navigate(['/simulation']);
    }
  }
}
