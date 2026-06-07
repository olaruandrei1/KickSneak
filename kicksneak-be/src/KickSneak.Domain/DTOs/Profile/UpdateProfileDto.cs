namespace KickSneak.Domain.DTOs.Profile;

public record UpdateProfileDto(
    string? FirstName,
    string? LastName,
    string? PhotoURL,
    Guid? GenderId,
    DateTime? BirthDate
);
