using KickSneak.Application.Contracts.Application;
using KickSneak.Application.Contracts.Persistence;
using KickSneak.Domain.DTOs.Profile;
using KickSneak.Domain.DTOs.Seller;
using KickSneak.Domain.Entities.Auctions;
using KickSneak.Domain.Entities.Inventory;
using KickSneak.Domain.Entities.Sellers;
using KickSneak.Domain.Enums;
using KickSneak.Infrastructure.Contracts;

namespace KickSneak.Application.Implementations;

public sealed class SellerService(IUnitOfWork uow, IProfileService profileService, IBlobStorageService blobService) : ISellerService
{
    public async Task<UserProfileDto?> BecomeSellerAsync(string firebaseUid, BecomeSellerDto dto, CancellationToken ct = default)
    {
        var user = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid, ct);

        if (user is null)
            return null;

        var existing = await uow.Sellers.GetFirstOrDefaultAsync(s => s.UserId == user.Id, ct);

        if (existing is not null)
            return await profileService.GetProfileAsync(firebaseUid, ct);

        user.FirstName = dto.FirstName;
        user.LastName = dto.LastName;
        user.ModifiedAt = DateTime.UtcNow;

        uow.Users.Update(user);

        await uow.Sellers.AddAsync(new Seller
        {
            UserId = user.Id,
            EnrollmentDate = DateTime.UtcNow,
            TrustScore = 5.0,
            StoreName = dto.StoreName,
            Phone = dto.Phone,
            City = dto.City,
            SellType = dto.SellType,
            ProductType = dto.ProductType,
            HasCompany = dto.HasCompany,
            CompanyName = dto.CompanyName,
            VatNumber = dto.VatNumber
        }, ct);

        await uow.SaveChangesAsync(ct);

        return await profileService.GetProfileAsync(firebaseUid, ct);
    }

    public async Task<SellerListingsResponseDto> GetListingsAsync(string firebaseUid, CancellationToken ct = default)
    {
        var seller = await GetSellerAsync(firebaseUid, ct);
        if (seller is null)
            return new SellerListingsResponseDto([]);

        var stockItems = await uow.StockItems.GetAsync(s => s.SellerId == seller.Id, ct, includes: [s => s.Size]);
        var usedItems = await uow.UsedItems.GetAsync(u => u.SellerId == seller.Id, ct, includes: [u => u.Size, u => u.Photos]);

        // Items already on a live auction so the UI can hide the "Auction" action.
        var activeAuctions = await uow.Auctions.GetAsync(
            a => a.SellerId == seller.Id && a.Status == AuctionStatus.Active, ct);
        var auctionedStockIds = activeAuctions.Select(a => a.StockItemId).ToHashSet();

        var productIds = stockItems.Select(s => s.ProductId).Union(usedItems.Select(u => u.ProductId)).Distinct().ToList();
        var products = await uow.Products.GetAsync(p => productIds.Contains(p.Id), ct, includes: [p => p.Brand, p => p.Photos]);
        var productDict = products.ToDictionary(p => p.Id);

        var dtos = new List<SellerListingDto>();

        foreach (var s in stockItems)
        {
            productDict.TryGetValue(s.ProductId, out var product);
            dtos.Add(new SellerListingDto(
                Id: s.Id, Name: product?.Title ?? string.Empty,
                Brand: product?.Brand?.Name ?? string.Empty,
                Size: s.Size?.SizeLabel ?? string.Empty,
                Price: s.Price, Status: s.StatusItem.ToString().ToLowerInvariant(),
                Views: 0,
                Image: product?.Photos.FirstOrDefault(p => p.IsPrimary)?.PhotoUrl ?? string.Empty,
                ListedAt: s.CreatedAt.ToString("yyyy-MM-dd"),
                InAuction: auctionedStockIds.Contains(s.Id)
            ));
        }

        foreach (var u in usedItems)
        {
            productDict.TryGetValue(u.ProductId, out var product);
            var primaryPhoto = u.Photos.FirstOrDefault(p => p.IsPrimary)?.PhotoUrl
                               ?? product?.Photos.FirstOrDefault(p => p.IsPrimary)?.PhotoUrl
                               ?? string.Empty;

            dtos.Add(new SellerListingDto(
                Id: u.Id, Name: product?.Title ?? string.Empty,
                Brand: product?.Brand?.Name ?? string.Empty,
                Size: u.Size?.SizeLabel ?? string.Empty,
                Price: u.Price, Status: u.StatusItem.ToString().ToLowerInvariant(),
                Views: 0, Image: primaryPhoto,
                ListedAt: u.CreatedAt.ToString("yyyy-MM-dd"),
                InAuction: auctionedStockIds.Contains(u.Id)
            ));
        }

        return new SellerListingsResponseDto(dtos);
    }

    public async Task<SellerListingDto?> CreateListingAsync(string firebaseUid, CreateListingDto dto, CancellationToken ct = default)
    {
        var seller = await GetSellerAsync(firebaseUid, ct);
        if (seller is null) return null;

        var searchEu = dto.SizeLabel.Replace("EU ", "");
        if (!searchEu.Contains('.')) searchEu += ".0";
        var size = await uow.Sizes.GetFirstOrDefaultAsync(
            s => s.SizeEu == searchEu, ct);

        var stockItem = new StockItem
        {
            ProductId = dto.ProductId,
            SellerId = seller.Id,
            SizeId = size?.Id ?? Guid.Empty,
            Price = dto.Price,
            StatusItem = ItemStatus.PendingReview
        };

        await uow.StockItems.AddAsync(stockItem, ct);

        await uow.SaveChangesAsync(ct);

        var product = await uow.Products.GetFirstOrDefaultAsync(p => p.Id == dto.ProductId, ct, includes: [p => p.Brand, p => p.Photos]);

        return new SellerListingDto(
            Id: stockItem.Id,
            Name: product?.Title ?? string.Empty,
            Brand: product?.Brand?.Name ?? string.Empty,
            Size: dto.SizeLabel,
            Price: dto.Price,
            Status: ItemStatus.PendingReview.ToString().ToLowerInvariant(),
            Views: 0,
            Image: product?.Photos.FirstOrDefault(p => p.IsPrimary)?.PhotoUrl ?? string.Empty,
            ListedAt: DateTime.UtcNow.ToString("yyyy-MM-dd"),
            InAuction: false
        );
    }

    public async Task<SellerListingDto?> UpdateListingPriceAsync(string firebaseUid, Guid stockItemId, UpdateListingPriceDto dto, CancellationToken ct = default)
    {
        var seller = await GetSellerAsync(firebaseUid, ct);

        if (seller is null)
            return null;

        var stockItem = await uow.StockItems.GetFirstOrDefaultAsync(s => s.Id == stockItemId && s.SellerId == seller.Id, ct, includes: [s => s.Size]);

        if (stockItem is null) return null;

        var product = await uow.Products.GetFirstOrDefaultAsync(p => p.Id == stockItem.ProductId, ct, includes: [p => p.Brand, p => p.Photos]);

        stockItem.Price = dto.Price;
        stockItem.ModifiedAt = DateTime.UtcNow;

        uow.StockItems.Update(stockItem);

        await uow.SaveChangesAsync(ct);

        return new SellerListingDto(
            Id: stockItem.Id,
            Name: product?.Title ?? string.Empty,
            Brand: product?.Brand?.Name ?? string.Empty,
            Size: stockItem.Size?.SizeLabel ?? string.Empty,
            Price: stockItem.Price,
            Status: stockItem.StatusItem.ToString().ToLowerInvariant(),
            Views: 0,
            Image: product?.Photos.FirstOrDefault(p => p.IsPrimary)?.PhotoUrl ?? string.Empty,
            ListedAt: stockItem.CreatedAt.ToString("yyyy-MM-dd"),
            InAuction: false
        );
    }

    public async Task<SellerSalesDto?> GetSalesAsync(string firebaseUid, CancellationToken ct = default)
    {
        var seller = await GetSellerAsync(firebaseUid, ct);
        if (seller is null)
            return null;

        var orders = await uow.Orders.GetAsync(o => o.StockItem != null && o.StockItem.SellerId == seller.Id, ct);

        var totalRevenue = orders.Sum(o => o.TotalPrice);
        var totalSales = orders.Count;
        var avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

        var chart = orders
            .GroupBy(o => o.CreatedAt.ToString("MMM"))
            .Select(g => new SalesChartPointDto(
                Month: g.Key,
                Revenue: g.Sum(o => o.TotalPrice),
                Sales: g.Count()
            )).ToList();

        var recentSales = orders
            .OrderByDescending(o => o.CreatedAt)
            .Take(10)
            .Select(o => new RecentSaleDto(
                Id: o.Id,
                Buyer: MaskName(o.Buyer?.FirstName ?? "User"),
                Item: o.StockItem?.Product?.Title ?? string.Empty,
                Price: o.TotalPrice,
                Date: o.CreatedAt.ToString("yyyy-MM-dd"),
                Status: o.Status.ToString().ToLowerInvariant()
            )).ToList();

        return new SellerSalesDto(totalRevenue, totalSales, avgOrderValue, chart, recentSales);
    }

    public async Task<SellerAuctionsDto?> GetAuctionsAsync(string firebaseUid, CancellationToken ct = default)
    {
        var seller = await GetSellerAsync(firebaseUid, ct);
        if (seller is null) return null;

        var auctions = await uow.Auctions.GetAsync(a => a.SellerId == seller.Id, ct);

        var active = auctions
            .Where(a => a.Status == AuctionStatus.Active || a.Status == AuctionStatus.Scheduled)
            .Select(a => new SellerActiveAuctionDto(
                Id: a.Id,
                ProductName: a.StockItem?.Product?.Title ?? string.Empty,
                ProductImage: a.StockItem?.Product?.Photos.FirstOrDefault(p => p.IsPrimary)?.PhotoUrl ?? string.Empty,
                Size: a.StockItem?.Size?.SizeLabel ?? string.Empty,
                SizeSystem: "EU",
                StartPrice: a.StartPrice,
                CurrentPrice: a.CurrentPrice,
                ReservePrice: a.ReservePrice,
                ReserveMet: a.ReserveMet,
                BidCount: a.BidCount,
                EndsAt: a.EndsAt,
                Status: "live"
            )).ToList();

        var ended = auctions
            .Where(a => a.Status == AuctionStatus.Ended || a.Status == AuctionStatus.Archived)
            .Select(a => new SellerEndedAuctionDto(
                Id: a.Id,
                ProductName: a.StockItem?.Product?.Title ?? string.Empty,
                ProductImage: a.StockItem?.Product?.Photos.FirstOrDefault(p => p.IsPrimary)?.PhotoUrl ?? string.Empty,
                Size: a.StockItem?.Size?.SizeLabel ?? string.Empty,
                StartPrice: a.StartPrice,
                FinalPrice: a.CurrentPrice,
                BidCount: a.BidCount,
                EndedAt: a.EndsAt,
                Status: "ended"
            )).ToList();

        return new SellerAuctionsDto(active, ended);
    }

    public async Task<SellerActiveAuctionDto?> CreateAuctionAsync(string firebaseUid, CreateAuctionDto dto, CancellationToken ct = default)
    {
        var seller = await GetSellerAsync(firebaseUid, ct);
        if (seller is null) return null;

        var stockItem = await uow.StockItems.GetFirstOrDefaultAsync(
            s => s.Id == dto.StockItemId && s.SellerId == seller.Id, ct);
        if (stockItem is null) return null;

        // Don't let the same item be auctioned twice at once.
        var existingAuction = await uow.Auctions.GetFirstOrDefaultAsync(
            a => a.StockItemId == dto.StockItemId && a.Status == AuctionStatus.Active, ct);
        if (existingAuction is not null) return null;

        var durationHours = dto.Duration switch
        {
            "1d" => 24,
            "3d" => 72,
            "7d" => 168,
            _ => 72
        };

        var auction = new Auction
        {
            StockItemId = dto.StockItemId,
            SellerId = seller.Id,
            StartPrice = dto.StartPrice,
            CurrentPrice = dto.StartPrice,
            ReservePrice = dto.ReservePrice,
            ReserveMet = dto.ReservePrice is null,
            Status = AuctionStatus.Active,
            StartsAt = DateTime.UtcNow,
            EndsAt = DateTime.UtcNow.AddHours(durationHours)
        };

        await uow.Auctions.AddAsync(auction, ct);
        await uow.SaveChangesAsync(ct);

        return new SellerActiveAuctionDto(
            Id: auction.Id,
            ProductName: stockItem.Product?.Title ?? string.Empty,
            ProductImage: stockItem.Product?.Photos.FirstOrDefault(p => p.IsPrimary)?.PhotoUrl ?? string.Empty,
            Size: stockItem.Size?.SizeLabel ?? string.Empty,
            SizeSystem: "EU",
            StartPrice: auction.StartPrice,
            CurrentPrice: auction.CurrentPrice,
            ReservePrice: auction.ReservePrice,
            ReserveMet: auction.ReserveMet,
            BidCount: 0,
            EndsAt: auction.EndsAt,
            Status: "live"
        );
    }

    public async Task<List<CatalogSearchResultDto>> SearchCatalogAsync(string query, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(query) || query.Length < 2)
            return [];

        var q = query.ToLower();
        var products = await uow.Products.GetAsync(
            p => p.Title!.ToLower().Contains(q) ||
                 p.Brand!.Name!.ToLower().Contains(q), ct,
            includes: [p => p.Brand, p => p.Photos]);

        return products.Take(10).Select(p => new CatalogSearchResultDto(
            Id: p.Id,
            Name: p.Title ?? string.Empty,
            Brand: p.Brand?.Name ?? string.Empty,
            Image: p.Photos.FirstOrDefault(ph => ph.IsPrimary)?.PhotoUrl ?? string.Empty,
            RetailPrice: p.RetailPrice ?? 0
        )).ToList();
    }

    public async Task<SellerListingDto?> CreateUsedListingAsync(string firebaseUid, CreateUsedListingDto dto, CancellationToken ct = default)
    {
        var seller = await GetSellerAsync(firebaseUid, ct);

        if (seller is null)
            return null;

        var product = await uow.Products.GetFirstOrDefaultAsync(p => p.Id == dto.ProductId, ct, includes: [p => p.Brand, p => p.Photos]);

        if (product is null)
            return null;

        var searchEu = dto.SizeLabel.Replace("EU ", "");
        if (!searchEu.Contains('.')) searchEu += ".0";
        var size = await uow.Sizes.GetFirstOrDefaultAsync(s => s.SizeEu == searchEu, ct);

        var usedItem = new UsedItem
        {
            ProductId = dto.ProductId,
            SellerId = seller.Id,
            SizeId = size?.Id ?? Guid.Empty,
            Price = dto.Price,
            Condition = (ItemCondition)dto.Condition,
            StatusItem = ItemStatus.PendingReview
        };

        await uow.UsedItems.AddAsync(usedItem, ct);

        await uow.SaveChangesAsync(ct);

        return new SellerListingDto(
            Id: usedItem.Id,
            Name: product.Title ?? string.Empty,
            Brand: product.Brand?.Name ?? string.Empty,
            Size: dto.SizeLabel,
            Price: dto.Price,
            Status: "pendingreview",
            Views: 0,
            Image: product.Photos.FirstOrDefault(p => p.IsPrimary)?.PhotoUrl ?? string.Empty,
            ListedAt: DateTime.UtcNow.ToString("yyyy-MM-dd"),
            InAuction: false
        );
    }

    public async Task<List<string>> UploadUsedItemPhotosAsync(
        string firebaseUid, Guid usedItemId,
        List<(Stream Stream, string FileName, string ContentType)> files,
        CancellationToken ct = default
    )
    {
        var seller = await GetSellerAsync(firebaseUid, ct);
        if (seller is null) return [];

        var usedItem = await uow.UsedItems.GetFirstOrDefaultAsync(
            u => u.Id == usedItemId && u.SellerId == seller.Id, ct);
        if (usedItem is null) return [];

        var urls = new List<string>();
        var order = 0;

        foreach (var (stream, fileName, contentType) in files)
        {
            var ext = Path.GetExtension(fileName).ToLowerInvariant();
            if (ext is not ".jpg" and not ".jpeg" and not ".png" and not ".webp") continue;

            var blobName = $"sellers/{firebaseUid}/{usedItemId}/{Guid.NewGuid()}{ext}";
            var url = await blobService.UploadAsync("seller-photos", blobName, stream, contentType, ct);

            await uow.UsedItemPhotos.AddAsync(new UsedItemPhoto
            {
                UsedItemId = usedItemId,
                PhotoUrl = url,
                IsPrimary = order == 0,
                DisplayOrder = order++
            }, ct);

            urls.Add(url);
        }

        await uow.SaveChangesAsync(ct);

        return urls;
    }

    public async Task<SellerReturnsResponseDto?> GetReturnsAsync(string firebaseUid, CancellationToken ct = default)
    {
        var seller = await GetSellerAsync(firebaseUid, ct);

        if (seller is null)
            return null;

        var stockOrders = await uow.Orders.GetAsync(o => o.StockItem != null && o.StockItem.SellerId == seller.Id, ct);

        var usedOrders = await uow.Orders.GetAsync(o => o.UsedItem != null && o.UsedItem.SellerId == seller.Id, ct);

        var allOrders = stockOrders.Concat(usedOrders).ToList();
        var orderIds = allOrders.Select(o => o.Id).ToList();

        var returns = await uow.Returns.GetAsync(r => orderIds.Contains(r.OrderId), ct);

        var dtos = returns.Select(r =>
        {
            var order = allOrders.First(o => o.Id == r.OrderId);
            var isUsed = order.UsedItemId.HasValue;
            var itemName = isUsed
                ? order.UsedItem?.Product?.Title ?? string.Empty
                : order.StockItem?.Product?.Title ?? string.Empty;
            var size = isUsed
                ? order.UsedItem?.Size?.SizeLabel ?? string.Empty
                : order.StockItem?.Size?.SizeLabel ?? string.Empty;

            return new SellerReturnDto(
                Id: r.Id,
                OrderId: r.OrderId,
                BuyerName: MaskName(r.User?.FirstName ?? "User"),
                ItemName: itemName,
                Size: size,
                Price: order.TotalPrice,
                Reason: r.Reason ?? string.Empty,
                Description: r.Description,
                Status: r.Status.ToString().ToLowerInvariant(),
                Date: r.CreatedAt.ToString("yyyy-MM-dd"),
                IsUsedItem: isUsed
            );
        }).ToList();

        return new SellerReturnsResponseDto(dtos);
    }

    public async Task<bool> HandleReturnAsync(string firebaseUid, Guid returnId, bool approve, CancellationToken ct = default)
    {
        var seller = await GetSellerAsync(firebaseUid, ct);

        if (seller is null)
            return false;

        var ret = await uow.Returns.GetFirstOrDefaultAsync(r => r.Id == returnId, ct);

        if (ret is null || ret.Status != ReturnStatus.Pending) 
            return false;

        var order = await uow.Orders.GetFirstOrDefaultAsync(o => o.Id == ret.OrderId, ct);

        if (order is null) 
            return false;

        var isMine = (order.StockItem?.SellerId == seller.Id) || (order.UsedItem?.SellerId == seller.Id);
        if (!isMine) return false;

        ret.Status = approve ? ReturnStatus.Approved : ReturnStatus.Rejected;
        ret.ModifiedAt = DateTime.UtcNow;
        
        uow.Returns.Update(ret);

        await uow.SaveChangesAsync(ct);

        return true;
    }

    private async Task<Seller?> GetSellerAsync(string firebaseUid, CancellationToken ct)
    {
        var user = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid, ct);

        if (user is null)
            return null;

        return await uow.Sellers.GetFirstOrDefaultAsync(s => s.UserId == user.Id, ct);
    }

    private static string MaskName(string name) =>
    name.Length <= 1 ? $"{name}***" : $"{name[0]}***{name[^1]}";
}
