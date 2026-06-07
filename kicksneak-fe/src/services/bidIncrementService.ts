import type { Auction, AuctionDetail } from '../types/auction';

export const ANTI_SNIPE_CONFIG = {
    EXTENSION_MINUTES: 1,
    TRIGGER_WINDOW_MINUTES: 2,
    SERIOUS_BID_DIVISOR: 10,
    MIN_INCREMENT: 1,
} as const;

export const calculateSeriousBidThreshold = (currentPrice: number): number => {
    return Math.ceil(currentPrice / ANTI_SNIPE_CONFIG.SERIOUS_BID_DIVISOR);
};

export const calculateMinValidBid = (currentPrice: number): number => {
    return currentPrice + ANTI_SNIPE_CONFIG.MIN_INCREMENT;
};

export const wouldTriggerExtension = (
    bidAmount: number,
    auction: Pick<Auction, 'currentPrice' | 'endsAt'>
): boolean => {
    const threshold = calculateSeriousBidThreshold(auction.currentPrice);
    const isSerious = bidAmount >= auction.currentPrice + threshold;

    const now = Date.now();
    const endsAt = new Date(auction.endsAt).getTime();
    const minutesLeft = (endsAt - now) / 60_000;
    const isInWindow =
        minutesLeft > 0 && minutesLeft <= ANTI_SNIPE_CONFIG.TRIGGER_WINDOW_MINUTES;

    return isSerious && isInWindow;
};

export type BidValidationResult =
    | { valid: true }
    | { valid: false; reason: string };

export const validateBidClientSide = (
    bidAmount: number,
    auction: Pick<AuctionDetail, 'currentPrice' | 'status' | 'endsAt' | 'seller'>,
    currentUserId?: string
): BidValidationResult => {
    if (auction.status === 'ended' || auction.status === 'cancelled') {
        return { valid: false, reason: 'This auction has ended.' };
    }

    if (new Date(auction.endsAt).getTime() <= Date.now()) {
        return { valid: false, reason: 'This auction has just ended.' };
    }

    if (currentUserId && auction.seller.id === currentUserId) {
        return { valid: false, reason: 'You cannot bid on your own auction.' };
    }

    if (!Number.isFinite(bidAmount) || bidAmount <= 0) {
        return { valid: false, reason: 'Enter a valid bid amount.' };
    }

    const minValid = calculateMinValidBid(auction.currentPrice);
    if (bidAmount < minValid) {
        return {
            valid: false,
            reason: `Minimum bid is $${minValid} (current $${auction.currentPrice} + $${ANTI_SNIPE_CONFIG.MIN_INCREMENT}).`,
        };
    }

    return { valid: true };
};

export const validateAutoBidMax = (
    maxAmount: number,
    currentPrice: number
): BidValidationResult => {
    if (!Number.isFinite(maxAmount) || maxAmount <= 0) {
        return { valid: false, reason: 'Enter a valid max amount.' };
    }
    const minValid = calculateMinValidBid(currentPrice);
    if (maxAmount < minValid) {
        return {
            valid: false,
            reason: `Max must be at least $${minValid}.`,
        };
    }
    return { valid: true };
};

export const describeAntiSnipeImpact = (
    bidAmount: number,
    auction: Pick<Auction, 'currentPrice' | 'endsAt'>
): string | null => {
    if (wouldTriggerExtension(bidAmount, auction)) {
        return `This bid will extend the auction by ${ANTI_SNIPE_CONFIG.EXTENSION_MINUTES} minute.`;
    }
    return null;
};

export const formatTimeRemaining = (endsAt: string): {
    text: string;
    isUrgent: boolean;
    isFinalMinute: boolean;
    hasEnded: boolean;
} => {
    const now = Date.now();
    const end = new Date(endsAt).getTime();
    const diff = end - now;

    if (diff <= 0) {
        return { text: 'Ended', isUrgent: false, isFinalMinute: false, hasEnded: true };
    }

    const days = Math.floor(diff / 86_400_000);
    const hours = Math.floor((diff % 86_400_000) / 3_600_000);
    const minutes = Math.floor((diff % 3_600_000) / 60_000);
    const seconds = Math.floor((diff % 60_000) / 1000);

    const isFinalMinute = diff <= 60_000;
    const isUrgent = diff <= 5 * 60_000;

    let text: string;
    if (days > 0) text = `${days}d ${hours}h`;
    else if (hours > 0) text = `${hours}h ${minutes}m`;
    else if (minutes > 0) text = `${minutes}m ${seconds}s`;
    else text = `${seconds}s`;

    return { text, isUrgent, isFinalMinute, hasEnded: false };
};