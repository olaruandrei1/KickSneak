using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using KickSneak.Application.Hubs;
using KickSneak.Application.Contracts.Application;
using KickSneak.Application.Contracts.Persistence;
using KickSneak.Domain.DTOs.Notifications;
using KickSneak.Domain.Entities.Notifications;
using KickSneak.Domain.Entities.Users;
using KickSneak.Infrastructure.Contracts;

namespace KickSneak.Application.Implementations;

public sealed class NotificationService(IUnitOfWork uow, IWebPushSender pushSender, IHubContext<NotificationHub> notificationHub) : INotificationService
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
            Href: string.IsNullOrWhiteSpace(n.Href) ? "/" : n.Href,
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
            Href = href,
            IsRead = false
        }, ct);

        await uow.SaveChangesAsync(ct);
    }

    // Opt-in: all OFF by default (user turns categories on; first enable triggers push subscribe).
    private static NotificationSettingsDto Defaults => new(false, false, false, false);

    public async Task<NotificationSettingsDto> GetSettingsAsync(string firebaseUid, CancellationToken ct = default)
    {
        var user = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid, ct);
        if (user is null) return Defaults;

        var s = await uow.NotificationSettings.GetFirstOrDefaultAsync(x => x.UserId == user.Id, ct);
        return s is null
            ? Defaults
            : new NotificationSettingsDto(s.PriceDrop, s.NewReleases, s.OrderUpdates, s.Marketing);
    }

    public async Task<NotificationSettingsDto> UpdateSettingsAsync(string firebaseUid, NotificationSettingsDto dto, CancellationToken ct = default)
    {
        var user = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid, ct);
        if (user is null) return dto;

        var s = await uow.NotificationSettings.GetFirstOrDefaultAsync(x => x.UserId == user.Id, ct);
        if (s is null)
        {
            s = new NotificationSetting { UserId = user.Id };
            Apply(dto, s);
            await uow.NotificationSettings.AddAsync(s, ct);
        }
        else
        {
            Apply(dto, s);
            uow.NotificationSettings.Update(s);
        }

        await uow.SaveChangesAsync(ct);
        return new NotificationSettingsDto(s.PriceDrop, s.NewReleases, s.OrderUpdates, s.Marketing);

        static void Apply(NotificationSettingsDto d, NotificationSetting e)
        {
            e.PriceDrop = d.PriceDrop;
            e.NewReleases = d.NewReleases;
            e.OrderUpdates = d.OrderUpdates;
            e.Marketing = d.Marketing;
        }
    }

    public async Task<BroadcastResultDto> BroadcastAsync(BroadcastRequestDto dto, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.Body))
            return new BroadcastResultDto(false, 0, "Title and body are required");

        IReadOnlyList<User> targets = [];

        // Elevated: fan out notifications to arbitrary users (RLS would block ks_user).
        await uow.ExecuteElevatedAsync(async () =>
        {
            if (dto.Target == "sellers")
            {
                var sellerUserIds = (await uow.Sellers.GetAsync(s => !s.IsDeleted, ct))
                    .Select(s => s.UserId).ToHashSet();
                targets = await uow.Users.GetAsync(u => sellerUserIds.Contains(u.Id) && !u.IsDeleted, ct);
            }
            else
            {
                targets = dto.Target switch
                {
                    "user" when dto.UserId is Guid uid => await uow.Users.GetAsync(u => u.Id == uid && !u.IsDeleted, ct),
                    "role" when dto.RoleId is Guid rid => await uow.Users.GetAsync(u => u.RoleId == rid && !u.IsDeleted, ct),
                    _ => await uow.Users.GetAsync(u => !u.IsDeleted, ct)
                };
            }

            if (targets.Count == 0) return; // Exit early but no return value inside lambda

            var type = string.IsNullOrWhiteSpace(dto.Type) ? "marketing" : dto.Type;

            var broadcast = new NotificationBroadcast
            {
                Title = dto.Title,
                Body = dto.Body,
                Type = type,
                Target = dto.Target,
                RecipientCount = targets.Count,
                CreatedBy = "admin"
            };

            await uow.NotificationBroadcasts.AddAsync(broadcast, ct);
            foreach (var u in targets)
            {
                await uow.Notifications.AddAsync(new Notification
                {
                    UserId = u.Id,
                    Type = type,
                    Title = dto.Title,
                    Body = dto.Body,
                    Href = dto.Href,
                    IsRead = false
                }, ct);
            }
        }, ct);

        if (targets.Count == 0)
            return new BroadcastResultDto(false, 0, "No recipients matched");

        var href = string.IsNullOrWhiteSpace(dto.Href) ? "/" : dto.Href;

        // Best-effort browser push (outside the transaction).
        await SendPushAsync(targets.Select(u => u.Id).ToList(), dto.Title, dto.Body, href, ct);

        // Live SignalR Notification to connected users
        var userGroups = targets.Select(u => $"user:{u.FirebaseUid}").ToList();
        if (userGroups.Count > 0)
        {
            await notificationHub.Clients.Groups(userGroups).SendAsync("ReceiveNotification", new
            {
                title = dto.Title,
                message = dto.Body,
                type = dto.Type,
                href,
                createdAt = DateTime.UtcNow
            }, ct);
        }

        return new BroadcastResultDto(true, targets.Count, null);
    }

    public async Task SaveSubscriptionAsync(string firebaseUid, PushSubscriptionDto dto, CancellationToken ct = default)
    {
        var user = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid, ct);
        if (user is null) return;

        var existing = await uow.PushSubscriptions.GetFirstOrDefaultAsync(
            s => s.UserId == user.Id && s.Endpoint == dto.Endpoint, ct);

        if (existing is null)
        {
            await uow.PushSubscriptions.AddAsync(new WebPushSubscription
            {
                UserId = user.Id,
                Endpoint = dto.Endpoint,
                PrivateKey = dto.P256dh,   // subscription public key (p256dh)
                AuthKey = dto.Auth
            }, ct);
        }
        else
        {
            existing.PrivateKey = dto.P256dh;
            existing.AuthKey = dto.Auth;
            uow.PushSubscriptions.Update(existing);
        }

        await uow.SaveChangesAsync(ct);
    }

    private async Task SendPushAsync(List<Guid> userIds, string title, string body, string url, CancellationToken ct)
    {
        if (userIds.Count == 0) return;

        var subs = await uow.PushSubscriptions.GetAsync(s => userIds.Contains(s.UserId), ct);
        if (subs.Count == 0) return;

        var payload = JsonSerializer.Serialize(new { title, body, url });

        foreach (var s in subs)
        {
            if (!string.IsNullOrEmpty(s.Endpoint) && !string.IsNullOrEmpty(s.PrivateKey) && !string.IsNullOrEmpty(s.AuthKey))
                await pushSender.SendAsync(s.Endpoint!, s.PrivateKey!, s.AuthKey!, payload, ct);
        }
    }

    public async Task<List<BroadcastHistoryDto>> GetBroadcastsAsync(CancellationToken ct = default)
    {
        var list = await uow.NotificationBroadcasts.GetAsync(b => !b.IsDeleted, ct);
        return list
            .OrderByDescending(b => b.CreatedAt)
            .Take(50)
            .Select(b => new BroadcastHistoryDto(
                b.Id, b.Title ?? string.Empty, b.Body ?? string.Empty,
                b.Type, b.Target ?? "all", b.RecipientCount, b.CreatedAt.ToString("o")))
            .ToList();
    }
}
