using KickSneak.Domain.DTOs.Products;

namespace KickSneak.Application.Contracts.Application;

public interface IProductService
{
    Task<ProductsResponseDto> GetNewProductsAsync(CancellationToken ct = default);
    Task<ProductsResponseDto> GetTrendingProductsAsync(CancellationToken ct = default);
    Task<RecommendedProductsDto> GetRecommendedAsync(string? firebaseUid = null, CancellationToken ct = default);
    Task<ProductsResponseDto> GetRecentlyViewedAsync(string firebaseUid, CancellationToken ct = default);
    Task<ProductsPagedResponseDto> SearchProductsPagedAsync(string query, int page = 1, int pageSize = 12, CancellationToken ct = default);
    Task<ProductsResponseDto> SearchProductsAsync(string query, CancellationToken ct = default);
    Task<ProductDetailDto?> GetProductByIdAsync(Guid id, string? firebaseUid = null, CancellationToken ct = default);
    Task TrackViewAsync(string firebaseUid, Guid productId, CancellationToken ct = default);
}
