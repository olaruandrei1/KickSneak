namespace KickSneak.Domain.DTOs.Profile;

public record SellerInfoDto(
    string StoreName,
    string JoinedAt,
    int TotalSales,
    double Rating,
    bool Verified,
    string? Phone,
    string? City,
    string? SellType,
    string? ProductType,
    bool HasCompany,
    string? CompanyName,
    string? VatNumber
);