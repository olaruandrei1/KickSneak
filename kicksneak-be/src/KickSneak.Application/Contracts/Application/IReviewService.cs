using KickSneak.Domain.DTOs.Reviews;

namespace KickSneak.Application.Contracts.Application;

public interface IReviewService
{
    Task<ReviewResponseDto> CreateReviewAsync(string firebaseUid, CreateReviewDto dto, CancellationToken ct = default);
    Task<bool> HasReviewAsync(string firebaseUid, Guid orderId, CancellationToken ct = default);
}
