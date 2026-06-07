using KickSneak.Application.Contracts.Application;

namespace KickSneak.WebApi.Endpoints;

public static class BrandEndpoints
{
    public static void MapBrandEndpoints(this WebApplication app)
    {
        app.MapGet("/brands", async (IBrandService svc, CancellationToken ct) =>
        Results.Ok(await svc.GetBrandsAsync(ct)));
    }
}
