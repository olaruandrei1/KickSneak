namespace KickSneak.Domain.DTOs.Notifications;

public record NotificationDto(
    Guid Id,
    string Type,
    string Title,
    string Message,
    string Href,
    bool Read,
    string CreatedAt
);
