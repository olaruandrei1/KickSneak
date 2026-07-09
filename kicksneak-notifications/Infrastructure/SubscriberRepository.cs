using Dapper;
using KickSneak.Notifications.Domain;
using Microsoft.Extensions.Logging;

namespace KickSneak.Notifications.Infrastructure;

public sealed class SubscriberRepository : ISubscriberRepository
{
    private readonly DbConnectionFactory _dbFactory;
    private readonly ILogger<SubscriberRepository> _logger;

    // Maps notification type names to the corresponding boolean column in notification_settings
    private static readonly Dictionary<string, string> TypeToColumn = new(StringComparer.OrdinalIgnoreCase)
    {
        ["PriceDrop"] = "\"PriceDrop\"",
        ["NewReleases"] = "\"NewReleases\"",
        ["OrderUpdates"] = "\"OrderUpdates\"",
        ["Marketing"] = "\"Marketing\"",
    };

    public SubscriberRepository(DbConnectionFactory dbFactory, ILogger<SubscriberRepository> logger)
    {
        _dbFactory = dbFactory;
        _logger = logger;
    }

    public async Task<IReadOnlyList<Subscriber>> GetSubscribersForUserAsync(Guid userId, CancellationToken ct)
    {
        await using var conn = _dbFactory.Create();
        await conn.OpenAsync(ct);

        // ⚠ Column mapping per brief: "PrivateKey" is actually p256dh, "AuthKey" is auth
        var rows = await conn.QueryAsync<SubscriberRow>(
            """
            SELECT "UserId", "Endpoint", "PrivateKey" AS "P256dh", "AuthKey" AS "Auth"
            FROM webpush_subscriptions
            WHERE "UserId" = @UserId AND "IsDeleted" = false
            """,
            new { UserId = userId }
        );

        return rows.Select(r => new Subscriber(r.UserId, r.Endpoint, r.P256dh, r.Auth)).ToList();
    }

    public async Task<bool> IsNotificationTypeEnabledAsync(Guid userId, string type, CancellationToken ct)
    {
        if (!TypeToColumn.TryGetValue(type, out var column))
        {
            _logger.LogWarning("[Subscriber] Unknown notification type '{Type}', defaulting to enabled", type);
            return true; // unknown type = don't block
        }

        await using var conn = _dbFactory.Create();
        await conn.OpenAsync(ct);

        var sql = $"""
            SELECT {column} FROM notification_settings WHERE "UserId" = @UserId LIMIT 1
            """;

        var result = await conn.QueryFirstOrDefaultAsync<bool?>(sql, new { UserId = userId });
        return result ?? true; // No settings row = everything enabled by default
    }

    public async Task<IReadOnlyList<Guid>> GetAllSubscribedUserIdsAsync(CancellationToken ct)
    {
        await using var conn = _dbFactory.Create();
        await conn.OpenAsync(ct);

        var rows = await conn.QueryAsync<Guid>(
            """
            SELECT DISTINCT "UserId" FROM webpush_subscriptions WHERE "IsDeleted" = false
            """
        );

        return rows.ToList();
    }

    public async Task MarkSubscriptionDeletedAsync(string endpoint, CancellationToken ct)
    {
        await using var conn = _dbFactory.Create();
        await conn.OpenAsync(ct);

        await conn.ExecuteAsync(
            """
            UPDATE webpush_subscriptions SET "IsDeleted" = true WHERE "Endpoint" = @Endpoint
            """,
            new { Endpoint = endpoint }
        );

        _logger.LogInformation("[Subscriber] Marked expired subscription as deleted: {Endpoint}", endpoint[..Math.Min(60, endpoint.Length)]);
    }

    // Internal DTO for Dapper mapping
    private sealed record SubscriberRow(Guid UserId, string Endpoint, string P256dh, string Auth);
}
