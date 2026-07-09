using KickSneak.Application.Contracts.Application;
using KickSneak.Application.Contracts.Persistence;
using KickSneak.Application.Hubs;
using KickSneak.Domain.DTOs.Auctions;
using KickSneak.Domain.Entities.Auctions;
using KickSneak.Domain.Enums;
using KickSneak.Infrastructure.Contracts;
using Microsoft.AspNetCore.SignalR;

namespace KickSneak.Application.Implementations;

public sealed class AuctionService(
    IUnitOfWork uow,
    IAuctionCacheService cache,
    IHubContext<AuctionHub> hub) : IAuctionService
{
    private const int AntiSnipeMinutes = 2;
    private const int ExtensionMinutes = 1;
    private const int MaxAutoBidDepth = 10;

    public async Task<AuctionListResponseDto> GetAuctionsAsync(int page = 1, int pageSize = 20, CancellationToken ct = default)
    {
        var (auctions, total) = await uow.Auctions.GetPaginatedAsync(
            a => a.Status.Equals(AuctionStatus.Active) || a.Status.Equals(AuctionStatus.Scheduled),
            page, pageSize, ct,
            a => a.StockItem,
            a => a.StockItem.Product,
            a => a.StockItem.Product.Photos,
            a => a.StockItem.Product.Brand,
            a => a.StockItem.Product.Color,
            a => a.StockItem.Size
        );

        List<AuctionListItemDto> items = [];

        foreach (var a in auctions)
        {
            var cached = await cache.GetAuctionAsync(a.Id, ct);
            var price = cached?.CurrentPrice ?? a.CurrentPrice;
            var bidCount = cached?.BidCount ?? a.BidCount;
            var endsAt = cached?.EndsAt ?? a.EndsAt;
            var status = cached?.Status ?? a.Status.ToString().ToLowerInvariant();

            items.Add(new AuctionListItemDto(
                Id: a.Id,
                ProductName: a.StockItem?.Product?.Title ?? string.Empty,
                ProductBrand: a.StockItem?.Product?.Brand?.Name ?? string.Empty,
                ProductImage: a.StockItem?.Product?.Photos.FirstOrDefault(p => p.IsPrimary)?.PhotoUrl ?? string.Empty,
                Colorway: a.StockItem?.Product?.Color?.Name ?? string.Empty,
                Size: a.StockItem?.Size?.SizeLabel ?? string.Empty,
                SizeSystem: "EU",
                CurrentPrice: price,
                StartPrice: a.StartPrice,
                BidCount: bidCount,
                EndsAt: endsAt,
                Status: status,
                ReserveMet: a.ReserveMet,
                HasReserve: a.ReservePrice.HasValue,
                Watchers: await cache.GetWatchCountAsync(a.Id, ct)
            ));
        }

        return new AuctionListResponseDto(items, total, page, pageSize, (page * pageSize) < total);
    }

    public async Task<AuctionDetailDto?> GetAuctionDetailAsync(Guid auctionId, string? firebaseUid = null, CancellationToken ct = default)
    {
        var auction = await uow.Auctions.GetFirstOrDefaultAsync(
            a => a.Id.Equals(auctionId), ct,
            a => a.StockItem,
            a => a.StockItem.Product,
            a => a.StockItem.Product.Photos,
            a => a.StockItem.Product.Brand,
            a => a.StockItem.Product.Color,
            a => a.StockItem.Product.Category,
            a => a.StockItem.Size,
            a => a.Seller,
            a => a.Seller.User
        );
        if (auction is null) return null;

        var cached = await cache.GetAuctionAsync(auctionId, ct);
        var price = cached?.CurrentPrice ?? auction.CurrentPrice;
        var bidCount = cached?.BidCount ?? auction.BidCount;
        var endsAt = cached?.EndsAt ?? auction.EndsAt;

        var recentBids = await cache.GetRecentBidsAsync(auctionId, 50, ct);

        if (recentBids.Count == 0)
        {
            var dbBids = await uow.Bids.GetAsync(b => b.AuctionId == auctionId, ct);
            recentBids = dbBids
                .OrderByDescending(b => b.PlacedAt)
                .Take(50)
                .Select(MapBid)
                .ToList();
        }

        var product = auction.StockItem?.Product;
        var seller = auction.Seller;
        var sellerUser = seller?.User;

        BidDto? myCurrentBid = null;
        AutoBidDto? myAutoBid = null;

        if (firebaseUid is not null)
        {
            var user = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid, ct);
            if (user is not null)
            {
                myCurrentBid = recentBids.FirstOrDefault(b => b.BidderId == user.FirebaseUid);

                var autoBid = await uow.AutoBids.GetFirstOrDefaultAsync(
                    ab => ab.AuctionId == auctionId && ab.UserId == user.Id && ab.IsActive, ct);

                if (autoBid is not null)
                    myAutoBid = new AutoBidDto(
                        autoBid.Id, autoBid.AuctionId,
                        user.FirebaseUid, autoBid.MaxAmount,
                        myCurrentBid?.Amount ?? 0,
                        autoBid.IsActive,
                        autoBid.CreatedAt, autoBid.ModifiedAt ?? autoBid.CreatedAt
                    );
            }
        }

        return new AuctionDetailDto(
            Id: auction.Id,
            Product: new AuctionProductDto(
                Id: product?.Id ?? Guid.Empty,
                Name: product?.Title ?? string.Empty,
                Brand: product?.Brand?.Name ?? string.Empty,
                Category: product?.Category?.Name ?? string.Empty,
                Colorway: product?.Color?.Name ?? string.Empty,
                Size: auction.StockItem?.Size?.SizeLabel ?? string.Empty,
                SizeSystem: "EU",
                Condition: "new",
                Images: product?.Photos.Select(p => p.PhotoUrl ?? string.Empty).ToList() ?? [],
                RetailPrice: product?.RetailPrice ?? 0,
                EstimatedMarketValue: price
            ),
            Seller: new AuctionSellerDto(
                Id: seller?.Id ?? Guid.Empty,
                Username: $"{sellerUser?.FirstName}'s Store",
                AvatarUrl: sellerUser?.ProfilePhoto,
                Rating: seller?.TrustScore ?? 5.0,
                TotalSales: 0,
                IsVerified: seller is { IsSuspended: false, IsBlocked: false }
            ),
            Status: auction.Status.ToString().ToLowerInvariant(),
            StartPrice: auction.StartPrice,
            CurrentPrice: price,
            ReservePrice: auction.ReservePrice,
            ReserveMet: auction.ReserveMet,
            BidCount: bidCount,
            UniqueBidders: recentBids.Select(b => b.BidderId).Distinct().Count(),
            StartsAt: auction.StartsAt,
            EndsAt: endsAt,
            OriginalEndsAt: auction.StartsAt + (auction.EndsAt - auction.StartsAt),
            ExtensionCount: cached?.ExtensionCount ?? auction.ExtensionCount,
            HighestBidderId: recentBids.FirstOrDefault()?.BidderId,
            HighestBidderUsername: recentBids.FirstOrDefault()?.BidderUsername,
            Duration: "7d",
            Views: 0,
            Description: null,
            RecentBids: recentBids,
            MyCurrentBid: myCurrentBid,
            MyAutoBid: myAutoBid,
            Watchers: await cache.GetWatchCountAsync(auctionId, ct),
            IsWatching: firebaseUid is not null && await cache.IsWatchingAsync(firebaseUid, auctionId, ct)
        );
    }

    public async Task<PlaceBidResponseDto> PlaceBidAsync(Guid auctionId, string firebaseUid, PlaceBidDto dto, CancellationToken ct = default)
    {
        return await PlaceBidInternalAsync(auctionId, firebaseUid, dto, isAutoBid: false, ct: ct);
    }

    public async Task<AutoBidDto?> SetAutoBidAsync(Guid auctionId, string firebaseUid, SetAutoBidDto dto, CancellationToken ct = default)
    {
        var user = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid, ct);
        if (user is null) return null;

        var existing = await uow.AutoBids.GetFirstOrDefaultAsync(
            ab => ab.AuctionId == auctionId && ab.UserId == user.Id, ct);

        if (existing is not null)
        {
            existing.MaxAmount = dto.MaxAmount;
            existing.IsActive = true;
            existing.ModifiedAt = DateTime.UtcNow;
            uow.AutoBids.Update(existing);
            await uow.SaveChangesAsync(ct);

            return new AutoBidDto(existing.Id, auctionId, firebaseUid, dto.MaxAmount, 0, true, existing.CreatedAt, existing.ModifiedAt.Value);
        }

        var autoBid = new AutoBid
        {
            AuctionId = auctionId,
            UserId = user.Id,
            MaxAmount = dto.MaxAmount,
            IsActive = true
        };

        await uow.AutoBids.AddAsync(autoBid, ct);
        await uow.SaveChangesAsync(ct);

        return new AutoBidDto(autoBid.Id, auctionId, firebaseUid, dto.MaxAmount, 0, true, autoBid.CreatedAt, autoBid.CreatedAt);
    }

    public async Task<bool> CancelAutoBidAsync(Guid auctionId, string firebaseUid, CancellationToken ct = default)
    {
        var user = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid, ct);
        if (user is null) return false;

        var autoBid = await uow.AutoBids.GetFirstOrDefaultAsync(
            ab => ab.AuctionId == auctionId && ab.UserId == user.Id && ab.IsActive, ct);

        if (autoBid is null) return false;

        autoBid.IsActive = false;
        autoBid.ModifiedAt = DateTime.UtcNow;
        uow.AutoBids.Update(autoBid);
        await uow.SaveChangesAsync(ct);

        return true;
    }

    public async Task<bool> ToggleWatchAsync(Guid auctionId, string firebaseUid, CancellationToken ct = default)
    => await cache.ToggleWatchAsync(firebaseUid, auctionId, ct);

    public async Task<MyBidsResponseDto> GetMyBidsAsync(string firebaseUid, CancellationToken ct = default)
    {
        var user = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid.Equals(firebaseUid), ct);

        if (user is null)
            return new MyBidsResponseDto([], 0);

        var bids = await uow.Bids.GetAsync(
            b => b.BidderId == user.Id, ct,
            includes: b => b.Auction);

        var grouped = bids
            .GroupBy(b => b.AuctionId)
            .Select(g =>
            {
                var auction = g.First().Auction;
                var myBest = g.Max(b => b.Amount);

                return new { AuctionId = g.Key, Auction = auction, MyBest = myBest, LastBidAt = g.Max(b => b.PlacedAt) };
            })
            .ToList();

        var entries = new List<MyBidEntryDto>();

        foreach (var g in grouped)
        {
            if (g.Auction is null) continue;

            var cached = await cache.GetAuctionAsync(g.AuctionId, ct);
            var price = cached?.CurrentPrice ?? g.Auction.CurrentPrice;
            var endsAt = cached?.EndsAt ?? g.Auction.EndsAt;
            var status = cached?.Status ?? g.Auction.Status.ToString().ToLowerInvariant();

            entries.Add(new MyBidEntryDto(
                AuctionId: g.AuctionId,
                ProductName: g.Auction.StockItem?.Product?.Title ?? string.Empty,
                ProductImage: g.Auction.StockItem?.Product?.Photos.FirstOrDefault(p => p.IsPrimary)?.PhotoUrl ?? string.Empty,
                MyBidAmount: g.MyBest,
                CurrentPrice: price,
                IsWinning: Math.Abs(g.MyBest - price) < 0.01,
                Status: status,
                EndsAt: endsAt,
                BidPlacedAt: g.LastBidAt
            ));
        }

        return new MyBidsResponseDto(entries, entries.Count);
    }

    public async Task<MyWonAuctionsResponseDto> GetMyWonAuctionsAsync(string firebaseUid, CancellationToken ct = default)
    {
        var user = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid, ct);

        if (user is null)
            return new MyWonAuctionsResponseDto([], 0);

        var myBids = await uow.Bids.GetAsync(
            b => b.BidderId == user.Id && b.Auction.Status == AuctionStatus.Ended, ct,
            includes: b => b.Auction);

        var auctionIds = myBids.Select(b => b.AuctionId).Distinct().ToList();

        var dtos = new List<MyWonAuctionDto>();

        foreach (var auctionId in auctionIds)
        {
            var auction = myBids.First(b => b.AuctionId == auctionId).Auction;
            if (auction is null) continue;

            var allBids = await uow.Bids.GetAsync(b => b.AuctionId == auctionId, ct);
            var highestBid = allBids.OrderByDescending(b => b.Amount).FirstOrDefault();

            if (highestBid?.BidderId != user.Id) continue;

            dtos.Add(new MyWonAuctionDto(
                AuctionId: auction.Id,
                ProductName: auction.StockItem?.Product?.Title ?? string.Empty,
                ProductImage: auction.StockItem?.Product?.Photos.FirstOrDefault(p => p.IsPrimary)?.PhotoUrl ?? string.Empty,
                FinalPrice: auction.CurrentPrice,
                WonAt: auction.EndsAt,
                CheckoutCompleted: false
            ));
        }

        return new MyWonAuctionsResponseDto(dtos, dtos.Count);
    }

    public async Task CloseAuctionAsync(Guid auctionId, CancellationToken ct = default)
    {
        var auction = await uow.Auctions.GetFirstOrDefaultAsync(a => a.Id == auctionId, ct);

        if (auction is null)
            return;

        var cached = await cache.GetAuctionAsync(auctionId, ct);

        if (cached is not null)
        {
            auction.CurrentPrice = cached.CurrentPrice;
            auction.BidCount = cached.BidCount;
            auction.ExtensionCount = cached.ExtensionCount;
            auction.EndsAt = cached.EndsAt;
        }

        auction.Status = AuctionStatus.Ended;
        auction.ModifiedAt = DateTime.UtcNow;

        uow.Auctions.Update(auction);
        await uow.SaveChangesAsync(ct);

        await cache.RemoveAuctionAsync(auctionId, ct);

        await hub.Clients.Group($"auction:{auctionId}").SendAsync("auction_ended", new { auctionId }, ct);
        await hub.Clients.Group("auctions:list").SendAsync("auction_closed", new { auctionId }, ct);
    }

    private async Task<PlaceBidResponseDto> PlaceBidInternalAsync(Guid auctionId, string firebaseUid, PlaceBidDto dto, bool isAutoBid, CancellationToken ct, int autoBidDepth = 0)
    {
        var user = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid, ct);
        if (user is null)
            return Fail("unauthorized");

        var auction = await uow.Auctions.GetFirstOrDefaultAsync(a => a.Id == auctionId, ct);
        if (auction is null || auction.Status != AuctionStatus.Active)
            return Fail("auction_ended");

        var cached = await cache.GetAuctionAsync(auctionId, ct);
        var currentPrice = cached?.CurrentPrice ?? auction.CurrentPrice;
        var currentEndsAt = cached?.EndsAt ?? auction.EndsAt;

        if (dto.Amount <= currentPrice)
            return Fail("too_low");

        if (DateTime.UtcNow > currentEndsAt)
            return Fail("auction_ended");

        var lastBids = await cache.GetRecentBidsAsync(auctionId, 1, ct);
        if (lastBids.FirstOrDefault()?.BidderId == firebaseUid)
            return Fail("self_bid");

        var timeLeft = currentEndsAt - DateTime.UtcNow;
        var triggeredExtension = timeLeft.TotalMinutes <= AntiSnipeMinutes;
        var newEndsAt = triggeredExtension
            ? currentEndsAt.AddMinutes(ExtensionMinutes)
            : currentEndsAt;

        var newBidCount = (cached?.BidCount ?? auction.BidCount) + 1;

        var bid = new BidDto(
            Id: Guid.NewGuid(),
            AuctionId: auctionId,
            BidderId: firebaseUid,
            BidderUsername: $"{user.FirstName} {user.LastName}".Trim(),
            Amount: dto.Amount,
            PlacedAt: DateTime.UtcNow,
            IsAutoBid: isAutoBid,
            TriggeredExtension: triggeredExtension
        );

        // Persist to the database FIRST. Redis (the cache) is only updated after a
        // successful commit — otherwise a failed save would leave a phantom bid in the
        // cache and every following attempt would wrongly fail with "self_bid".
        Bid dbBid = new()
        {
            Id = bid.Id,
            AuctionId = auctionId,
            BidderId = user.Id,
            Amount = dto.Amount,
            PlacedAt = bid.PlacedAt,
            IsAutoBid = isAutoBid,
            TriggeredExtension = triggeredExtension
        };

        await uow.Bids.AddAsync(dbBid, ct);

        auction.CurrentPrice = dto.Amount;
        auction.BidCount = newBidCount;
        auction.ModifiedAt = DateTime.UtcNow;

        if (triggeredExtension)
        {
            auction.EndsAt = newEndsAt;
            auction.ExtensionCount += 1;
        }

        uow.Auctions.Update(auction);
        await uow.SaveChangesAsync(ct);

        // Commit succeeded → now update the cache.
        await cache.AddBidAsync(auctionId, bid, ct);

        if (cached is null)
        {
            await cache.SetAuctionAsync(auctionId, new AuctionCacheEntry(
                auctionId, dto.Amount, newBidCount,
                auction.ExtensionCount + (triggeredExtension ? 1 : 0),
                newEndsAt,
                auction.Status.ToString().ToLowerInvariant(),
                auction.ReserveMet
            ), ct);
        }
        else
        {
            await cache.UpdatePriceAsync(auctionId, dto.Amount, newBidCount, ct);
            if (triggeredExtension)
                await cache.ExtendAuctionAsync(auctionId, newEndsAt,
                    cached.ExtensionCount + 1, ct);
        }

        await hub.Clients.Group($"auction:{auctionId}").SendAsync("bid_placed", new
        {
            auctionId,
            bid,
            newCurrentPrice = dto.Amount,
            triggeredExtension,
            newEndsAt
        }, ct);

        await hub.Clients.Group("auctions:list").SendAsync("auction_updated", new
        {
            auctionId,
            currentPrice = dto.Amount,
            bidCount = newBidCount,
            endsAt = newEndsAt
        }, ct);

        if (autoBidDepth < MaxAutoBidDepth)
        {
            await ProcessAutoBidsAsync(auctionId, firebaseUid, dto.Amount, ct, autoBidDepth + 1);
        }

        return new PlaceBidResponseDto(
            Success: true,
            Bid: bid,
            NewCurrentPrice: dto.Amount,
            TriggeredExtension: triggeredExtension,
            NewEndsAt: newEndsAt,
            ErrorReason: null
        );
    }

    private async Task ProcessAutoBidsAsync(Guid auctionId, string excludeUid, double currentPrice, CancellationToken ct, int depth)
    {
        try
        {
            var autoBids = await uow.AutoBids.GetAsync(
                ab => ab.AuctionId == auctionId
                      && ab.IsActive
                      && ab.MaxAmount > currentPrice, ct,
                includes: ab => ab.User);

            var winner = autoBids
                .Where(ab => ab.User?.FirebaseUid is not null
                             && ab.User.FirebaseUid != excludeUid)
                .OrderByDescending(ab => ab.MaxAmount)
                .FirstOrDefault();

            if (winner?.User is null) return;

            var nextAmount = Math.Min(currentPrice + 1, winner.MaxAmount);
            if (nextAmount <= currentPrice) return;

            await PlaceBidInternalAsync(
                auctionId, winner.User.FirebaseUid,
                new PlaceBidDto(nextAmount),
                isAutoBid: true, ct: ct, autoBidDepth: depth);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[AutoBid] depth={depth} auction={auctionId}: {ex.Message}");
        }
    }

    private static PlaceBidResponseDto Fail(string reason) =>
        new(false, null, 0, false, DateTime.UtcNow, reason);

    private static BidDto MapBid(Bid b) =>
        new(b.Id, b.AuctionId, b.Bidder?.FirebaseUid ?? string.Empty,
            $"{b.Bidder?.FirstName} {b.Bidder?.LastName}".Trim(),
            b.Amount, b.PlacedAt, b.IsAutoBid, b.TriggeredExtension);
}