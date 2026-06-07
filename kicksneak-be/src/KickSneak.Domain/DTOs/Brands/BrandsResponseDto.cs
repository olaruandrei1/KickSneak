namespace KickSneak.Domain.DTOs.Brands;

public record BrandsResponseDto(
    List<BrandDto> Featured,
    List<BrandDto> Luxury,
    List<BrandDto> Apparel
);