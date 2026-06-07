using KickSneak.Domain.DTOs.Profile;
using KickSneak.Domain.DTOs.Seller;

namespace KickSneak.Application.Contracts.Application;

public interface ISellerService
{
    Task<UserProfileDto?> BecomeSellerAsync(string firebaseUid, BecomeSellerDto dto, CancellationToken ct = default);
    Task<SellerListingsResponseDto> GetListingsAsync(string firebaseUid, CancellationToken ct = default);
    Task<SellerListingDto?> CreateListingAsync(string firebaseUid, CreateListingDto dto, CancellationToken ct = default);
    Task<SellerListingDto?> UpdateListingPriceAsync(string firebaseUid, Guid stockItemId, UpdateListingPriceDto dto, CancellationToken ct = default);
    Task<SellerSalesDto?> GetSalesAsync(string firebaseUid, CancellationToken ct = default);
    Task<SellerAuctionsDto?> GetAuctionsAsync(string firebaseUid, CancellationToken ct = default);
    Task<SellerActiveAuctionDto?> CreateAuctionAsync(string firebaseUid, CreateAuctionDto dto, CancellationToken ct = default);
    Task<List<CatalogSearchResultDto>> SearchCatalogAsync(string query, CancellationToken ct = default);
    Task<SellerListingDto?> CreateUsedListingAsync(string firebaseUid, CreateUsedListingDto dto, CancellationToken ct = default);
    Task<List<string>> UploadUsedItemPhotosAsync(string firebaseUid, Guid usedItemId, List<(Stream Stream, string FileName, string ContentType)> files, CancellationToken ct = default);
    Task<SellerReturnsResponseDto?> GetReturnsAsync(string firebaseUid, CancellationToken ct = default);
    Task<bool> HandleReturnAsync(string firebaseUid, Guid returnId, bool approve, CancellationToken ct = default);
}
