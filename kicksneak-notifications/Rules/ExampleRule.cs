using KickSneak.Notifications.Domain;

namespace KickSneak.Notifications.Rules;

/// <summary>
/// Stub rule that returns an empty list (or a test notification if NOTIF_TEST_MODE=true).
/// Replace/supplement with real rules (PriceDropRule, NewReleasesRule, etc.) later.
/// </summary>
public sealed class ExampleRule : INotificationRule
{
    public string Name => "ExampleRule";

    public Task<IReadOnlyList<PendingNotification>> EvaluateAsync(CancellationToken ct)
    {
        var testMode = Environment.GetEnvironmentVariable("NOTIF_TEST_MODE");
        if (string.Equals(testMode, "true", StringComparison.OrdinalIgnoreCase))
        {
            // In test mode, return a sample notification for all users
            // The job will resolve actual user IDs from the subscriber list
            return Task.FromResult<IReadOnlyList<PendingNotification>>(
            [
                new PendingNotification(
                    UserId: Guid.Empty, // Guid.Empty = broadcast to all subscribed users
                    Type: "Marketing",
                    Title: "🎉 Welcome to KickSneak!",
                    Body: "Check out the latest drops and exclusive deals.",
                    Url: "/"
                )
            ]);
        }

        // Stub: no notifications to send
        return Task.FromResult<IReadOnlyList<PendingNotification>>(Array.Empty<PendingNotification>());
    }
}
