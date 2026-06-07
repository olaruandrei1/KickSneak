namespace KickSneak.Domain.DTOs.Profile;

public record UserAddressDto(
    Guid? Id,
    string? AddressName,
    bool IsPrincipal,
    string? FirstName,
    string? LastName,
    string? Country,
    string? City,
    string? County,
    string? Street,
    string? StreetNumber,
    string? Building,
    string? Stairwell,
    string? Floor,
    string? Apartment,
    string? AccessCode,
    string? PostalCode,
    string? DeliveryInstructions,
    string? Phone
);

public record UserContactDto(
    Guid? Id,
    bool IsPrincipal,
    string? Phone,
    string? EmailAddress
);

public record UserSizePreferenceDto(
    string? PreferredSystem,
    string? FootwearEU,
    string? FootwearUS,
    string? FootwearUK,
    string? Tops,
    string? Bottoms
);