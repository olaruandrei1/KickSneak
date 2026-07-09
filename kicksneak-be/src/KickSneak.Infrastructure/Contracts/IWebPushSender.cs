namespace KickSneak.Infrastructure.Contracts;

/// <summary>Best-effort browser Web Push sender (VAPID). No-op if keys are unset.</summary>
public interface IWebPushSender
{
    Task SendAsync(string endpoint, string p256dh, string auth, string payloadJson, CancellationToken ct = default);
}
