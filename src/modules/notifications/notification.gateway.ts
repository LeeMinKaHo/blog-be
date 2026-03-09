import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseFilters } from '@nestjs/common';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private userSockets = new Map<number, string[]>();

    handleConnection(client: Socket) {
        const userId = client.handshake.query.userId;
        if (userId) {
            const uId = Number(userId);
            const sockets = this.userSockets.get(uId) || [];
            sockets.push(client.id);
            this.userSockets.set(uId, sockets);
            console.log(`User ${userId} connected with socket ${client.id}`);
        }
    }

    handleDisconnect(client: Socket) {
        const userId = client.handshake.query.userId;
        if (userId) {
            const uId = Number(userId);
            let sockets = this.userSockets.get(uId) || [];
            sockets = sockets.filter((id) => id !== client.id);
            if (sockets.length > 0) {
                this.userSockets.set(uId, sockets);
            } else {
                this.userSockets.delete(uId);
            }
            console.log(`User ${userId} disconnected`);
        }
    }

    sendNotificationToUser(userId: number, notification: any) {
        const sockets = this.userSockets.get(userId);
        if (sockets) {
            sockets.forEach((socketId) => {
                this.server.to(socketId).emit('newNotification', notification);
            });
        }
    }
}
