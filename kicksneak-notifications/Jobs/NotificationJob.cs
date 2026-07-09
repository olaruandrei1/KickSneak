using System.Text.Json;
using KickSneak.Notifications.Domain;
using KickSneak.Notifications.Infrastructure;
using Microsoft.Extensions.Logging;
using Quartz;

namespace KickSneak.Notifications.Jobs;

/// <summary>
/// Main notification job. Runs all registered INotificationRule instances,
/// respects notification_settings, creates in-app notifications, and sends WebPush.
/// </summary>
[DisallowConcurrentExecution]
public sealed class NotificationJob : IJob
{
    private readonly IEnumerable<INotificationRule> _rules;
    private readonly ISubscriberRepository _subscribers;
    private readonly INotificationStore _store;
    private readonly IWebPushSender _pushSender;
    private readonly ILogger<NotificationJob> _logger;

    public NotificationJob(
        IEnumerable<INotificationRule> rules,
        ISubscriberRepository subscribers,
        INotificationStore store,
        IWebPushSender pushSender,
        ILogger<NotificationJob> logger)
    {
        _rules = rules;
        _subscribers = subscribers;
        _store = store;
        _pushSender = pushSender;
        _logger = logger;
    }

    public async Task Execute(IJobExecutionContext context)
    {
        var ct = context.CancellationToken;
        _logger.LogInformation("[NotifJob] Starting notification evaluation...");

        // ── Step 1: Evaluate all rules ──────────────────────────────────────
        var allPending = new List<PendingNotification>();

        foreach (var rule in _rules)
        {
            try
            {
                var results = await rule.EvaluateAsync(ct);
                if (results.Count > 0)
                {
                    _logger.LogInformation("[NotifJob] Rule '{Rule}' produced {Count} notification(s)", rule.Name, results.Count);
                    allPending.AddRange(results);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[NotifJob] Rule '{Rule}' failed", rule.Name);
            }
        }

        if (allPending.Count == 0)
        {
            _logger.LogInformation("[NotifJob] 0 notifications to send. Done.");
            return;
        }

        // ── Step 2: Expand broadcast notifications (UserId == Guid.Empty) ───
        var expanded = new List<PendingNotification>();
        foreach (var n in allPending)
        {
            if (n.UserId == Guid.Empty)
            {
                // Broadcast: send to all subscribed users
                var userIds = await _subscribers.GetAllSubscribedUserIdsAsync(ct);
                expanded.AddRange(userIds.Select(uid => n with { UserId = uid }));
            }
            else
            {
                expanded.Add(n);
            }
        }

        // ── Step 3: Group by user, respect settings, send ───────────────────
        var grouped = expanded.GroupBy(n => n.UserId);
        var sentCount = 0;
        var skippedCount = 0;

        foreach (var userGroup in grouped)
        {
            var userId = userGroup.Key;

            foreach (var notification in userGroup)
            {
                // Check notification_settings
                var enabled = await _subscribers.IsNotificationTypeEnabledAsync(userId, notification.Type, ct);
                if (!enabled)
                {
                    _logger.LogDebug("[NotifJob] Skipping '{Type}' for user {UserId} (disabled in settings)", notification.Type, userId);
                    skippedCount++;
                    continue;
                }

                // Insert in-app notification
                try
                {
                    await _store.InsertInAppAsync(userId, notification.Type, notification.Title, notification.Body, ct);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[NotifJob] Failed to insert in-app notification for user {UserId}", userId);
                }

                // Send WebPush to all user's subscriptions
                var subs = await _subscribers.GetSubscribersForUserAsync(userId, ct);
                if (subs.Count == 0)
                {
                    _logger.LogDebug("[NotifJob] No push subscriptions for user {UserId}, in-app only", userId);
                    sentCount++;
                    continue;
                }

                var payload = JsonSerializer.Serialize(new
                {
                    title = notification.Title,
                    body = notification.Body,
                    url = notification.Url ?? "/"
                });

                foreach (var sub in subs)
                {
                    var success = await _pushSender.SendAsync(sub.Endpoint, sub.P256dh, sub.Auth, payload, ct);
                    if (!success)
                    {
                        // Subscription expired — prune it
                        await _subscribers.MarkSubscriptionDeletedAsync(sub.Endpoint, ct);
                    }
                }

                sentCount++;
            }
        }

        _logger.LogInformation("[NotifJob] Done. Sent: {Sent}, Skipped (disabled): {Skipped}", sentCount, skippedCount);
    }
}
