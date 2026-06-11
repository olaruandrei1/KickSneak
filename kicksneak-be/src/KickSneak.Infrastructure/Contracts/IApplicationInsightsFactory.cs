namespace KickSneak.Infrastructure.Contracts;

public interface IObservabilityFactory
{
    void TrackRequest(string name, DateTimeOffset startTime, TimeSpan duration, string responseCode, bool success, string? userId = null, Dictionary<string, string>? properties = null);
    void TrackException(Exception exception, Dictionary<string, string>? properties = null);
    void TrackEvent(string eventName, Dictionary<string, string>? properties = null);
}