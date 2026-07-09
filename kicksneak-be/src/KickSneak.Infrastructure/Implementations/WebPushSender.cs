using KickSneak.Infrastructure.Contracts;
using Microsoft.Extensions.Logging;
using WebPush;

namespace KickSneak.Infrastructure.Implementations;

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
            _vapid = new VapidDetails(subject, pub, priv);
        else
            _logger.LogWarning("VAPID keys not set — Web Push disabled");
    }

    public async Task SendAsync(string endpoint, string p256dh, string auth, string payloadJson, CancellationToken ct = default)
    {
        if (_vapid is null) return;

        try
        {
            var sub = new PushSubscription(endpoint, p256dh, auth);
            await _client.SendNotificationAsync(sub, payloadJson, _vapid);
        }
        catch (WebPushException ex)
        {
            // 404/410 → subscription expired (could be pruned). Best-effort.
            _logger.LogWarning("WebPush send failed: {Status}", ex.StatusCode);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "WebPush send error");
        }
    }
}
