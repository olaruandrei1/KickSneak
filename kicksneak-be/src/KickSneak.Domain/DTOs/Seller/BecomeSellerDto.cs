namespace KickSneak.Domain.DTOs.Seller;

public record BecomeSellerDto(
    string FirstName,
    string LastName,
    string Phone,
    string City,
    string StoreName,
    string SellType,
    string ProductType,
    bool HasCompany,
    string? CompanyName,
    string? VatNumber
);
