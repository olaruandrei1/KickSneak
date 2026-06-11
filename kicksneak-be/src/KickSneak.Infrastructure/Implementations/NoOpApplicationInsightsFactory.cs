using KickSneak.Infrastructure.Contracts;

namespace KickSneak.Infrastructure.Implementations;

public sealed class NoOpApplicationInsightsFactory : IObservabilityFactory
{
    public void TrackRequest(string name, DateTimeOffset startTime, TimeSpan duration, string responseCode, bool success, string? userId = null, Dictionary<string, string>? properties = null) { }
    public void TrackException(Exception exception, Dictionary<string, string>? properties = null) { }
    public void TrackEvent(string eventName, Dictionary<string, string>? properties = null) { }
}
