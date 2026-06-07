namespace KickSneak.Domain.DTOs.Seller;

public record SellerActiveAuctionDto(
    Guid Id,
    string ProductName,
    string ProductImage,
    string Size,
    string SizeSystem,
    double StartPrice,
    double CurrentPrice,
    double? ReservePrice,
    bool ReserveMet,
    int BidCount,
    DateTime EndsAt,
    string Status
);

public record SellerEndedAuctionDto(
    Guid Id,
    string ProductName,
    string ProductImage,
    string Size,
    double StartPrice,
    double FinalPrice,
    int BidCount,
    DateTime EndedAt,
    string Status
);

public record SellerAuctionsDto(
    List<SellerActiveAuctionDto> Active,
    List<SellerEndedAuctionDto> Ended
);
