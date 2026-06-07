namespace KickSneak.Domain.DTOs.Products;

public record RecommendedProductsDto(
    string Title,
    List<ProductItemDto> Items
);
