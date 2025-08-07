import { Component, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { DataService } from './services/data.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule
  ],
  template: `
    <mat-toolbar color="primary" class="app-toolbar">
      <mat-icon>analytics</mat-icon>
      <span class="app-title">IntelliInspect</span>
      <span class="spacer"></span>
      <span class="app-subtitle">AI-Powered Quality Control</span>
    </mat-toolbar>
    
    <div class="app-container">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .app-toolbar {
      position: sticky;
      top: 0;
      z-index: 1000;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .app-title {
      margin-left: 10px;
      font-size: 1.5em;
      font-weight: 500;
    }
    
    .spacer {
      flex: 1 1 auto;
    }
    
    .app-subtitle {
      font-size: 0.9em;
      opacity: 0.8;
    }
    
    .app-container {
      min-height: calc(100vh - 64px);
      background-color: #fafafa;
    }
  `]
})
export class AppComponent implements OnDestroy {
  title = 'IntelliInspect - AI-Powered Quality Control';

  constructor(private dataService: DataService) {
    // Reset simulation state when app starts (handles page refresh)
    this.dataService.resetSimulation().subscribe({
      next: () => {
        console.log('Simulation state reset on app startup');
      },
      error: (error) => {
        console.error('Error resetting simulation state on startup:', error);
      }
    });
  }

  ngOnDestroy() {
    // Clean up data service on app destruction
    this.dataService.cleanup();
  }
}
