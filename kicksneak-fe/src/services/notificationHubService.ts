import { HubConnectionBuilder, HubConnection, HubConnectionState } from '@microsoft/signalr';

export interface LiveNotification {
    title: string;
    message: string;
    type: string;
    href?: string;
    createdAt: string;
}

type NotificationReceivedCallback = (notification: LiveNotification) => void;

class NotificationHubService {
    private connection: HubConnection | null = null;
    private onNotificationReceivedCallback: NotificationReceivedCallback | null = null;

    async ensureConnection(token: string): Promise<void> {
        if (!token) return;
        if (this.connection?.state === HubConnectionState.Connected) return;

        this.connection = new HubConnectionBuilder()
            .withUrl(`${import.meta.env.VITE_API_BASE_URL}/hubs/notifications`, {
                accessTokenFactory: () => token
            })
            .withAutomaticReconnect()
            .build();

        this.connection.on('ReceiveNotification', (notification: LiveNotification) => {
            console.log('[NotificationHub] Received notification:', notification);
            this.onNotificationReceivedCallback?.(notification);
        });

        try {
            await this.connection.start();
            console.log("NotificationHub connected");
        } catch (err) {
            console.error("Failed to connect to NotificationHub", err);
        }
    }

    onNotification(callback: NotificationReceivedCallback) {
        this.onNotificationReceivedCallback = callback;
    }

    async disconnect(): Promise<void> {
        if (this.connection?.state === HubConnectionState.Connected) {
            await this.connection.stop();
        }
        this.connection = null;
        this.onNotificationReceivedCallback = null;
    }
}

export const notificationHubService = new NotificationHubService();
