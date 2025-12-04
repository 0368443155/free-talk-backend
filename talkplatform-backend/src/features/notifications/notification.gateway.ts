import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
    namespace: '/notifications',
    cors: {
        origin: '*',
        credentials: true,
    },
})
@Injectable()
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(NotificationGateway.name);
    private readonly userSocketMap = new Map<string, string>();

    constructor(private readonly jwtService: JwtService) { }

    async handleConnection(client: Socket) {
        try {
            const token = client.handshake.auth.token || client.handshake.query.token;
            if (!token) {
                this.logger.warn(`Connection attempt without token: ${client.id}`);
                client.disconnect();
                return;
            }

            // Verify token
            const payload = this.jwtService.verify(token);
            const userId = payload.sub; // Assuming sub is userId

            if (userId) {
                this.userSocketMap.set(userId, client.id);
                client.data.userId = userId;
                this.logger.log(`User ${userId} connected to notifications (socket ${client.id})`);
            }
        } catch (error) {
            this.logger.error(`Connection unauthorized: ${error.message}`);
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        const userId = client.data.userId;
        if (userId) {
            this.userSocketMap.delete(userId);
            this.logger.log(`User ${userId} disconnected from notifications`);
        }
    }

    sendNotification(userId: string, notification: any) {
        const socketId = this.userSocketMap.get(userId);
        if (socketId) {
            this.server.to(socketId).emit('notification:new', notification);
            this.logger.log(`Sent notification to user ${userId} (socket ${socketId})`);
        } else {
            this.logger.debug(`User ${userId} not connected, notification skipped`);
        }
    }
}
