using KickSneak.Application.Contracts.Application;
using KickSneak.Domain.DTOs.Notifications;
using Microsoft.AspNetCore.SignalR;

namespace KickSneak.Application.Hubs;

public interface INotificationPusher
{
    Task PushAsync(string firebaseUid, NotificationDto notification);
}

public sealed class NotificationPusher(IHubContext<NotificationHub> hub, INotificationService notificationService) : INotificationPusher
{
    public async Task PushAsync(string firebaseUid, NotificationDto notification)
    {
        await notificationService.PushNotificationAsync(
            firebaseUid,
            notification.Type,
            notification.Title,
            notification.Message,
            notification.Href
        );

        await hub.Clients
            .Group($"user:{firebaseUid}")
            .SendAsync("new_notification", new { payload = new { notification } });
    }
}
