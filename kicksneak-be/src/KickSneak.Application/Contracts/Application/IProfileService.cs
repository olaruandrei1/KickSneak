using KickSneak.Domain.DTOs.Profile;

namespace KickSneak.Application.Contracts.Application;

public interface IProfileService
{
    Task<UserProfileDto?> GetProfileAsync(string firebaseUid, CancellationToken ct = default);
    Task<UserProfileDto> UpdateProfileAsync(string firebaseUid, UpdateProfileDto dto, CancellationToken ct = default);

    Task<List<UserAddressDto>> GetAddressesAsync(string firebaseUid, CancellationToken ct = default);
    Task<UserAddressDto> UpsertAddressAsync(string firebaseUid, UserAddressDto dto, CancellationToken ct = default);
    Task DeleteAddressAsync(string firebaseUid, Guid addressId, CancellationToken ct = default);
    Task SetDefaultAddressAsync(string firebaseUid, Guid addressId, CancellationToken ct = default);

    Task<List<UserContactDto>> GetContactsAsync(string firebaseUid, CancellationToken ct = default);
    Task<UserContactDto> UpsertContactAsync(string firebaseUid, UserContactDto dto, CancellationToken ct = default);
    Task DeleteContactAsync(string firebaseUid, Guid contactId, CancellationToken ct = default);

    Task<UserSizePreferenceDto?> GetSizesAsync(string firebaseUid, CancellationToken ct = default);
    Task<UserSizePreferenceDto> SaveSizesAsync(string firebaseUid, UserSizePreferenceDto dto, CancellationToken ct = default);
}
