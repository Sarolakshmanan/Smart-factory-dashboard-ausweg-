import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Observable, Subject, timer } from 'rxjs';
import { environment } from '../environments/environment';
import { catchError, retry, switchMap, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private manufacturingSocket$: WebSocketSubject<any> | null = null;
  private metricsSocket$: WebSocketSubject<any> | null = null;
  private messagesSubject = new Subject<any>();
  
  public messages$ = this.messagesSubject.asObservable();

  constructor() {
    this.connectManufacturing();
    this.connectMetrics();
  }

  private connectManufacturing(): void {
    if (!this.manufacturingSocket$ || this.manufacturingSocket$.closed) {
      this.manufacturingSocket$ = webSocket({
        url: environment.wsEndpoint,
        openObserver: {
          next: () => {
            console.log('Manufacturing WebSocket connection established');
          }
        },
        closeObserver: {
          next: () => {
            console.log('Manufacturing WebSocket connection closed');
            this.manufacturingSocket$ = null;
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
        (message) => {
          this.messagesSubject.next(message);
        },
        (error) => console.error('Manufacturing WebSocket error in subscribe:', error)
      );
    }
  }

  private connectMetrics(): void {
    if (!this.metricsSocket$ || this.metricsSocket$.closed) {
      this.metricsSocket$ = webSocket({
        url: environment.metricsWsEndpoint,
        openObserver: {
          next: () => {
            console.log('Metrics WebSocket connection established');
          }
        },
        closeObserver: {
          next: () => {
            console.log('Metrics WebSocket connection closed');
            this.metricsSocket$ = null;
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
        (message) => {
          console.log('Received metrics update:', message);
          this.messagesSubject.next(message);
        },
        (error) => console.error('Metrics WebSocket error in subscribe:', error)
      );
    }
  }

  private reconnectManufacturing(): Observable<any> {
    return timer(5000).pipe(
      tap(() => {
        console.log('Attempting to reconnect manufacturing...');
        this.connectManufacturing();
      }),
      switchMap(() => this.messages$)
    );
  }

  private reconnectMetrics(): Observable<any> {
    return timer(5000).pipe(
      tap(() => {
        console.log('Attempting to reconnect metrics...');
        this.connectMetrics();
      }),
      switchMap(() => this.messages$)
    );
  }

  sendMessage(message: any): void {
    if (this.manufacturingSocket$ && !this.manufacturingSocket$.closed) {
      this.manufacturingSocket$.next(message);
    } else {
      console.error('Cannot send message, manufacturing socket is not connected');
      this.connectManufacturing();
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
  }
}
