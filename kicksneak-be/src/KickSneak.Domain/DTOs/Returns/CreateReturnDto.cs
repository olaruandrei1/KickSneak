namespace KickSneak.Domain.DTOs.Returns;

public record CreateReturnDto(
    Guid OrderId,
    string Reason,
    string? Description
);
