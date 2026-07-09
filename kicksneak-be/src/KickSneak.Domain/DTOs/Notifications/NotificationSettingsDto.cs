namespace KickSneak.Domain.DTOs.Notifications;

public record NotificationSettingsDto(bool PriceDrop, bool NewReleases, bool OrderUpdates, bool Marketing);

public record PushSubscriptionDto(string Endpoint, string P256dh, string Auth);

public record BroadcastRequestDto(
    string Title,
    string Body,
    string? Type,
    string Target,        // "all" | "sellers" | "role" | "user"
    Guid? RoleId,
    Guid? UserId,
    string? Href = null   // in-app / web-push click destination
);

public record BroadcastResultDto(bool Success, int Count, string? Message);

public record BroadcastHistoryDto(
    Guid Id,
    string Title,
    string Body,
    string? Type,
    string Target,
    int RecipientCount,
    string CreatedAt
);
