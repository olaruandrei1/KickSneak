using Microsoft.Extensions.Logging;
using WebPush;

namespace KickSneak.Notifications.Infrastructure;

/// <summary>
/// Sends WebPush notifications via VAPID. Pattern copied from backend's WebPushSender.cs.
/// Returns false when the subscription is expired (404/410) so the caller can prune it.
/// </summary>
public sealed class WebPushSender : IWebPushSender
{
    private readonly VapidDetails? _vapid;
    private readonly WebPushClient _client = new();
    private readonly ILogger<WebPushSender> _logger;

    public WebPushSender(ILogger<WebPushSender> logger)
    {
        _logger = logger;

        var pub = Environment.GetEnvironmentVariable("VAPID_PUBLIC_KEY");
        var priv = Environment.GetEnvironmentVariable("VAPID_PRIVATE_KEY");
        var subject = Environment.GetEnvironmentVariable("VAPID_SUBJECT") ?? "mailto:admin@kicksneak.local";

        if (!string.IsNullOrWhiteSpace(pub) && !string.IsNullOrWhiteSpace(priv))
        {
            _vapid = new VapidDetails(subject, pub, priv);
            _logger.LogInformation("[WebPush] VAPID configured — push notifications enabled");
        }
        else
        {
            _logger.LogWarning("[WebPush] VAPID keys not set — Web Push disabled (will only create in-app notifications)");
        }
    }

    public async Task<bool> SendAsync(string endpoint, string p256dh, string auth, string payloadJson, CancellationToken ct = default)
    {
        if (_vapid is null) return true; // No VAPID = no-op, don't mark as expired

        try
        {
            var sub = new PushSubscription(endpoint, p256dh, auth);
            await _client.SendNotificationAsync(sub, payloadJson, _vapid);
            return true;
        }
        catch (WebPushException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound ||
                                           ex.StatusCode == System.Net.HttpStatusCode.Gone)
        {
            // 404/410 → subscription expired
            _logger.LogWarning("[WebPush] Subscription expired ({Status}): {Endpoint}",
                ex.StatusCode, endpoint[..Math.Min(60, endpoint.Length)]);
            return false;
        }
        catch (WebPushException ex)
        {
            _logger.LogWarning("[WebPush] Send failed ({Status}): {Endpoint}",
                ex.StatusCode, endpoint[..Math.Min(60, endpoint.Length)]);
            return true; // Transient error, don't prune
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[WebPush] Send error");
            return true;
        }
    }
}
