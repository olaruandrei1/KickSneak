namespace KickSneak.Domain.DTOs.Seller;

public record CreateAuctionDto(
    Guid StockItemId,
    double StartPrice,
    double? ReservePrice,
    string Duration
);
