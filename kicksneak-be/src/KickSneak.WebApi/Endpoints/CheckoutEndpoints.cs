using KickSneak.Application.Contracts.Application;
using KickSneak.Domain.DTOs.Checkout;
using KickSneak.WebApi.Middlewares;

namespace KickSneak.WebApi.Endpoints;

public static class CheckoutEndpoints
{
    public static void MapCheckoutEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/checkout").RequireAuth();

        group.MapPost("/stripe/payment-intent", async (
            ICheckoutService svc,
            HttpContext ctx,
            CreatePaymentIntentDto dto,
            CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            var result = await svc.CreatePaymentIntentAsync(uid, dto, ct);
            return result is null ? Results.BadRequest() : Results.Ok(result);
        });

        group.MapPost("/session", async (
            ICheckoutService svc,
            HttpContext ctx,
            CreateCheckoutSessionDto dto,
            CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            var result = await svc.CreateCheckoutSessionAsync(uid, dto, ct);
            return result is null ? Results.BadRequest() : Results.Ok(result);
        });

        app.MapPost("/webhooks/stripe", async (
            ICheckoutService svc,
            HttpRequest req,
            CancellationToken ct) =>
        {
            var payload = await new StreamReader(req.Body).ReadToEndAsync(ct);
            var signature = req.Headers["Stripe-Signature"].ToString();

            try
            {
                await svc.HandleWebhookAsync(payload, signature, ct);
                return Results.Ok();
            }
            catch (Exception ex)
            {
                return Results.BadRequest(ex.Message);
            }
        });
    }
}
