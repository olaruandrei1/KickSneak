using Microsoft.Extensions.DependencyInjection;

namespace KickSneak.Domain.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddLazyScoped<TService, TImplementation>(this IServiceCollection services)
    where TService : class
    where TImplementation : class, TService
    {
        services.AddScoped<TService, TImplementation>();
        services.AddScoped(provider => new Lazy<TService>(() => provider.GetRequiredService<TService>()));

        return services;
    }

    public static IServiceCollection AddLazyTransient<TService, TImplementation>(this IServiceCollection services)
    where TService : class
    where TImplementation : class, TService
    {
        services.AddTransient<TService, TImplementation>();
        services.AddTransient(provider => new Lazy<TService>(() => provider.GetRequiredService<TService>()));

        return services;
    }

    public static IServiceCollection AddLazySingleton<TService, TImplementation>(this IServiceCollection services)
    where TService : class
    where TImplementation : class, TService
    {
        services.AddSingleton<TService, TImplementation>();
        services.AddSingleton(provider => new Lazy<TService>(() => provider.GetRequiredService<TService>()));

        return services;
    }
}
