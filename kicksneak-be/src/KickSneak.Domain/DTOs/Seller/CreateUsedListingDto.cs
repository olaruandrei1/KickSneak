namespace KickSneak.Domain.DTOs.Seller;

public record CreateUsedListingDto(
    Guid ProductId, string SizeLabel, double Price,
    int Condition, string? Description
);
