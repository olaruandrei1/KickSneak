using KickSneak.Domain.DTOs.Returns;

namespace KickSneak.Application.Contracts.Application;

public interface IReturnService
{
    Task<ReturnsResponseDto> GetReturnsAsync(string firebaseUid, CancellationToken ct = default);
    Task<ReturnDto> CreateReturnAsync(string firebaseUid, CreateReturnDto dto, CancellationToken ct = default);
    Task CancelOrderAsync(string firebaseUid, Guid orderId, CancellationToken ct = default);
}
