import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { AppService } from '../app.service';

@WebSocketGateway({
  cors: { origin: '*' }, // Cấu hình CORS cho kết nối
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  
  // Instance máy chủ Socket.IO để phát sự kiện
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('EventsGateway');

  constructor(private readonly appService: AppService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway Initialized');
    // Gateway lắng nghe Subject từ AppService
    this.appService.getEventsToEmit().subscribe({
      next: (event) => {
        // Khi có sự kiện, phát nó ra cho tất cả client
        this.server.emit(event.name, event.data);
      },
    });
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Lắng nghe một sự kiện tên 'msgToServer' từ client
  @SubscribeMessage('msgToServer')
  handleMessage(@MessageBody() data: string): void {
    // Gửi lại cho TẤT CẢ clients sự kiện 'msgToClient'
    this.server.emit('msgToClient', data);
  }

  // Lắng nghe sự kiện tham gia admin dashboard
  @SubscribeMessage('join-admin-dashboard')
  handleJoinAdminDashboard(client: Socket) {
    client.join('admin-dashboard');
    this.logger.log(`Client ${client.id} joined admin dashboard`);
  }

  // Lắng nghe sự kiện rời admin dashboard
  @SubscribeMessage('leave-admin-dashboard')
  handleLeaveAdminDashboard(client: Socket) {
    client.leave('admin-dashboard');
    this.logger.log(`Client ${client.id} left admin dashboard`);
  }
}