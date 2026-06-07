namespace KickSneak.Domain.DTOs.Notifications;

public record NotificationsResponseDto(
    int UnreadCount,
    List<NotificationDto> Items
);
