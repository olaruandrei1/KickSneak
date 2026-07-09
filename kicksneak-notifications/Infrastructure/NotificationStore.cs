using Dapper;
using Microsoft.Extensions.Logging;

namespace KickSneak.Notifications.Infrastructure;

public sealed class NotificationStore : INotificationStore
{
    private readonly DbConnectionFactory _dbFactory;
    private readonly ILogger<NotificationStore> _logger;

    public NotificationStore(DbConnectionFactory dbFactory, ILogger<NotificationStore> logger)
    {
        _dbFactory = dbFactory;
        _logger = logger;
    }

    public async Task InsertInAppAsync(Guid userId, string type, string title, string body, CancellationToken ct)
    {
        await using var conn = _dbFactory.Create();
        await conn.OpenAsync(ct);

        await conn.ExecuteAsync(
            """
            INSERT INTO notifications ("UserId", "Type", "Title", "Body", "IsRead", "IsDeleted", "CreatedAt")
            VALUES (@UserId, @Type, @Title, @Body, false, false, now())
            """,
            new { UserId = userId, Type = type, Title = title, Body = body }
        );

        _logger.LogDebug("[NotifStore] Inserted in-app notification for user {UserId}: {Title}", userId, title);
    }
}
