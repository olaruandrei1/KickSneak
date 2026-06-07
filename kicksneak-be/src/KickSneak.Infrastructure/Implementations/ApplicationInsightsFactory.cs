using KickSneak.Infrastructure.Contracts;
using Microsoft.ApplicationInsights;
using Microsoft.ApplicationInsights.DataContracts;

namespace KickSneak.Infrastructure.Implementations;

public sealed class ApplicationInsightsFactory(TelemetryClient telemetryClient) : IApplicationInsightsFactory
{
    public void TrackRequest(string name, DateTimeOffset startTime, TimeSpan duration, string responseCode, bool success, string? userId = null, Dictionary<string, string>? properties = null)
    {
        var telemetry = new RequestTelemetry
        {
            Name = name,
            Timestamp = startTime,
            Duration = duration,
            ResponseCode = responseCode,
            Success = success
        };

        if (userId is not null)
            telemetry.Context.User.AuthenticatedUserId = userId;

        if (properties is not null)
            foreach (var (key, value) in properties)
                telemetry.Properties[key] = value;

        telemetryClient.TrackRequest(telemetry);
    }

    public void TrackException(Exception exception, Dictionary<string, string>? properties = null)
    {
        var telemetry = new ExceptionTelemetry(exception);

        if (properties is not null)
            foreach (var (key, value) in properties)
                telemetry.Properties[key] = value;

        telemetryClient.TrackException(telemetry);
    }

    public void TrackEvent(string eventName, Dictionary<string, string>? properties = null)
    => telemetryClient.TrackEvent(eventName, properties);
}
