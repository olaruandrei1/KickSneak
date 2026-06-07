namespace KickSneak.Domain.DTOs.Profile;

public record UserProfileDto(
    string Uid,
    string Email,
    string DisplayName,
    string? PhotoURL,
    bool IsSeller,
    string JoinedAt,
    double TotalSpent,
    int TotalOrders,
    List<AddressDto> Addresses,
    SizePreferencesDto SizePreferences,
    SellerInfoDto? Seller,
    Guid? GenderId,
    DateTime? BirthDate
);