export type NotificationType = 'price_drop' | 'order' | 'offer' | 'recommendation' | 'system';

export interface AppNotification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    href: string;
    read: boolean;
    createdAt: string;
}