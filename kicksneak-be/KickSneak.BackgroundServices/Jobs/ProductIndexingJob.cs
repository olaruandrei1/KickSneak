using KickSneak.Application.Contracts.Persistence;
using KickSneak.BackgroundServices.Channels;
using KickSneak.Domain.Events;
using KickSneak.Domain.Extensions;
using KickSneak.Infrastructure.Contracts;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace KickSneak.BackgroundServices.Jobs;

public sealed class ProductIndexingJob(
    ProductIndexChannel channel,
    IServiceScopeFactory scopeFactory,
    ILogger<ProductIndexingJob> logger
) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("ProductIndexingJob started");

        await foreach (var evt in channel.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var elastic = scope.ServiceProvider.GetRequiredService<IElasticSearchService>();

                switch (evt.Action)
                {
                    case ProductIndexAction.Upsert when evt.ProductId.HasValue:
                        var uow = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
                        var product = await uow.Products.GetFirstOrDefaultAsync(
                            p => p.Id == evt.ProductId.Value, stoppingToken,
                            p => p.Brand, p => p.Photos, p => p.StockItems,
                            p => p.Category, p => p.Color, p => p.Material,
                            p => p.Gender, p => p.Fit);

                        if (product is not null)
                        {
                            await elastic.IndexProductAsync(product.ToSearchDocument(), stoppingToken);
                            logger.LogDebug("Indexed product {Id}", product.Id);
                        }
                        break;

                    case ProductIndexAction.Delete when evt.ProductId.HasValue:
                        await elastic.DeleteProductAsync(evt.ProductId.Value, stoppingToken);
                        logger.LogDebug("Deleted product {Id} from index", evt.ProductId);
                        break;
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to process index event");
            }
        }
    }
}