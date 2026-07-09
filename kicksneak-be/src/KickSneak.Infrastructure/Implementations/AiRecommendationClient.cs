using System.Net.Http.Json;
using KickSneak.Infrastructure.Contracts;
using Microsoft.Extensions.Logging;

namespace KickSneak.Infrastructure.Implementations;

public sealed class AiRecommendationClient : IAiRecommendationClient
{
    private readonly HttpClient _http;
    private readonly ILogger<AiRecommendationClient> _logger;

    public AiRecommendationClient(HttpClient http, ILogger<AiRecommendationClient> logger)
    {
        _http = http;
        _logger = logger;
    }

    public async Task<IReadOnlyList<Guid>> GetRecommendedProductIdsAsync(string userId, int limit, CancellationToken ct = default)
    {
        try
        {
            var resp = await _http.PostAsJsonAsync("/api/recommend", new { user_id = userId, limit }, ct);
            if (!resp.IsSuccessStatusCode)
                return [];

            var data = await resp.Content.ReadFromJsonAsync<RecommendResponse>(cancellationToken: ct);

            return data?.Items?
                .Select(i => Guid.TryParse(i.Id, out var g) ? g : (Guid?)null)
                .Where(g => g.HasValue)
                .Select(g => g!.Value)
                .ToList() ?? [];
        }
        catch (Exception ex)
        {
            // Best-effort: AI service down / cold → caller falls back to DB recommendations.
            _logger.LogWarning(ex, "AI recommend call failed for user {UserId}", userId);
            return [];
        }
    }

    private sealed record RecommendResponse(List<RecommendItem>? Items);
    private sealed record RecommendItem(string Id, double Score);
}
