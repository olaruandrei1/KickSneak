using KickSneak.Domain.DTOs.Notifications;

namespace KickSneak.Application.Contracts.Application;

public interface INotificationService
{
    Task<NotificationsResponseDto> GetNotificationsAsync(string firebaseUid, CancellationToken ct = default);
    Task MarkReadAsync(string firebaseUid, Guid notificationId, CancellationToken ct = default);
    Task MarkAllReadAsync(string firebaseUid, CancellationToken ct = default);
    Task PushNotificationAsync(string firebaseUid, string type, string title, string message, string href, CancellationToken ct = default);
}
