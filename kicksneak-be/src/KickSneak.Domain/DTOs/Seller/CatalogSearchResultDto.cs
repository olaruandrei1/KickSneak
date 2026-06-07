namespace KickSneak.Domain.DTOs.Seller;

public record CatalogSearchResultDto(
    Guid Id, string Name, string Brand, string Image, double RetailPrice
);
