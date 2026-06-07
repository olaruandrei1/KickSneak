using KickSneak.Application.Contracts.Application;
using KickSneak.Application.Contracts.Persistence;
using KickSneak.Domain.Enums;
using Microsoft.Extensions.DependencyInjection;
using Quartz;

namespace KickSneak.BackgroundServices.Jobs;

[DisallowConcurrentExecution]
public sealed class AuctionCloseJob(IServiceScopeFactory scopeFactory) : IJob
{
    public async Task Execute(IJobExecutionContext context)
    {
        var scope = scopeFactory.CreateScope();

        try
        {
            var uow = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
            var auctionService = scope.ServiceProvider.GetRequiredService<IAuctionService>();

            var expired = await uow.Auctions.GetAsync(
                a => a.Status == AuctionStatus.Active && a.EndsAt <= DateTime.UtcNow,
                context.CancellationToken);

            foreach (var auction in expired)
            {
                try
                {
                    await auctionService.CloseAuctionAsync(auction.Id, context.CancellationToken);
                    Console.WriteLine($"[AuctionCloseJob] Closed auction {auction.Id}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[AuctionCloseJob] Failed to close {auction.Id}: {ex.Message}");
                }
            }
        }
        finally
        {
            await ((IAsyncDisposable)scope).DisposeAsync();
        }
    }
}
