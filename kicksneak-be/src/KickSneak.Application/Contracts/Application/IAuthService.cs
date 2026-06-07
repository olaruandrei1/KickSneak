using KickSneak.Domain.DTOs.Auth;

namespace KickSneak.Application.Contracts.Application;

public interface IAuthService
{
    Task<AuthUserDto> LoginAsync(string firebaseUid, string? email, string? displayName, string? picture, CancellationToken ct = default);
    Task DeleteAccountAsync(string firebaseUid, CancellationToken ct = default);
}
