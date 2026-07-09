using KickSneak.Domain.Common;

namespace KickSneak.Domain.Entities.Notifications;

/// <summary>An admin broadcast: fanned out to N users' in-app notifications (+ push).</summary>
public class NotificationBroadcast : BaseEntity
{
    public string? Title { get; set; }
    public string? Body { get; set; }
    public string? Type { get; set; }
    public string? Target { get; set; }   // all | role | user
    public int RecipientCount { get; set; }
}
