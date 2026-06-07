using KickSneak.Application.Contracts.Application;

namespace KickSneak.WebApi.Endpoints;

public static class NavEndpoints
{
    public static void MapNavEndpoints(this WebApplication app)
    {
        app.MapGet("/navbar-categories", async (INavService svc, CancellationToken ct) =>
            Results.Ok(await svc.GetNavbarCategoriesAsync(ct)));

        app.MapGet("/footer", async (INavService svc, CancellationToken ct) =>
        {
            var footer = await svc.GetFooterAsync(ct);
            return footer is null ? Results.NotFound() : Results.Ok(footer);
        });
    }
}
