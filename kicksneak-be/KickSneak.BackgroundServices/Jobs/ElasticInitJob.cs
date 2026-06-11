using KickSneak.Application.Contracts.Persistence;
using KickSneak.Domain.Extensions;
using KickSneak.Infrastructure.Contracts;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace KickSneak.BackgroundServices.Jobs;

public sealed class ElasticInitJob : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ElasticInitJob> _logger;

    public ElasticInitJob(IServiceScopeFactory scopeFactory, ILogger<ElasticInitJob> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);

        try
        {
            await using var scope = _scopeFactory.CreateAsyncScope();
            var elastic = scope.ServiceProvider.GetRequiredService<IElasticSearchService>();
            var uow = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

            _logger.LogInformation("Ensuring Elastic index...");
            await elastic.EnsureIndexAsync(stoppingToken);

            _logger.LogInformation("Bulk indexing products from DB...");
            var products = await uow.Products.GetAllAsync(stoppingToken,
                p => p.Brand, p => p.Photos, p => p.StockItems, p => p.Category,
                p => p.Color, p => p.Material, p => p.Gender, p => p.Fit);

            var docs = products.Select(p => p.ToSearchDocument()).ToList();

            if (docs.Count > 0)
            {
                await elastic.BulkIndexAsync(docs, stoppingToken);
                _logger.LogInformation("Bulk indexed {Count} products", docs.Count);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Elastic init failed");
        }
    }
}