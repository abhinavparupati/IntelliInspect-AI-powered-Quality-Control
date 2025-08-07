import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/upload', pathMatch: 'full' },
  { 
    path: 'upload', 
    loadComponent: () => import('./components/upload-dataset/upload-dataset.component').then(m => m.UploadDatasetComponent) 
  },
  { 
    path: 'date-ranges', 
    loadComponent: () => import('./components/date-ranges/date-ranges.component').then(m => m.DateRangesComponent) 
  },
  { 
    path: 'training', 
    loadComponent: () => import('./components/model-training/model-training.component').then(m => m.ModelTrainingComponent) 
  },
  { 
    path: 'simulation', 
    loadComponent: () => import('./components/real-time-simulation/real-time-simulation.component').then(m => m.RealTimeSimulationComponent) 
  },
  { path: '**', redirectTo: '/upload' }
];
