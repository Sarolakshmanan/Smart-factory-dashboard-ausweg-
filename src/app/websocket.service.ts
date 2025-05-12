import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Observable, Subject, timer } from 'rxjs';
import { environment } from '../environments/environment';
import { catchError, tap, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private manufacturingSocket$: WebSocketSubject<any> | null = null;
  private metricsSocket$: WebSocketSubject<any> | null = null;
  private historySocket$: WebSocketSubject<any> | null = null;
  private stationStatsSocket$: WebSocketSubject<any> | null = null;
  
  private messagesSubject = new Subject<any>();
  public messages$ = this.messagesSubject.asObservable();

  constructor() {
    this.connectManufacturing();
    this.connectMetrics();
    this.connectHistory();
    this.connectStationStats();
  }

  private connectManufacturing(): void {
    if (!this.manufacturingSocket$ || this.manufacturingSocket$.closed) {
      this.manufacturingSocket$ = webSocket({
        url: environment.wsEndpoint,
        openObserver: {
          next: () => console.log('Manufacturing WebSocket connected')
        },
        closeObserver: {
          next: () => {
            console.log('Manufacturing WebSocket closed');
            setTimeout(() => this.connectManufacturing(), 5000);
          }
        }
      });

      this.manufacturingSocket$.pipe(
        catchError(error => {
          console.error('Manufacturing WebSocket error:', error);
          return this.reconnectManufacturing();
        })
      ).subscribe(
        message => this.messagesSubject.next(message),
        error => console.error('Manufacturing subscribe error:', error)
      );
    }
  }

  private connectMetrics(): void {
    if (!this.metricsSocket$ || this.metricsSocket$.closed) {
      this.metricsSocket$ = webSocket({
        url: environment.metricsWsEndpoint,
        openObserver: {
          next: () => console.log('Metrics WebSocket connected')
        },
        closeObserver: {
          next: () => {
            console.log('Metrics WebSocket closed');
            setTimeout(() => this.connectMetrics(), 5000);
          }
        }
      });

      this.metricsSocket$.pipe(
        catchError(error => {
          console.error('Metrics WebSocket error:', error);
          return this.reconnectMetrics();
        })
      ).subscribe(
        message => this.messagesSubject.next(message),
        error => console.error('Metrics subscribe error:', error)
      );
    }
  }

  private connectHistory(): void {
    if (!this.historySocket$ || this.historySocket$.closed) {
      this.historySocket$ = webSocket({
        url: environment.historyWsEndpoint,
        openObserver: {
          next: () => console.log('History WebSocket connected')
        },
        closeObserver: {
          next: () => {
            console.log('History WebSocket closed');
            setTimeout(() => this.connectHistory(), 5000);
          }
        }
      });

      this.historySocket$.pipe(
        catchError(error => {
          console.error('History WebSocket error:', error);
          return this.reconnectHistory();
        })
      ).subscribe(
        message => {
          if (message && !message.type) {
            message.type = 'product_history_update';
          }
          this.messagesSubject.next(message);
        },
        error => console.error('History subscribe error:', error)
      );
    }
  }

  private connectStationStats(): void {
    if (!this.stationStatsSocket$ || this.stationStatsSocket$.closed) {
      this.stationStatsSocket$ = webSocket({
        url: environment.stationStatsEndpoint,
        openObserver: {
          next: () => console.log('Station Stats WebSocket connected')
        },
        closeObserver: {
          next: () => {
            console.log('Station Stats WebSocket closed');
            setTimeout(() => this.connectStationStats(), 5000);
          }
        }
      });

      this.stationStatsSocket$.pipe(
        catchError(error => {
          console.error('Station Stats WebSocket error:', error);
          return this.reconnectStationStats();
        })
      ).subscribe(
        message => {
          if (message && !message.type) {
            message.type = 'station_status_counts';
          }
          this.messagesSubject.next(message);
        },
        error => console.error('Station Stats subscribe error:', error)
      );
    }
  }

  private reconnectManufacturing(): Observable<any> {
    return timer(5000).pipe(
      tap(() => this.connectManufacturing()),
      switchMap(() => this.messages$)
    );
  }

  private reconnectMetrics(): Observable<any> {
    return timer(5000).pipe(
      tap(() => this.connectMetrics()),
      switchMap(() => this.messages$)
    );
  }

  private reconnectHistory(): Observable<any> {
    return timer(5000).pipe(
      tap(() => this.connectHistory()),
      switchMap(() => this.messages$)
    );
  }

  private reconnectStationStats(): Observable<any> {
    return timer(5000).pipe(
      tap(() => {
        console.log('Attempting to reconnect station stats...');
        this.connectStationStats();
      }),
      switchMap(() => this.messages$)
    );
  }

  sendMessage(message: any): void {
    if (this.manufacturingSocket$ && !this.manufacturingSocket$.closed) {
      this.manufacturingSocket$.next(message);
    } else {
      console.error('Manufacturing socket not connected');
      this.connectManufacturing();
    }
  }

  sendHistoryMessage(message: any): void {
    if (this.historySocket$ && !this.historySocket$.closed) {
      this.historySocket$.next(message);
    } else {
      console.error('History socket not connected');
      this.connectHistory();
    }
  }

  sendStationStatsMessage(message: any): void {
    if (this.stationStatsSocket$ && !this.stationStatsSocket$.closed) {
      this.stationStatsSocket$.next(message);
    } else {
      console.error('Station Stats socket not connected');
      this.connectStationStats();
    }
  }

  public disconnect(): void {
    if (this.manufacturingSocket$) {
      this.manufacturingSocket$.complete();
      this.manufacturingSocket$ = null;
    }
    if (this.metricsSocket$) {
      this.metricsSocket$.complete();
      this.metricsSocket$ = null;
    }
    if (this.historySocket$) {
      this.historySocket$.complete();
      this.historySocket$ = null;
    }
    if (this.stationStatsSocket$) {
      this.stationStatsSocket$.complete();
      this.stationStatsSocket$ = null;
    }
  }
}