using KickSneak.Domain.DTOs.Favorites;

namespace KickSneak.Application.Contracts.Application;

public interface IFavoritesService
{
    Task<FavoritesResponseDto> GetFavoritesAsync(string firebaseUid, CancellationToken ct = default);
    Task<FavoritesResponseDto> ToggleFavoriteAsync(string firebaseUid, ToggleFavoriteDto dto, CancellationToken ct = default);
}
