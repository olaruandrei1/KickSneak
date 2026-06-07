import { useEffect } from 'react';
import { auctionSignalR } from '../services/auctionSignalRService';
import { useAuthStore } from '../store/authStore';
import { auth } from '../config/firebase';

interface Options {
    auctionId?: string;
    currentUserId?: string;
}

export const useAuctionLiveSync = ({ auctionId }: Options = {}) => {
    const { user } = useAuthStore();

    useEffect(() => {
        if (!auctionId) return;

        let cancelled = false;

        const connect = async () => {
            try {
                const token = user
                    ? await auth.currentUser?.getIdToken()
                    : undefined;

                if (cancelled) return;
                await auctionSignalR.connect(auctionId, token ?? undefined);
            } catch (err) {
                console.warn('[AuctionSignalR] connect failed:', err);
            }
        };

        connect();

        return () => {
            cancelled = true;
            auctionSignalR.disconnect();
        };
    }, [auctionId, user?.uid]);
};