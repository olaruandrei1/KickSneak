using KickSneak.Application.Hubs;

namespace KickSneak.WebApi.Endpoints;

public static class EndpointExtensions
{
    public static WebApplication MapAllEndpoints(this WebApplication app)
    {
        app.MapProfileEndpoints();
        app.MapCartEndpoints();
        app.MapFavoritesEndpoints();
        app.MapOrderEndpoints();
        app.MapProductEndpoints();
        app.MapNotificationEndpoints();
        app.MapSellerEndpoints();
        app.MapAuctionEndpoints();
        app.MapCheckoutEndpoints();
        app.MapBrandEndpoints();
        app.MapNavEndpoints();
        app.MapUserProfileEndpoints();
        app.MapSeedEndpoints();
        app.MapAuthEndpoints();
        app.MapReturnEndpoints();
        app.MapReviewEndpoints();

        app.MapHub<NotificationHub>("/hubs/notifications");
        app.MapHub<AuctionHub>("/hubs/auction");

        return app;
    }
}
