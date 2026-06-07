using KickSneak.Domain.DTOs.Auctions;

namespace KickSneak.Infrastructure.Contracts;

public interface IAuctionCacheService
{
    Task SetAuctionAsync(Guid auctionId, AuctionCacheEntry entry, CancellationToken ct = default);
    Task<AuctionCacheEntry?> GetAuctionAsync(Guid auctionId, CancellationToken ct = default);
    Task UpdatePriceAsync(Guid auctionId, double newPrice, int bidCount, CancellationToken ct = default);
    Task AddBidAsync(Guid auctionId, BidDto bid, CancellationToken ct = default);
    Task<List<BidDto>> GetRecentBidsAsync(Guid auctionId, int count = 50, CancellationToken ct = default);
    Task ExtendAuctionAsync(Guid auctionId, DateTime newEndsAt, int extensionCount, CancellationToken ct = default);
    Task RemoveAuctionAsync(Guid auctionId, CancellationToken ct = default);
    Task<bool> ExistsAsync(Guid auctionId, CancellationToken ct = default);
    Task<bool> ToggleWatchAsync(string firebaseUid, Guid auctionId, CancellationToken ct = default);
    Task<bool> IsWatchingAsync(string firebaseUid, Guid auctionId, CancellationToken ct = default);
    Task<int> GetWatchCountAsync(Guid auctionId, CancellationToken ct = default);
}

public record AuctionCacheEntry(
    Guid AuctionId,
    double CurrentPrice,
    int BidCount,
    int ExtensionCount,
    DateTime EndsAt,
    string Status,
    bool ReserveMet
);
