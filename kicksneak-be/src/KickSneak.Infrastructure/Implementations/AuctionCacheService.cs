using KickSneak.Domain.DTOs.Auctions;
using KickSneak.Infrastructure.Contracts;
using StackExchange.Redis;
using System.Text.Json;

namespace KickSneak.Infrastructure.Implementations;

public sealed class AuctionCacheService(IConnectionMultiplexer redis) : IAuctionCacheService
{
    private readonly IDatabase _db = redis.GetDatabase();
    private static string StateKey(Guid id) => $"auction:state:{id}";
    private static string BidsKey(Guid id) => $"auction:bids:{id}";
    private static string WatchKey(Guid auctionId) => $"auction:watchers:{auctionId}";

    public async Task SetAuctionAsync(Guid auctionId, AuctionCacheEntry entry, CancellationToken ct = default)
    {
        var ttl = entry.EndsAt - DateTime.UtcNow + TimeSpan.FromMinutes(10);
        var json = JsonSerializer.Serialize(entry);

        await _db.StringSetAsync(StateKey(auctionId), json, ttl > TimeSpan.Zero ? ttl : TimeSpan.FromMinutes(10));
    }

    public async Task<AuctionCacheEntry?> GetAuctionAsync(Guid auctionId, CancellationToken ct = default)
    {
        var val = await _db.StringGetAsync(StateKey(auctionId));
        return val.IsNullOrEmpty ? null : JsonSerializer.Deserialize<AuctionCacheEntry>(val.ToString());
    }

    public async Task<bool> ToggleWatchAsync(string firebaseUid, Guid auctionId, CancellationToken ct = default)
    {
        var key = WatchKey(auctionId);
        var isMember = await _db.SetContainsAsync(key, firebaseUid);

        if (isMember)
        {
            await _db.SetRemoveAsync(key, firebaseUid);

            return false;
        }

        await _db.SetAddAsync(key, firebaseUid);
        
        return true;
    }

    public async Task<bool> IsWatchingAsync(string firebaseUid, Guid auctionId, CancellationToken ct = default)
    => await _db.SetContainsAsync(WatchKey(auctionId), firebaseUid);

    public async Task<int> GetWatchCountAsync(Guid auctionId, CancellationToken ct = default)
    => (int)await _db.SetLengthAsync(WatchKey(auctionId));

    public async Task UpdatePriceAsync(Guid auctionId, double newPrice, int bidCount, CancellationToken ct = default)
    {
        var key = StateKey(auctionId);

        for (var i = 0; i < 3; i++)
        {
            var tran = _db.CreateTransaction();
            var val = await _db.StringGetAsync(key);

            if (val.IsNullOrEmpty) return;

            var entry = JsonSerializer.Deserialize<AuctionCacheEntry>(val.ToString())!;

            var updated = entry with { CurrentPrice = newPrice, BidCount = bidCount };

            var ttl = updated.EndsAt - DateTime.UtcNow + TimeSpan.FromMinutes(10);

            tran.AddCondition(Condition.StringEqual(key, val));

            tran.StringSetAsync(key, JsonSerializer.Serialize(updated), ttl > TimeSpan.Zero ? ttl : TimeSpan.FromMinutes(10));

            if (await tran.ExecuteAsync()) return;
        }

        var fallback = await GetAuctionAsync(auctionId, ct);

        if (fallback is null)
            return;

        await SetAuctionAsync(auctionId, fallback with { CurrentPrice = newPrice, BidCount = bidCount }, ct);
    }

    public async Task AddBidAsync(Guid auctionId, BidDto bid, CancellationToken ct = default)
    {
        var json = JsonSerializer.Serialize(bid);

        await _db.ListLeftPushAsync(BidsKey(auctionId), json);
        await _db.ListTrimAsync(BidsKey(auctionId), 0, 49); 
    }

    public async Task<List<BidDto>> GetRecentBidsAsync(Guid auctionId, int count = 50, CancellationToken ct = default)
    {
        var items = await _db.ListRangeAsync(BidsKey(auctionId), 0, count - 1);
        return items
            .Where(x => !x.IsNullOrEmpty)
            .Select(x => JsonSerializer.Deserialize<BidDto>(x.ToString())!)
            .ToList();
    }

    public async Task ExtendAuctionAsync(Guid auctionId, DateTime newEndsAt, int extensionCount, CancellationToken ct = default)
    {
        var key = StateKey(auctionId);

        for (var i = 0; i < 3; i++)
        {
            var tran = _db.CreateTransaction();
            var val = await _db.StringGetAsync(key);

            if (val.IsNullOrEmpty) return;

            var entry = JsonSerializer.Deserialize<AuctionCacheEntry>(val.ToString())!;
            var updated = entry with { EndsAt = newEndsAt, ExtensionCount = extensionCount };
            var ttl = newEndsAt - DateTime.UtcNow + TimeSpan.FromMinutes(10);

            tran.AddCondition(Condition.StringEqual(key, val));

            tran.StringSetAsync(key, JsonSerializer.Serialize(updated), ttl > TimeSpan.Zero ? ttl : TimeSpan.FromMinutes(10));

            if (await tran.ExecuteAsync()) return;
        }

        var fallback = await GetAuctionAsync(auctionId, ct);

        if (fallback is null)
            return;

        await SetAuctionAsync(auctionId, fallback with { EndsAt = newEndsAt, ExtensionCount = extensionCount }, ct);
    }

    public async Task RemoveAuctionAsync(Guid auctionId, CancellationToken ct = default)
    {
        await _db.KeyDeleteAsync(StateKey(auctionId));
        await _db.KeyDeleteAsync(BidsKey(auctionId));
    }

    public async Task<bool> ExistsAsync(Guid auctionId, CancellationToken ct = default)
    => await _db.KeyExistsAsync(StateKey(auctionId));
}
