using KickSneak.Domain.DTOs.Auctions;

namespace KickSneak.Application.Contracts.Application;

public interface IAuctionService
{
    Task<AuctionListResponseDto> GetAuctionsAsync(int page = 1, int pageSize = 20, CancellationToken ct = default);
    Task<AuctionDetailDto?> GetAuctionDetailAsync(Guid auctionId, string? firebaseUid = null, CancellationToken ct = default);
    Task<PlaceBidResponseDto> PlaceBidAsync(Guid auctionId, string firebaseUid, PlaceBidDto dto, CancellationToken ct = default);
    Task<AutoBidDto?> SetAutoBidAsync(Guid auctionId, string firebaseUid, SetAutoBidDto dto, CancellationToken ct = default);
    Task<bool> CancelAutoBidAsync(Guid auctionId, string firebaseUid, CancellationToken ct = default);
    Task<bool> ToggleWatchAsync(Guid auctionId, string firebaseUid, CancellationToken ct = default);
    Task<MyBidsResponseDto> GetMyBidsAsync(string firebaseUid, CancellationToken ct = default);
    Task<MyWonAuctionsResponseDto> GetMyWonAuctionsAsync(string firebaseUid, CancellationToken ct = default);
    Task CloseAuctionAsync(Guid auctionId, CancellationToken ct = default);
}
