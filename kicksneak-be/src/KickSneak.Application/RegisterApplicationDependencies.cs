using KickSneak.Application.Contracts.Application;
using KickSneak.Application.Implementations;
using Microsoft.Extensions.DependencyInjection;

namespace KickSneak.Application;

public static class RegisterApplicationDependencies
{
    public static IServiceCollection AddApplicationDependencies(this IServiceCollection services)
    => services.AddScoped<IProfileService, ProfileService>()
               .AddScoped<ICartService, CartService>()
               .AddScoped<IFavoritesService, FavoritesService>()
               .AddScoped<IOrderService, OrderService>()
               .AddScoped<IProductService, ProductService>()
               .AddScoped<ISellerService, SellerService>()
               .AddScoped<IAuctionService, AuctionService>()
               .AddScoped<ICheckoutService, CheckoutService>()
               .AddScoped<IBrandService, BrandService>()
               .AddScoped<INavService, NavService>()
               .AddScoped<IAuthService, AuthService>()
               .AddScoped<IReturnService, ReturnService>()
               .AddScoped<IReviewService, ReviewService>()
               .AddScoped<INotificationService, NotificationService>();
}
