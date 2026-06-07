namespace KickSneak.Domain.ConfigurableObjects;

public sealed class ConnectionStrings
{
    public string DatabaseConnection { get; init; } = Environment.GetEnvironmentVariable("DB_CONNECTION")
        ?? "Host=localhost;Port=5432;Database=kicksneak;Username=kicksneak_user;Password=KickSneak2026!";

    public string AdminConnection { get; init; } = Environment.GetEnvironmentVariable("DB_ADMIN_CONNECTION")
        ?? "Host=localhost;Port=5432;Database=kicksneak;Username=kicksneak_user;Password=KickSneak2026!";

    public string Redis { get; init; } = Environment.GetEnvironmentVariable("REDIS_CONNECTION")
        ?? "localhost:6379";

    public string AzureBlob { get; init; } = Environment.GetEnvironmentVariable("AZURE_BLOB_CONNECTION")
        ?? "UseDevelopmentStorage=true";

    public string AzureTable { get; init; } = Environment.GetEnvironmentVariable("AZURE_TABLE_CONNECTION")
        ?? "UseDevelopmentStorage=true";
}