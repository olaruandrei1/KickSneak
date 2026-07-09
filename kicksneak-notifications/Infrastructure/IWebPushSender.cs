namespace KickSneak.Notifications.Infrastructure;

public interface IWebPushSender
{
    /// <summary>Send a WebPush notification. Returns true if sent, false if subscription expired (404/410).</summary>
    Task<bool> SendAsync(string endpoint, string p256dh, string auth, string payloadJson, CancellationToken ct = default);
}
