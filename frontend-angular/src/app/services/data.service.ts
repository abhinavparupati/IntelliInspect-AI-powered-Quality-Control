import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { map, tap, filter } from 'rxjs/operators';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { environment } from '../../environments/environment';
import { 
  DatasetMetadata, 
  DateRanges, 
  ValidationResult, 
  ModelMetrics, 
  PredictionResult, 
  SimulationStatus 
} from '../models/interfaces';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private apiUrl = environment.apiUrl;
  private hubConnection: HubConnection | null = null;
  private uploadProgressSubject = new BehaviorSubject<number>(0);
  private predictionStreamSubject = new Subject<PredictionResult>();
  private simulationStatusSubject = new BehaviorSubject<SimulationStatus>({
    isRunning: false,
    totalPredictions: 0,
    passCount: 0,
    failCount: 0,
    averageConfidence: 0
  });

  public uploadProgress$ = this.uploadProgressSubject.asObservable();
  public predictionStream$ = this.predictionStreamSubject.asObservable();
  public simulationStatus$ = this.simulationStatusSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initializeSignalRConnection();
    
    // Add event listener to stop simulation when page is being unloaded
    window.addEventListener('beforeunload', () => {
      this.handlePageUnload();
    });
  }

  private handlePageUnload(): void {
    // Stop simulation if running and disconnect SignalR
    if (this.simulationStatusSubject.value.isRunning) {
      // Use synchronous approach for page unload
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.apiUrl}/simulation/stop`, false); // synchronous
      xhr.setRequestHeader('Content-Type', 'application/json');
      try {
        xhr.send();
      } catch (error) {
        console.error('Error stopping simulation on page unload:', error);
      }
    }
  }

  private async initializeSignalRConnection(): Promise<void> {
    try {
      const baseUrl = this.apiUrl.replace('/api', ''); // Remove /api suffix to get base URL
      const hubUrl = `${baseUrl}/simulationHub`;
      console.log('Initializing SignalR connection to:', hubUrl);
      this.hubConnection = new HubConnectionBuilder()
        .withUrl(hubUrl)
        .configureLogging(LogLevel.Information)
        .build();

      // Set up event listeners
      this.hubConnection.on('PredictionUpdate', (predictionResult: PredictionResult) => {
        console.log('Received PredictionUpdate:', predictionResult);
        this.predictionStreamSubject.next(predictionResult);
      });

      this.hubConnection.on('StatusUpdate', (status: SimulationStatus) => {
        console.log('Received StatusUpdate:', status);
        this.simulationStatusSubject.next(status);
      });

      this.hubConnection.onclose((error) => {
        console.log('SignalR connection closed:', error);
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          this.reconnectSignalR();
        }, 5000);
      });

      // Start the connection
      await this.hubConnection.start();
      console.log('SignalR connection established successfully');
      
      // Join the simulation group
      await this.hubConnection.invoke('JoinSimulationGroup');
      console.log('Joined SimulationGroup successfully');
    } catch (error) {
      console.error('Error establishing SignalR connection:', error);
      // Retry connection after 5 seconds
      setTimeout(() => {
        this.reconnectSignalR();
      }, 5000);
    }
  }

  private async reconnectSignalR(): Promise<void> {
    if (this.hubConnection?.state === 'Disconnected') {
      try {
        await this.hubConnection.start();
        console.log('SignalR reconnected');
        await this.hubConnection.invoke('JoinSimulationGroup');
      } catch (error) {
        console.error('Error reconnecting SignalR:', error);
        setTimeout(() => {
          this.reconnectSignalR();
        }, 5000);
      }
    }
  }

  public async disconnectSignalR(): Promise<void> {
    if (this.hubConnection) {
      try {
        await this.hubConnection.invoke('LeaveSimulationGroup');
        await this.hubConnection.stop();
        console.log('SignalR connection stopped');
      } catch (error) {
        console.error('Error stopping SignalR connection:', error);
      }
    }
  }

  // Service cleanup method - call this when the service is destroyed
  public async cleanup(): Promise<void> {
    await this.disconnectSignalR();
  }

  uploadDataset(file: File): Observable<DatasetMetadata> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<DatasetMetadata>(`${this.apiUrl}/dataset/upload`, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      map((event: HttpEvent<any>) => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            if (event.total) {
              const progress = Math.round(100 * event.loaded / event.total);
              this.uploadProgressSubject.next(progress);
            }
            return null; // Don't emit for progress events
          case HttpEventType.Response:
            this.uploadProgressSubject.next(100);
            return event.body; // Return the actual metadata
          default:
            return null;
        }
      }),
      filter((response: DatasetMetadata | null): response is DatasetMetadata => response !== null), // Filter out null values
      tap(() => this.uploadProgressSubject.next(0)) // Reset progress after completion
    );
  }

  validateDateRanges(dateRanges: DateRanges): Observable<ValidationResult> {
    return this.http.post<ValidationResult>(`${this.apiUrl}/dataset/validate-ranges`, dateRanges);
  }

  getDatasetMetadata(): Observable<DatasetMetadata> {
    return this.http.get<DatasetMetadata>(`${this.apiUrl}/dataset/metadata`);
  }

  getValidatedDateRanges(): Observable<DateRanges> {
    return this.http.get<DateRanges>(`${this.apiUrl}/dataset/validated-ranges`);
  }

  trainModel(dateRanges: DateRanges): Observable<ModelMetrics> {
    return this.http.post<ModelMetrics>(`${this.apiUrl}/model/train`, dateRanges);
  }

  startSimulation(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/simulation/start`, {}).pipe(
      tap(async () => {
        // Ensure SignalR connection is active and we're in the simulation group
        if (this.hubConnection?.state === 'Connected') {
          try {
            await this.hubConnection.invoke('JoinSimulationGroup');
          } catch (error) {
            console.error('Error joining simulation group:', error);
          }
        }
      })
    );
  }

  getSimulationStatus(): Observable<SimulationStatus> {
    return this.http.get<SimulationStatus>(`${this.apiUrl}/simulation/status`);
  }

  getCurrentSimulationData(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/simulation/current-data`);
  }

  stopSimulation(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/simulation/stop`, {}).pipe(
      tap(async () => {
        // Leave the simulation group when stopping
        if (this.hubConnection?.state === 'Connected') {
          try {
            await this.hubConnection.invoke('LeaveSimulationGroup');
          } catch (error) {
            console.error('Error leaving simulation group:', error);
          }
        }
      })
    );
  }

  resetSimulation(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/simulation/reset`, {}).pipe(
      tap(async () => {
        // Reset local state and leave simulation group
        this.simulationStatusSubject.next({
          isRunning: false,
          totalPredictions: 0,
          passCount: 0,
          failCount: 0,
          averageConfidence: 0
        });
        
        if (this.hubConnection?.state === 'Connected') {
          try {
            await this.hubConnection.invoke('LeaveSimulationGroup');
          } catch (error) {
            console.error('Error leaving simulation group:', error);
          }
        }
      })
    );
  }

  // Real-time prediction updates are now handled automatically via SignalR
  // The predictionStream$ and simulationStatus$ observables will emit data
  // when the backend sends PredictionUpdate and StatusUpdate events

  // Method to simulate real-time predictions (for demo purposes)
  simulatePrediction(prediction: PredictionResult): void {
    this.predictionStreamSubject.next(prediction);
  }
}
