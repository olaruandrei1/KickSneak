using KickSneak.Domain.DTOs.Nav;

namespace KickSneak.Application.Contracts.Application;

public interface INavService
{
    Task<List<NavbarCategoryDto>> GetNavbarCategoriesAsync(CancellationToken ct = default);
    Task<FooterDto?> GetFooterAsync(CancellationToken ct = default);
}
