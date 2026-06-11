using KickSneak.Infrastructure.Contracts;
using Microsoft.Extensions.Logging;

namespace KickSneak.Infrastructure.Implementations;

public sealed class GrafanaObservabilityFactory(ILogger<GrafanaObservabilityFactory> logger) : IObservabilityFactory
{
    public void TrackRequest(string name, DateTimeOffset startTime, TimeSpan duration, string responseCode, bool success, string? userId = null, Dictionary<string, string>? properties = null)
    {
        using (logger.BeginScope(properties ?? []))
        {
            logger.LogInformation(
                "[REQUEST] {Name} | {StatusCode} | {Duration}ms | User: {User} | Success: {Success}",
                name, responseCode, duration.TotalMilliseconds, userId ?? "anonymous", success);
        }
    }

    public void TrackException(Exception exception, Dictionary<string, string>? properties = null)
    {
        using (logger.BeginScope(properties ?? []))
        {
            logger.LogError(exception, "[EXCEPTION] {Message}", exception.Message);
        }
    }

    public void TrackEvent(string eventName, Dictionary<string, string>? properties = null)
    {
        using (logger.BeginScope(properties ?? []))
        {
            logger.LogInformation("[EVENT] {EventName}", eventName);
        }
    }
}
