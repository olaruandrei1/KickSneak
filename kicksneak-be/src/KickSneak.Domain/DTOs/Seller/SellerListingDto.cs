namespace KickSneak.Domain.DTOs.Seller;

public record SellerListingDto(
    Guid Id,
    string Name,
    string Brand,
    string Size,
    double Price,
    string Status,
    int Views,
    string Image,
    string ListedAt
);

public record SellerListingsResponseDto(List<SellerListingDto> Items);
