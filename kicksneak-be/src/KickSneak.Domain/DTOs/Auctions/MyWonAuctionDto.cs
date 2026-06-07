namespace KickSneak.Domain.DTOs.Auctions;

public record MyWonAuctionDto(
    Guid AuctionId,
    string ProductName,
    string ProductImage,
    double FinalPrice,
    DateTime WonAt,
    bool CheckoutCompleted
);

public record MyWonAuctionsResponseDto(List<MyWonAuctionDto> Items, int TotalCount);
