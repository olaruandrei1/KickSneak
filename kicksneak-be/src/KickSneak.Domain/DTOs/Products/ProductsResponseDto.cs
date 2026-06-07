namespace KickSneak.Domain.DTOs.Products;

public record ProductsResponseDto(List<ProductItemDto> Items, int Total);
