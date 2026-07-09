namespace KickSneak.Notifications.Infrastructure;

public interface INotificationStore
{
    /// <summary>Insert an in-app notification row into the notifications table.</summary>
    Task InsertInAppAsync(Guid userId, string type, string title, string body, CancellationToken ct);
}
