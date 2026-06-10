import { HubConnectionBuilder, HubConnection, HubConnectionState } from '@microsoft/signalr';

export interface SearchHit {
    id: string;
    title: string;
    brand: string;
    category: string;
    price: number;
    image: string;
    sold: number;
    isNew: boolean;
    score: number;
}

export interface SearchResponse {
    items: SearchHit[];
    total: number;
    tookMs: number;
}

type SearchResultsCallback = (response: SearchResponse) => void;

class SearchHubService {
    private connection: HubConnection | null = null;
    private onResultsCallback: SearchResultsCallback | null = null;

    async ensureConnection(): Promise<void> {
        if (this.connection?.state === HubConnectionState.Connected) return;

        this.connection = new HubConnectionBuilder()
            .withUrl(`${import.meta.env.VITE_API_BASE_URL}/hubs/search`)
            .withAutomaticReconnect()
            .build();

        this.connection.on('SearchResults', (response: SearchResponse) => {
            this.onResultsCallback?.(response);
        });

        await this.connection.start();
    }

    onResults(callback: SearchResultsCallback) {
        this.onResultsCallback = callback;
    }

    async search(
        query: string,
        brand?: string | null,
        category?: string | null,
        gender?: string | null,
        minPrice?: number | null,
        maxPrice?: number | null,
    ): Promise<void> {
        await this.ensureConnection();
        await this.connection!.invoke(
            'Search',
            query,
            brand ?? null,
            category ?? null,
            gender ?? null,
            minPrice ?? null,
            maxPrice ?? null,
        );
    }

    async disconnect(): Promise<void> {
        if (this.connection?.state === HubConnectionState.Connected) {
            await this.connection.stop();
        }
        this.connection = null;
        this.onResultsCallback = null;
    }
}

export const searchHubService = new SearchHubService();