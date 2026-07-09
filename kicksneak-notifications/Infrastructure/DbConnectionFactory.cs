using Npgsql;

namespace KickSneak.Notifications.Infrastructure;

/// <summary>
/// Simple factory for creating Npgsql connections.
/// </summary>
public sealed class DbConnectionFactory
{
    private readonly string _connectionString;

    public DbConnectionFactory(string connectionString)
    {
        _connectionString = connectionString;
    }

    public NpgsqlConnection Create() => new(_connectionString);
}
