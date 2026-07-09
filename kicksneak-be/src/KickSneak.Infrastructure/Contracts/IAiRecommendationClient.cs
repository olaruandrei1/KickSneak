namespace KickSneak.Infrastructure.Contracts;

/// <summary>
/// Client for the Python AI service (recommender / reranker) at AI_SERVICE_URL.
/// All calls are best-effort: on any failure they return empty so callers can fall back.
/// </summary>
public interface IAiRecommendationClient
{
    /// <summary>Returns product ids recommended for the user, best-first. Empty on failure.</summary>
    Task<IReadOnlyList<Guid>> GetRecommendedProductIdsAsync(string userId, int limit, CancellationToken ct = default);
}
