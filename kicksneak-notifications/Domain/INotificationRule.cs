namespace KickSneak.Notifications.Domain;

/// <summary>
/// A notification rule evaluates conditions and returns pending notifications.
/// To add a new rule: implement this interface + register it in Program.cs DI.
/// </summary>
public interface INotificationRule
{
    /// <summary>Rule name for logging.</summary>
    string Name { get; }

    /// <summary>
    /// Evaluate the rule and return any notifications that should be sent.
    /// </summary>
    Task<IReadOnlyList<PendingNotification>> EvaluateAsync(CancellationToken ct);
}
