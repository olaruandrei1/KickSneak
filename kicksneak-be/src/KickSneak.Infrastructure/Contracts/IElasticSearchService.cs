using KickSneak.Domain.DTOs.Search;

namespace KickSneak.Infrastructure.Contracts;

public interface IElasticSearchService
{
    Task EnsureIndexAsync(CancellationToken ct = default);
    Task IndexProductAsync(ProductSearchDocument doc, CancellationToken ct = default);
    Task BulkIndexAsync(IEnumerable<ProductSearchDocument> docs, CancellationToken ct = default);
    Task DeleteProductAsync(Guid productId, CancellationToken ct = default);
    Task<SearchProductsResponse> SearchAsync(SearchProductsRequest request, CancellationToken ct = default);
}
