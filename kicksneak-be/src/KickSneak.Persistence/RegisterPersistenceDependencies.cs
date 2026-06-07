using KickSneak.Application.Contracts.Persistence;
using KickSneak.Domain.ConfigurableObjects;
using KickSneak.Persistence.Context;
using KickSneak.Persistence.Interceptors;
using KickSneak.Persistence.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace KickSneak.Persistence;

public static class RegisterPersistenceDependencies
{
    public static IServiceCollection AddPersistenceDependencies(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddHttpContextAccessor();
        services.AddSingleton<RlsSessionInterceptor>();

        ConnectionStrings connStrings = new ();

        services.AddSingleton(connStrings);

        AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

        services.AddDbContext<AppDbContext>((sp, options) =>
            options.UseNpgsql(connStrings.DatabaseConnection, npgsql => npgsql.EnableRetryOnFailure(3, TimeSpan.FromSeconds(5), null))
                   .ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning))
                   .AddInterceptors(sp.GetRequiredService<RlsSessionInterceptor>())
        );

        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        return services;
    }
}