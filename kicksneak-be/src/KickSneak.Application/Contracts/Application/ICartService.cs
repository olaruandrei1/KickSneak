using KickSneak.Domain.DTOs.Cart;

namespace KickSneak.Application.Contracts.Application;

public interface ICartService
{
    Task<CartResponseDto> GetCartAsync(string firebaseUid, CancellationToken ct = default);
    Task<CartResponseDto> AddToCartAsync(string firebaseUid, AddToCartDto dto, CancellationToken ct = default);
    Task<CartResponseDto> RemoveFromCartAsync(string firebaseUid, Guid cartItemId, CancellationToken ct = default);
}
