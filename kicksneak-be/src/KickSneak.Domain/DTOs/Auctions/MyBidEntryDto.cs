namespace KickSneak.Domain.DTOs.Auctions;

public record MyBidEntryDto(
    Guid AuctionId,
    string ProductName,
    string ProductImage,
    double MyBidAmount,
    double CurrentPrice,
    bool IsWinning,
    string Status,
    DateTime EndsAt,
    DateTime BidPlacedAt
);

public record MyBidsResponseDto(List<MyBidEntryDto> Items, int TotalCount);
