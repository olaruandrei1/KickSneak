using KickSneak.Domain.DTOs.Search;
using KickSneak.Infrastructure.Contracts;

namespace KickSneak.WebApi.Endpoints;

public static class SearchEndpoints
{
    public static void MapSearchEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/search").WithTags("Search");

        group.MapGet("/", async (
            string q,
            string? brand,
            string? category,
            string? gender,
            double? minPrice,
            double? maxPrice,
            int? size,
            IElasticSearchService elastic,
            CancellationToken ct
        ) =>
        {
            if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
                return Results.Ok(new SearchProductsResponse([], 0, 0));

            var response = await elastic.SearchAsync(new SearchProductsRequest(
                Query: q,
                Brand: brand,
                Category: category,
                Gender: gender,
                MinPrice: minPrice,
                MaxPrice: maxPrice,
                Size: size ?? 10
            ), ct);

            return Results.Ok(response);
        });
    }
}