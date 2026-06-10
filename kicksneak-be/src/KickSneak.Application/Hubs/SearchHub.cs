using KickSneak.Domain.DTOs.Search;
using KickSneak.Infrastructure.Contracts;
using Microsoft.AspNetCore.SignalR;

namespace KickSneak.Application.Hubs;


public sealed class SearchHub(IElasticSearchService elastic) : Hub
{
    public async Task Search(string query, string? brand, string? category, string? gender, double? minPrice, double? maxPrice)
    {
        if (string.IsNullOrWhiteSpace(query) || query.Length < 2)
        {
            await Clients.Caller.SendAsync("SearchResults", new SearchProductsResponse([], 0, 0));
            return;
        }

        var results = await elastic.SearchAsync(new SearchProductsRequest(
            Query: query,
            Brand: brand,
            Category: category,
            Gender: gender,
            MinPrice: minPrice,
            MaxPrice: maxPrice,
            Size: 10
        ));

        await Clients.Caller.SendAsync("SearchResults", results);
    }
}
