namespace KickSneak.Domain.DTOs.Auctions;

public record PlaceBidResponseDto(
    bool Success,
    BidDto? Bid,
    double NewCurrentPrice,
    bool TriggeredExtension,
    DateTime NewEndsAt,
    string? ErrorReason
);
