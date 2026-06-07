using KickSneak.Application.Contracts.Application;
using KickSneak.WebApi.Middlewares;
using System.Security.Claims;

namespace KickSneak.WebApi.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/auth").RequireAuth();

        group.MapPost("/login", async (IAuthService svc, HttpContext ctx, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            var email = ctx.User.FindFirst(ClaimTypes.Email)?.Value;
            var name = ctx.User.FindFirst("display_name")?.Value;
            var picture = ctx.User.FindFirst("picture")?.Value;

            var result = await svc.LoginAsync(uid, email, name, picture, ct);
            return Results.Ok(result);
        });

        group.MapDelete("/account", async (IAuthService svc, HttpContext ctx, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            await svc.DeleteAccountAsync(uid, ct);
            return Results.NoContent();
        });
    }
}
