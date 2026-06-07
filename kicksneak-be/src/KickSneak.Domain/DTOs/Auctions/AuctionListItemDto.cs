namespace KickSneak.Domain.DTOs.Auctions;

public record AuctionListItemDto(
    Guid Id,
    string ProductName,
    string ProductBrand,
    string ProductImage,
    string Colorway,
    string Size,
    string SizeSystem,
    double CurrentPrice,
    double StartPrice,
    int BidCount,
    DateTime EndsAt,
    string Status,
    bool ReserveMet,
    bool HasReserve,
    int Watchers
);

public record AuctionListResponseDto(
    List<AuctionListItemDto> Items,
    int TotalCount,
    int Page,
    int PageSize,
    bool HasMore
);
