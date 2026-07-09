using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace KickSneak.Persistence.Context;

/// <summary>
/// Design-time factory so `dotnet ef migrations` can build the context
/// without running the full app host (which connects to DB + runs RBAC).
/// The connection string is only parsed, not connected to, for `migrations add`.
/// </summary>
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        // Must match runtime (RegisterPersistenceDependencies) so the generated model
        // snapshot uses the same timestamp mapping — otherwise MigrateAsync trips
        // PendingModelChangesWarning at startup.
        AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

        var cs = Environment.GetEnvironmentVariable("DB_CONNECTION")
            ?? "Host=localhost;Port=5432;Database=kicksneak;Username=kicksneak_user;Password=KickSneak2026!";

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(cs)
            .Options;

        return new AppDbContext(options);
    }
}
