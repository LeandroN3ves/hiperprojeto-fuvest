import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LeaderboardService } from './leaderboard.service';

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:4200' },
  namespace: '/leaderboard',
})
export class LeaderboardGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private leaderboardService: LeaderboardService) {}

  handleConnection(client: Socket) {
    console.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Cliente desconectado: ${client.id}`);
  }

  // Cliente se inscreve no ranking de um curso
  @SubscribeMessage('subscribe:leaderboard')
  async handleSubscribe(
    @MessageBody() payload: { curso_id: number },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `leaderboard:${payload.curso_id}`;
    client.join(room);

    // Envia o ranking atual imediatamente ao se inscrever
    const ranking = await this.leaderboardService.getRankingCurso(payload.curso_id);
    client.emit(`leaderboard:update:${payload.curso_id}`, ranking);
  }

  // Chamado pelo ProvasService ao finalizar prova semanal
  async emitirAtualizacao(cursoId: number) {
    const ranking = await this.leaderboardService.getRankingCurso(cursoId);
    this.server.to(`leaderboard:${cursoId}`).emit(`leaderboard:update:${cursoId}`, ranking);
  }
}
