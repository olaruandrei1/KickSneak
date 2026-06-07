using KickSneak.Application.Contracts.Application;
using KickSneak.Domain.DTOs.Reviews;
using KickSneak.WebApi.Middlewares;

namespace KickSneak.WebApi.Endpoints;

public static class ReviewEndpoints
{
    public static void MapReviewEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/reviews").RequireAuth();

        group.MapPost("/", async (IReviewService svc, HttpContext ctx, CreateReviewDto dto, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            return Results.Ok(await svc.CreateReviewAsync(uid, dto, ct));
        });

        group.MapGet("/has-review/{orderId:guid}", async (IReviewService svc, HttpContext ctx, Guid orderId, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            return Results.Ok(await svc.HasReviewAsync(uid, orderId, ct));
        });
    }
}
