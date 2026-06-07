namespace KickSneak.Domain.DTOs.Returns;

public record ReturnDto(
    Guid Id,
    Guid OrderId,
    string OrderRef,
    string ProductName,
    string ProductImage,
    string Reason,
    string? Description,
    string Status,
    string CreatedAt
);
