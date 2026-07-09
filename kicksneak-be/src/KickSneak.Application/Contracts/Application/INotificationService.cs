using KickSneak.Domain.DTOs.Notifications;

namespace KickSneak.Application.Contracts.Application;

public interface INotificationService
{
    Task<NotificationsResponseDto> GetNotificationsAsync(string firebaseUid, CancellationToken ct = default);
    Task MarkReadAsync(string firebaseUid, Guid notificationId, CancellationToken ct = default);
    Task MarkAllReadAsync(string firebaseUid, CancellationToken ct = default);
    Task PushNotificationAsync(string firebaseUid, string type, string title, string message, string href, CancellationToken ct = default);

    Task<NotificationSettingsDto> GetSettingsAsync(string firebaseUid, CancellationToken ct = default);
    Task<NotificationSettingsDto> UpdateSettingsAsync(string firebaseUid, NotificationSettingsDto dto, CancellationToken ct = default);
    Task<BroadcastResultDto> BroadcastAsync(BroadcastRequestDto dto, CancellationToken ct = default);
    Task<List<BroadcastHistoryDto>> GetBroadcastsAsync(CancellationToken ct = default);
    Task SaveSubscriptionAsync(string firebaseUid, PushSubscriptionDto dto, CancellationToken ct = default);
}
