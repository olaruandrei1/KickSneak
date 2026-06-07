type WsEventType =
    | 'item_unavailable'
    | 'item_price_update'
    | 'size_update'
    | 'color_update'
    | 'new_notification'
    | 'auction_new_bid'
    | 'auction_extended'
    | 'auction_ended'
    | 'auction_outbid'
    | 'auction_won'
    | 'auction_reserve_met';

interface WsEvent {
    type: WsEventType;
    itemId: string;
    payload?: Record<string, unknown>;
}

type WsListener = (event: WsEvent) => void;

class WsService {
    private listeners: Map<WsEventType, Set<WsListener>> = new Map();
    private connected = false;

    connect(_userId: string): void {
        if (this.connected) return;
        this.connected = true;
        console.info('[WS] Connected (stub) — swap with SignalR later');
    }

    disconnect(): void {
        this.connected = false;
        this.listeners.clear();
    }

    on(type: WsEventType, listener: WsListener): () => void {
        if (!this.listeners.has(type)) this.listeners.set(type, new Set());
        this.listeners.get(type)!.add(listener);
        return () => this.listeners.get(type)?.delete(listener);
    }

    emit(event: WsEvent): void {
        this.listeners.get(event.type)?.forEach((fn) => fn(event));
    }

    devSimulateUnavailable(itemId: string): void {
        setTimeout(() => this.emit({ type: 'item_unavailable', itemId }), 3000);
    }

    devSimulatePriceChange(itemId: string, newPrice: number, direction: 'up' | 'down'): void {
        setTimeout(() => this.emit({
            type: 'item_price_update',
            itemId,
            payload: { price: newPrice, direction },
        }), 2000);
    }

    devSimulateSizeUpdate(itemId: string, sizes: unknown[]): void {
        setTimeout(() => this.emit({
            type: 'size_update',
            itemId,
            payload: { sizes },
        }), 2500);
    }

    devSimulateColorUpdate(itemId: string, colors: unknown[]): void {
        setTimeout(() => this.emit({
            type: 'color_update',
            itemId,
            payload: { colors },
        }), 3000);
    }

    devSimulateNotification(notification: unknown): void {
        setTimeout(() => this.emit({
            type: 'new_notification',
            itemId: 'system',
            payload: { notification },
        }), 1500);
    }

    devSimulateAuctionNewBid(
        auctionId: string,
        bidderUsername: string,
        amount: number,
        opts?: { isAutoBid?: boolean; triggeredExtension?: boolean; delayMs?: number }
    ): void {
        const bid = {
            id: `bid_sim_${Date.now()}`,
            auctionId,
            bidderId: `user_sim_${Date.now()}`,
            bidderUsername,
            amount,
            placedAt: new Date().toISOString(),
            isAutoBid: opts?.isAutoBid ?? false,
            triggeredExtension: opts?.triggeredExtension ?? false,
        };
        setTimeout(() => this.emit({
            type: 'auction_new_bid',
            itemId: auctionId,
            payload: { bid, newCurrentPrice: amount },
        }), opts?.delayMs ?? 1500);
    }

    devSimulateAuctionExtended(
        auctionId: string,
        addMinutes = 1,
        triggeredByBidId = 'bid_sim_trigger'
    ): void {
        setTimeout(() => this.emit({
            type: 'auction_extended',
            itemId: auctionId,
            payload: { addMinutes, triggeredByBidId },
        }), 2000);
    }

    devSimulateAuctionEnded(
        auctionId: string,
        finalPrice: number,
        opts?: { winnerId?: string; winnerUsername?: string; reserveMet?: boolean }
    ): void {
        setTimeout(() => this.emit({
            type: 'auction_ended',
            itemId: auctionId,
            payload: {
                finalPrice,
                winnerId: opts?.winnerId,
                winnerUsername: opts?.winnerUsername,
                reserveMet: opts?.reserveMet ?? true,
            },
        }), 1500);
    }

    devSimulateAuctionOutbid(
        auctionId: string,
        productName: string,
        newCurrentPrice: number,
        yourPreviousBid: number
    ): void {
        setTimeout(() => this.emit({
            type: 'auction_outbid',
            itemId: auctionId,
            payload: { productName, newCurrentPrice, yourPreviousBid },
        }), 1800);
    }

    devSimulateAuctionWon(
        auctionId: string,
        productName: string,
        finalPrice: number
    ): void {
        setTimeout(() => this.emit({
            type: 'auction_won',
            itemId: auctionId,
            payload: { productName, finalPrice },
        }), 1500);
    }

    devSimulateAuctionReserveMet(auctionId: string): void {
        setTimeout(() => this.emit({
            type: 'auction_reserve_met',
            itemId: auctionId,
        }), 1500);
    }
}

export const wsService = new WsService();