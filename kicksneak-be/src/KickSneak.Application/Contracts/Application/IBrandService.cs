using KickSneak.Domain.DTOs.Brands;

namespace KickSneak.Application.Contracts.Application;

public interface IBrandService
{
    Task<BrandsResponseDto> GetBrandsAsync(CancellationToken ct = default);
}
