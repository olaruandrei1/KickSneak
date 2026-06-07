namespace KickSneak.Domain.DTOs.Profile;

public record AddressDto(
    Guid Id,
    string Label,
    string FirstName,
    string LastName,
    string Street,
    string City,
    string County,
    string Zip,
    string Country,
    string Phone,
    string? AlternateEmail,
    bool IsDefault
);
