using KickSneak.Domain.Entities.Users;

namespace KickSneak.Domain.Entities.Notifications;

/// <summary>Per-user notification channel preferences (one row per user).</summary>
public class NotificationSetting
{
    public Guid UserId { get; set; }
    // Opt-in: everything OFF by default; user enables per category (first enable → push subscribe).
    public bool PriceDrop { get; set; } = false;
    public bool NewReleases { get; set; } = false;
    public bool OrderUpdates { get; set; } = false;
    public bool Marketing { get; set; } = false;

    public User User { get; set; } = null!;
}
