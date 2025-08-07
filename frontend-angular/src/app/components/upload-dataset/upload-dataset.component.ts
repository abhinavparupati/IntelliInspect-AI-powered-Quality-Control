import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { DataService } from '../../services/data.service';
import { DatasetMetadata } from '../../models/interfaces';

@Component({
  selector: 'app-upload-dataset',
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
      <mat-stepper orientation="horizontal" [selectedIndex]="0">
        <mat-step label="Upload Dataset" state="edit">
        </mat-step>
        <mat-step label="Date Ranges">
        </mat-step>
        <mat-step label="Model Training">
        </mat-step>
        <mat-step label="Real-Time Simulation">
        </mat-step>
      </mat-stepper>

      <div class="content">
        <h1>Step 1 of 4: Upload Dataset</h1>
        <p>Upload the Bosch Production Line Performance dataset for processing and analysis.</p>

        <mat-card class="upload-card" 
                  [class.dragover]="isDragOver"
                  (dragover)="onDragOver($event)"
                  (dragleave)="onDragLeave($event)"
                  (drop)="onDrop($event)"
                  (click)="fileInput.click()">
          <mat-card-content>
            <div class="upload-area">
              <mat-icon class="upload-icon">cloud_upload</mat-icon>
              <h3>{{ selectedFile ? selectedFile.name : 'Drag & Drop CSV File' }}</h3>
              <p>{{ selectedFile ? formatFileSize(selectedFile.size) : 'or click to browse files' }}</p>
              <p class="file-requirements">Supported format: CSV files (max 2GB)</p>
              
              <input #fileInput 
                     type="file" 
                     accept=".csv"
                     style="display: none"
                     (change)="onFileSelected($event)">
            </div>
          </mat-card-content>
        </mat-card>

        <div *ngIf="uploadProgress > 0 && uploadProgress < 100" class="upload-progress">
          <mat-progress-bar mode="determinate" [value]="uploadProgress"></mat-progress-bar>
          <p>Uploading: {{ uploadProgress }}%</p>
        </div>

        <div *ngIf="processing" class="processing">
          <mat-progress-bar mode="indeterminate"></mat-progress-bar>
          <p>Processing dataset and adding synthetic timestamps...</p>
        </div>

        <mat-card *ngIf="metadata" class="metadata-card">
          <mat-card-header>
            <mat-card-title>Dataset Summary</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="metadata-grid">
              <div class="metadata-item">
                <mat-icon>table_rows</mat-icon>
                <div>
                  <strong>Total Rows</strong>
                  <p>{{ metadata.recordCount | number }}</p>
                </div>
              </div>
              <div class="metadata-item">
                <mat-icon>view_column</mat-icon>
                <div>
                  <strong>Total Columns</strong>
                  <p>{{ metadata.columnCount | number }}</p>
                </div>
              </div>
              <div class="metadata-item">
                <mat-icon>check_circle</mat-icon>
                <div>
                  <strong>Pass Rate</strong>
                  <p>{{ (metadata.passRate * 100).toFixed(1) }}%</p>
                </div>
              </div>
              <div class="metadata-item">
                <mat-icon>insert_drive_file</mat-icon>
                <div>
                  <strong>File Name</strong>
                  <p>{{ metadata.fileName }}</p>
                </div>
              </div>
              <div class="metadata-item">
                <mat-icon>date_range</mat-icon>
                <div>
                  <strong>Date Range</strong>
                  <p>{{ formatDateRange() }}</p>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <div class="navigation-buttons">
          <button mat-raised-button disabled>Previous</button>
          <button mat-raised-button 
                  color="primary" 
                  [disabled]="!metadata"
                  (click)="navigateNext()">
            Next
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }

    .content {
      margin-top: 30px;
    }

    .upload-card {
      margin: 20px 0;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .upload-card:hover {
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }

    .upload-card.dragover {
      border: 2px dashed #3f51b5;
      background-color: #f5f5f5;
    }

    .upload-area {
      text-align: center;
      padding: 40px 20px;
    }

    .upload-icon {
      font-size: 48px;
      height: 48px;
      width: 48px;
      color: #3f51b5;
      margin-bottom: 20px;
    }

    .file-requirements {
      color: #666;
      font-size: 0.9em;
      margin-top: 10px;
    }

    .upload-progress {
      margin: 20px 0;
      text-align: center;
    }

    .processing {
      margin: 20px 0;
      text-align: center;
    }

    .metadata-card {
      margin: 20px 0;
    }

    .metadata-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }

    .metadata-item {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 15px;
      background: #f9f9f9;
      border-radius: 8px;
    }

    .metadata-item mat-icon {
      color: #3f51b5;
    }

    .metadata-item strong {
      display: block;
      margin-bottom: 5px;
    }

    .metadata-item p {
      margin: 0;
      color: #666;
    }

    .navigation-buttons {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
    }
  `]
})
export class UploadDatasetComponent implements OnInit {
  selectedFile: File | null = null;
  isDragOver = false;
  uploadProgress = 0;
  processing = false;
  metadata: DatasetMetadata | null = null;

  constructor(
    private dataService: DataService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.dataService.uploadProgress$.subscribe(progress => {
      this.uploadProgress = progress;
    });
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.handleFile(file);
    }
  }

  private handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.snackBar.open('Please select a CSV file', 'Close', { duration: 3000 });
      return;
    }

    if (file.size > 2 * 1024 * 1024 * 1024) { // 2GB limit
      this.snackBar.open('File size must be less than 2GB', 'Close', { duration: 3000 });
      return;
    }

    this.selectedFile = file;
    this.uploadFile();
  }

  private uploadFile() {
    if (!this.selectedFile) return;

    this.processing = true;
    this.dataService.uploadDataset(this.selectedFile).subscribe({
      next: (metadata) => {
        console.log('Received metadata:', metadata); // Debug log
        if (metadata) {
          this.metadata = metadata;
          this.processing = false;
          this.snackBar.open('Dataset uploaded and processed successfully!', 'Close', { duration: 3000 });
        } else {
          console.error('Metadata is null or undefined');
          this.processing = false;
          this.snackBar.open('Dataset uploaded but no metadata received', 'Close', { duration: 5000 });
        }
      },
      error: (error) => {
        console.error('Upload error:', error); // Debug log
        this.processing = false;
        this.snackBar.open('Error uploading dataset: ' + error.message, 'Close', { duration: 5000 });
      }
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDateRange(): string {
    if (!this.metadata) return '';
    const start = new Date(this.metadata.startDate).toLocaleDateString();
    const end = new Date(this.metadata.endDate).toLocaleDateString();
    return `${start} - ${end}`;
  }

  navigateNext() {
    if (this.metadata) {
      this.router.navigate(['/date-ranges']);
    }
  }
}
