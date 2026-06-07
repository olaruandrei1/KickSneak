namespace KickSneak.Domain.DTOs.Auth;

public record AuthUserDto(
    Guid Id,
    string FirebaseUid,
    string? Email,
    string? FirstName,
    string? LastName,
    string? ProfilePhoto,
    bool IsNewUser
);