namespace KickSneak.Domain.DTOs.Auctions;

public record AuctionProductDto(
    Guid Id,
    string Name,
    string Brand,
    string Category,
    string Colorway,
    string Size,
    string SizeSystem,
    string Condition,
    List<string> Images,
    double RetailPrice,
    double EstimatedMarketValue
);

public record AuctionSellerDto(
    Guid Id,
    string Username,
    string? AvatarUrl,
    double Rating,
    int TotalSales,
    bool IsVerified
);

public record BidDto(
    Guid Id,
    Guid AuctionId,
    string BidderId,
    string BidderUsername,
    double Amount,
    DateTime PlacedAt,
    bool IsAutoBid,
    bool TriggeredExtension
);

public record AutoBidDto(
    Guid Id,
    Guid AuctionId,
    string UserId,
    double MaxAmount,
    double CurrentBidPlaced,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record AuctionDetailDto(
    Guid Id,
    AuctionProductDto Product,
    AuctionSellerDto Seller,
    string Status,
    double StartPrice,
    double CurrentPrice,
    double? ReservePrice,
    bool ReserveMet,
    int BidCount,
    int UniqueBidders,
    DateTime StartsAt,
    DateTime EndsAt,
    DateTime OriginalEndsAt,
    int ExtensionCount,
    string? HighestBidderId,
    string? HighestBidderUsername,
    string Duration,
    int Views,
    int Watchers,
    string? Description,
    bool IsWatching,
    List<BidDto> RecentBids,
    BidDto? MyCurrentBid,
    AutoBidDto? MyAutoBid,
    bool IsOwnAuction
);
