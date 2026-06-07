using KickSneak.Application.Contracts.Application;
using KickSneak.Application.Contracts.Persistence;
using KickSneak.Domain.DTOs.Profile;
using KickSneak.WebApi.Middlewares;

namespace KickSneak.WebApi.Endpoints;

public static class UserProfileEndpoints
{
    public static void MapUserProfileEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/profile").RequireAuth();

        group.MapGet("/addresses", async (IProfileService svc, HttpContext ctx, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            return Results.Ok(await svc.GetAddressesAsync(uid, ct));
        });

        group.MapPost("/addresses", async (IProfileService svc, HttpContext ctx, UserAddressDto dto, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            return Results.Ok(await svc.UpsertAddressAsync(uid, dto, ct));
        });

        group.MapDelete("/addresses/{id:guid}", async (IProfileService svc, HttpContext ctx, Guid id, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            await svc.DeleteAddressAsync(uid, id, ct);
            return Results.NoContent();
        });

        group.MapPatch("/addresses/{id:guid}/default", async (IProfileService svc, HttpContext ctx, Guid id, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            await svc.SetDefaultAddressAsync(uid, id, ct);
            return Results.NoContent();
        });

        group.MapGet("/contacts", async (IProfileService svc, HttpContext ctx, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            return Results.Ok(await svc.GetContactsAsync(uid, ct));
        });

        group.MapPost("/contacts", async (IProfileService svc, HttpContext ctx, UserContactDto dto, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            return Results.Ok(await svc.UpsertContactAsync(uid, dto, ct));
        });

        group.MapDelete("/contacts/{id:guid}", async (IProfileService svc, HttpContext ctx, Guid id, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            await svc.DeleteContactAsync(uid, id, ct);
            return Results.NoContent();
        });

        group.MapGet("/sizes", async (IProfileService svc, HttpContext ctx, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            return Results.Ok(await svc.GetSizesAsync(uid, ct));
        });

        group.MapPost("/sizes", async (IProfileService svc, HttpContext ctx, UserSizePreferenceDto dto, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            return Results.Ok(await svc.SaveSizesAsync(uid, dto, ct));
        });

        group.MapGet("/me", async (IProfileService svc, HttpContext ctx, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            var result = await svc.GetProfileAsync(uid, ct);
            return result is null ? Results.NotFound() : Results.Ok(result);
        });

        group.MapPut("/me", async (IProfileService svc, HttpContext ctx, UpdateProfileDto dto, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            var result = await svc.UpdateProfileAsync(uid, dto, ct);
            return result is null ? Results.NotFound() : Results.Ok(result);
        });

        group.MapGet("/genders", async (IUnitOfWork uow, CancellationToken ct) =>
        {
            var genders = await uow.Genders.GetAllAsync(ct);
            return Results.Ok(genders.Select(g => new { id = g.Id, name = g.Name }));
        });
    }
}
