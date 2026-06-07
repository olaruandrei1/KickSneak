using KickSneak.Application.Contracts.Application;
using KickSneak.Domain.DTOs.Profile;
using KickSneak.WebApi.Middlewares;

namespace KickSneak.WebApi.Endpoints;

public static class ProfileEndpoints
{
    public static void MapProfileEndpoints(this WebApplication app)
    {
        RouteGroupBuilder group = app.MapGroup("/profile").RequireAuth();

        group.MapGet("/", async (IProfileService svc, HttpContext ctx, CancellationToken ct) =>
        {
            string uid = ctx.User.FindFirst("uid")?.Value!;
            UserProfileDto? profile = await svc.GetProfileAsync(uid, ct);

            return profile is null ? Results.NotFound() : Results.Ok(profile);
        });

        group.MapPut("/", async (IProfileService svc, HttpContext ctx, UpdateProfileDto dto, CancellationToken ct) =>
        {
            string uid = ctx.User.FindFirst("uid")?.Value!;
            UserProfileDto? profile = await svc.UpdateProfileAsync(uid, dto, ct);

            return profile is null ? Results.NotFound() : Results.Ok(profile);
        });
    }
}
