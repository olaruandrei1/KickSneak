import * as signalR from '@microsoft/signalr';
import { useAuctionStore } from '../store/auctionStore';
import { useAuthStore } from '../store/authStore';

const HUB_URL = `${import.meta.env.VITE_API_BASE_URL}/hubs/auction`;

class AuctionSignalRService {
    private connection: signalR.HubConnection | null = null;
    private currentAuctionId: string | null = null;

    async joinAuctionsList(token?: string): Promise<void> {
        if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
            this.connection = new signalR.HubConnectionBuilder()
                .withUrl(HUB_URL, token ? { accessTokenFactory: () => token } : {})
                .withAutomaticReconnect()
                .configureLogging(signalR.LogLevel.Warning)
                .build();

            this.registerHandlers();
            await this.connection.start();
        }

        await this.connection.invoke('JoinAuctionsList');
    }

    async leaveAuctionsList(): Promise<void> {
        await this.connection?.invoke('LeaveAuctionsList');
    }

    async connect(auctionId: string, token?: string): Promise<void> {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            if (this.currentAuctionId !== auctionId) {
                await this.leaveAuction(this.currentAuctionId!);
                await this.joinAuction(auctionId);
                this.currentAuctionId = auctionId;
            }
            return;
        }

        this.connection = new signalR.HubConnectionBuilder()
            .withUrl(HUB_URL, token
                ? { accessTokenFactory: () => token }
                : {}
            )
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Warning)
            .build();

        this.registerHandlers();

        await this.connection.start();
        await this.joinAuction(auctionId);
        this.currentAuctionId = auctionId;
    }

    async disconnect(): Promise<void> {
        if (this.currentAuctionId)
            await this.leaveAuction(this.currentAuctionId);
        await this.connection?.stop();
        this.connection = null;
        this.currentAuctionId = null;
    }

    private async joinAuction(auctionId: string): Promise<void> {
        await this.connection?.invoke('JoinAuction', auctionId);
    }

    private async leaveAuction(auctionId: string): Promise<void> {
        await this.connection?.invoke('LeaveAuction', auctionId);
    }

    private registerHandlers(): void {
        if (!this.connection) return;

        this.connection.on('bid_placed', (data: {
            auctionId: string;
            bid: any;
            newCurrentPrice: number;
            triggeredExtension: boolean;
            newEndsAt: string;
        }) => {
            const store = useAuctionStore.getState();

            store.updateCurrentPriceLive(data.auctionId, data.newCurrentPrice, {
                id: data.bid.id,
                auctionId: data.auctionId,
                bidderId: data.bid.bidderId,
                bidderUsername: data.bid.bidderUsername,
                amount: data.bid.amount,
                placedAt: data.bid.placedAt,
                isAutoBid: data.bid.isAutoBid,
                triggeredExtension: data.triggeredExtension,
            });

            if (data.triggeredExtension) {
                store.extendAuctionLive(data.auctionId, data.newEndsAt);
            }

            const currentAuction = store.currentAuction;

            if (currentAuction?.id === data.auctionId) {
                const myBids = store.myBids.find(b => b.auctionId === data.auctionId);
                const currentUserId = useAuthStore.getState().user?.uid;

                if (currentUserId && currentUserId !== data.bid.bidderId && myBids) {
                    store.markOutbid(data.auctionId);
                }
            }
        });

        this.connection.on('auction_ended', (data: { auctionId: string }) => {
            useAuctionStore.getState().endAuctionLive(data.auctionId);
        });

        this.connection.onreconnected(() => {
            if (this.currentAuctionId)
                this.joinAuction(this.currentAuctionId);
        });

        this.connection.on('auction_updated', (data: {
            auctionId: string;
            currentPrice: number;
            bidCount: number;
            endsAt: string;
        }) => {
            const store = useAuctionStore.getState();
            store.setAuctions(
                store.auctions.map(a =>
                    a.id === data.auctionId
                        ? { ...a, currentPrice: data.currentPrice, bidCount: data.bidCount, endsAt: data.endsAt }
                        : a
                )
            );
        });

        this.connection.on('auction_closed', (data: { auctionId: string }) => {
            const store = useAuctionStore.getState();
            store.setAuctions(
                store.auctions.map(a =>
                    a.id === data.auctionId ? { ...a, status: 'ended' } : a
                )
            );
        });

        this.connection.onreconnected(() => {
            if (this.currentAuctionId)
                this.joinAuction(this.currentAuctionId);
        });
    }
}

export const auctionSignalR = new AuctionSignalRService();