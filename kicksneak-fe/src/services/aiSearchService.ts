import { httpClient } from './axiosService';

const AI_BASE_URL = import.meta.env.VITE_AI_SEARCH_URL ?? 'http://localhost:5050';

export interface AiScoredItem {
    id: string;
    score: number;
}

interface AiResponse {
    items: AiScoredItem[];
}

export const aiSearchService = {
    async rerank(
        query: string,
        candidateIds: string[],
        userId?: string | null,
        limit = 10,
    ): Promise<AiScoredItem[]> {
        try {
            const res = await httpClient.post<AiResponse>(
                `${AI_BASE_URL}/api/rerank`,
                {
                    query,
                    user_id: userId ?? null,
                    candidate_ids: candidateIds,
                    limit,
                },
            );
            return res.data.items;
        } catch {
            console.warn('[AI Rerank] Flask unavailable, keeping Elastic order');
            return [];
        }
    },

    async recommend(userId: string, limit = 10): Promise<AiScoredItem[]> {
        try {
            const res = await httpClient.post<AiResponse>(
                `${AI_BASE_URL}/api/recommend`,
                { user_id: userId, limit },
            );
            return res.data.items;
        } catch {
            console.warn('[AI Recommend] Flask unavailable, falling back to empty');
            return [];
        }
    },
};