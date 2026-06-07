using KickSneak.Application.Contracts.Application;
using KickSneak.Application.Contracts.Persistence;
using KickSneak.Domain.DTOs.Notifications;
using KickSneak.Domain.Entities.Notifications;

namespace KickSneak.Application.Implementations;

public sealed class NotificationService(IUnitOfWork uow) : INotificationService
{
    public async Task<NotificationsResponseDto> GetNotificationsAsync(string firebaseUid, CancellationToken ct = default)
    {
        var user = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid, ct);
        if (user is null) return new NotificationsResponseDto(0, []);

        var notifications = await uow.Notifications.GetAsync(n => n.UserId == user.Id, ct);
        var ordered = notifications.OrderByDescending(n => n.CreatedAt).Take(20).ToList();

        var dtos = ordered.Select(n => new NotificationDto(
            Id: n.Id,
            Type: n.Type ?? "system",
            Title: n.Title ?? string.Empty,
            Message: n.Body ?? string.Empty,
            Href: "/",
            Read: n.IsRead,
            CreatedAt: n.CreatedAt.ToString("o")
        )).ToList();

        return new NotificationsResponseDto(
            UnreadCount: dtos.Count(n => !n.Read),
            Items: dtos
        );
    }

    public async Task MarkReadAsync(string firebaseUid, Guid notificationId, CancellationToken ct = default)
    {
        var user = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid, ct);
        if (user is null) return;

        var notification = await uow.Notifications.GetFirstOrDefaultAsync(
            n => n.Id == notificationId && n.UserId == user.Id, ct);

        if (notification is null) return;

        notification.IsRead = true;
        notification.ModifiedAt = DateTime.UtcNow;
        uow.Notifications.Update(notification);
        await uow.SaveChangesAsync(ct);
    }

    public async Task MarkAllReadAsync(string firebaseUid, CancellationToken ct = default)
    {
        var user = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid, ct);
        if (user is null) return;

        var notifications = await uow.Notifications.GetAsync(
            n => n.UserId == user.Id && !n.IsRead, ct);

        foreach (var n in notifications)
        {
            n.IsRead = true;
            n.ModifiedAt = DateTime.UtcNow;
            uow.Notifications.Update(n);
        }

        await uow.SaveChangesAsync(ct);
    }

    public async Task PushNotificationAsync(string firebaseUid, string type, string title, string message, string href, CancellationToken ct = default)
    {
        var user = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid, ct);
        if (user is null) return;

        await uow.Notifications.AddAsync(new Notification
        {
            UserId = user.Id,
            Type = type,
            Title = title,
            Body = message,
            IsRead = false
        }, ct);

        await uow.SaveChangesAsync(ct);
    }
}
