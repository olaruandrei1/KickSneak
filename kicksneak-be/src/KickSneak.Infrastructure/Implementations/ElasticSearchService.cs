using Elastic.Clients.Elasticsearch;
using Elastic.Clients.Elasticsearch.QueryDsl;
using KickSneak.Domain.DTOs.Search;
using KickSneak.Infrastructure.Contracts;
using Microsoft.Extensions.Logging;

namespace KickSneak.Infrastructure.Implementations;

public sealed class ElasticSearchService(ElasticsearchClient client, ILogger<ElasticSearchService> logger) : IElasticSearchService
{
    private const string IndexName = "kicksneak-products";

    public async Task EnsureIndexAsync(CancellationToken ct = default)
    {
        var exists = await client.Indices.ExistsAsync(IndexName, ct);

        if (exists.Exists)
            return;

        var response = await client.Indices.CreateAsync(IndexName, c => c
            .Mappings(m => m
                .Properties<ProductSearchDocument>(p => p
                    .Keyword(k => k.Id)
                    .Text(t => t.Title, t => t
                        .Analyzer("standard")
                        .Fields(f => f
                            .Keyword(k => k.Title, kd => kd.IgnoreAbove(256))
                        )
                    )
                    .Keyword(k => k.Brand)
                    .Keyword(k => k.Category)
                    .Keyword(k => k.Color)
                    .Keyword(k => k.Material)
                    .Keyword(k => k.Gender)
                    .Keyword(k => k.Fit)
                    .DoubleNumber(d => d.RetailPrice)
                    .DoubleNumber(d => d.LowestAsk)
                    .Text(t => t.Image, t => t.Index(false))
                    .Keyword(k => k.ProductUniversalId)
                    .Text(t => t.ShortDescription, t => t.Analyzer("standard"))
                    .IntegerNumber(i => i.SoldCount)
                    .Boolean(b => b.IsNew)
                    .Date(d => d.ReleaseDate)
                    .Date(d => d.IndexedAt)
                )
            )
            .Settings(s => s
                .NumberOfShards(1)
                .NumberOfReplicas(0)
            ), ct);

        if (!response.IsValidResponse)
            logger.LogError("Failed to create Elastic index: {Reason}", response.DebugInformation);
        else
            logger.LogInformation("Created Elastic index '{Index}'", IndexName);
    }

    public async Task IndexProductAsync(ProductSearchDocument doc, CancellationToken ct = default)
    {
        var response = await client.IndexAsync(doc, i => i
            .Index(IndexName)
            .Id(doc.Id.ToString()), ct);

        if (!response.IsValidResponse)
            logger.LogWarning("Failed to index product {Id}: {Reason}", doc.Id, response.DebugInformation);
    }

    public async Task BulkIndexAsync(IEnumerable<ProductSearchDocument> docs, CancellationToken ct = default)
    {
        var response = await client.BulkAsync(b => b
            .Index(IndexName)
            .IndexMany(docs, (d, doc) => d.Id(doc.Id.ToString())), ct);

        if (response.Errors)
            logger.LogWarning("Bulk index had {Count} errors", response.ItemsWithErrors.Count());
        else
            logger.LogInformation("Bulk indexed {Count} products", response.Items.Count);
    }

    public async Task DeleteProductAsync(Guid productId, CancellationToken ct = default)
    {
        await client.DeleteAsync(IndexName, productId.ToString(), ct);
    }

    public async Task<SearchProductsResponse> SearchAsync(SearchProductsRequest request, CancellationToken ct = default)
    {
        var response = await client.SearchAsync<ProductSearchDocument>(s =>
        {
            s.Indices("kicksneak-products")
             .Size(request.Size)
             .Query(q => q
                 .Bool(b =>
                 {
                     if (!string.IsNullOrWhiteSpace(request.Query))
                     {
                         b.Must(m => m
                             .MultiMatch(mm => mm
                                 .Query(request.Query)
                                 .Fields("title^3,shortDescription,brand^2,category,productUniversalId^2")
                                 .Fuzziness(new Fuzziness("AUTO"))
                                 .Type(TextQueryType.BestFields)
                             )
                         );
                     }

                     var filters = new List<Action<QueryDescriptor<ProductSearchDocument>>>();

                     if (!string.IsNullOrWhiteSpace(request.Brand))
                         filters.Add(f => f.Term(t => t.Field(p => p.Brand).Value(request.Brand)));

                     if (!string.IsNullOrWhiteSpace(request.Category))
                         filters.Add(f => f.Term(t => t.Field(p => p.Category).Value(request.Category)));

                     if (!string.IsNullOrWhiteSpace(request.Gender))
                         filters.Add(f => f.Term(t => t.Field(p => p.Gender).Value(request.Gender)));

                     if (request.MinPrice.HasValue || request.MaxPrice.HasValue)
                     {
                         filters.Add(f => f.Range(r => r
                             .NumberRange(nr => nr
                                 .Field(p => p.LowestAsk)
                                 .Gte(request.MinPrice)
                                 .Lte(request.MaxPrice)
                             )
                         ));
                     }

                     if (filters.Count > 0)
                         b.Filter(filters.ToArray());
                 })
             );
        }, ct);

        if (!response.IsValidResponse)
        {
            logger.LogWarning("Search failed: {Reason}", response.DebugInformation);
            return new SearchProductsResponse([], 0, 0);
        }

        var hits = response.Hits.Select(h => new SearchProductHit(
            Id: h.Source!.Id,
            Title: h.Source.Title,
            Brand: h.Source.Brand,
            Category: h.Source.Category,
            Price: h.Source.LowestAsk,
            Image: h.Source.Image,
            Sold: h.Source.SoldCount,
            IsNew: h.Source.IsNew,
            Score: h.Score ?? 0
        )).ToList();

        return new SearchProductsResponse(
            Items: hits,
            Total: (int)response.Total,
            TookMs: response.Took
        );
    }
}