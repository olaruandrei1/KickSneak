namespace KickSneak.Domain.DTOs.Products;

public record ProductsPagedResponseDto(
    List<ProductItemDto> Items,
    int Total,
    int Page,
    int PageSize
);
