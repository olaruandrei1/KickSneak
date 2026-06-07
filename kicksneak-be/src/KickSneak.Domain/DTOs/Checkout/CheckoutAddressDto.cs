namespace KickSneak.Domain.DTOs.Checkout;

public record CheckoutAddressDto(
    string? FirstName,
    string? LastName,
    string? Street,
    string? StreetNumber,
    string? City,
    string? County,
    string? PostalCode,
    string? Country,
    string? Phone
);
