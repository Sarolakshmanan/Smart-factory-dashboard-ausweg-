import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Observable, Subject, timer } from 'rxjs';
import { environment } from '../environments/environment';
import { catchError, retry, switchMap, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private socket$: WebSocketSubject<any> | null = null;
  private metricsSocket$: WebSocketSubject<any> | null = null;
  private messagesSubject = new Subject<any>();
  private metricsSubject = new Subject<any>();
  
  public messages$ = this.messagesSubject.asObservable();
  public metrics$ = this.metricsSubject.asObservable();

  constructor() {
    this.connect();
    this.connectMetrics();
  }

  private connect(): void {
    if (!this.socket$ || this.socket$.closed) {
      this.socket$ = webSocket({
        url: environment.wsEndpoint,
        openObserver: {
          next: () => console.log('Main WebSocket connection established')
        },
        closeObserver: {
          next: () => {
            console.log('Main WebSocket connection closed');
            this.socket$ = null;
            setTimeout(() => this.connect(), 5000);
          }
        }
      });

      this.socket$.pipe(
        catchError(error => {
          console.error('Main WebSocket error:', error);
          return this.reconnect();
        })
      ).subscribe(
        (message) => this.messagesSubject.next(message),
        (error) => console.error('Main WebSocket error in subscribe:', error)
      );
    }
  }

  private connectMetrics(): void {
    if (!this.metricsSocket$ || this.metricsSocket$.closed) {
      this.metricsSocket$ = webSocket({
        url: environment.metricsWsEndpoint,
        openObserver: {
          next: () => console.log('Metrics WebSocket connection established')
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
        (message) => this.metricsSubject.next(message),
        (error) => console.error('Metrics WebSocket error in subscribe:', error)
      );
    }
  }

  private reconnect(): Observable<any> {
    return timer(5000).pipe(
      tap(() => this.connect()),
      switchMap(() => this.messages$)
    );
  }

  private reconnectMetrics(): Observable<any> {
    return timer(5000).pipe(
      tap(() => this.connectMetrics()),
      switchMap(() => this.metrics$)
    );
  }

  sendMessage(message: any): void {
    if (this.socket$ && !this.socket$.closed) {
      this.socket$.next(message);
    } else {
      console.error('Cannot send message, socket is not connected');
      this.connect();
    }
  }

  disconnect(): void {
    if (this.socket$) {
      this.socket$.complete();
      this.socket$ = null;
    }
    if (this.metricsSocket$) {
      this.metricsSocket$.complete();
      this.metricsSocket$ = null;
    }
  }
}