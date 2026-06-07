namespace KickSneak.Domain.DTOs.Seller;

public record CreateListingDto(
    Guid ProductId,
    string SizeLabel,
    double Price,
    string Condition,
    string? Description,
    string? ImageUrl
);
