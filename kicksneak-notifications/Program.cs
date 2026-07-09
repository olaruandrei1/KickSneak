using KickSneak.Notifications.Domain;
using KickSneak.Notifications.Infrastructure;
using KickSneak.Notifications.Jobs;
using KickSneak.Notifications.Rules;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Quartz;

var builder = Host.CreateApplicationBuilder(args);

// ── DB connection string ────────────────────────────────────────────────
var dbConn = Environment.GetEnvironmentVariable("NOTIF_DB_CONNECTION")
          ?? Environment.GetEnvironmentVariable("DB_CONNECTION")
          ?? "Host=localhost;Port=5432;Database=kicksneak;Username=ks_owner;Password=KsOwner2026!";

builder.Services.AddSingleton<DbConnectionFactory>(_ => new DbConnectionFactory(dbConn));

// ── Infrastructure ──────────────────────────────────────────────────────
builder.Services.AddSingleton<ISubscriberRepository, SubscriberRepository>();
builder.Services.AddSingleton<INotificationStore, NotificationStore>();
builder.Services.AddSingleton<IWebPushSender, WebPushSender>();

// ── Notification Rules (pluggable — add new rules here) ─────────────────
builder.Services.AddTransient<INotificationRule, ExampleRule>();
// builder.Services.AddTransient<INotificationRule, PriceDropRule>();
// builder.Services.AddTransient<INotificationRule, NewReleasesRule>();

// ── Quartz scheduler ────────────────────────────────────────────────────
builder.Services.AddQuartz(q =>
{
    var jobKey = new JobKey("NotificationJob");
    q.AddJob<NotificationJob>(opts => opts.WithIdentity(jobKey));

    // Cron schedule (default: every hour at minute 0)
    var cron = Environment.GetEnvironmentVariable("NOTIF_CRON") ?? "0 0 * * * ?";
    q.AddTrigger(t => t
        .ForJob(jobKey)
        .WithIdentity("NotificationJob-cron")
        .WithCronSchedule(cron));

    // Also run once 10s after startup
    q.AddTrigger(t => t
        .ForJob(jobKey)
        .WithIdentity("NotificationJob-startup")
        .StartAt(DateBuilder.FutureDate(10, IntervalUnit.Second)));
});

builder.Services.AddQuartzHostedService(opts => opts.WaitForJobsToComplete = true);

Console.WriteLine("[Notifications] Starting KickSneak Notification Service...");
Console.WriteLine($"[Notifications] DB: {(dbConn.Contains("Host=") ? dbConn[..dbConn.IndexOf(';')] + ";..." : "configured")}");

await builder.Build().RunAsync();
