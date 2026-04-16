import { Injectable, OnDestroy } from '@angular/core';
import { Observable, fromEvent } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WebsocketService implements OnDestroy {
  private socket: Socket;

  constructor() {
    this.socket = io(`${environment.apiUrl}/leaderboard`, {
      autoConnect: false,
    });
  }

  connect() {
    if (!this.socket.connected) this.socket.connect();
  }

  disconnect() {
    this.socket.disconnect();
  }

  inscreverLeaderboard(cursoId: number): Observable<any> {
    this.connect();
    this.socket.emit('subscribe:leaderboard', { curso_id: cursoId });
    return fromEvent(this.socket, `leaderboard:update:${cursoId}`);
  }

  ngOnDestroy() {
    this.disconnect();
  }
}
