using KickSneak.AiScheduler;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Quartz;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddHttpClient();

builder.Services.AddQuartz(q =>
{
    var jobKey = new JobKey("RetrainJob");
    q.AddJob<RetrainJob>(opts => opts.WithIdentity(jobKey));

    // Hourly by default (top of every hour). Override with RETRAIN_CRON.
    var cron = Environment.GetEnvironmentVariable("RETRAIN_CRON") ?? "0 0 * * * ?";
    q.AddTrigger(t => t
        .ForJob(jobKey)
        .WithIdentity("RetrainJob-hourly")
        .WithCronSchedule(cron));

    // Also run once shortly after startup so a fresh stack retrains on current data.
    q.AddTrigger(t => t
        .ForJob(jobKey)
        .WithIdentity("RetrainJob-startup")
        .StartAt(DateBuilder.FutureDate(45, IntervalUnit.Second)));
});

builder.Services.AddQuartzHostedService(opts => opts.WaitForJobsToComplete = true);

await builder.Build().RunAsync();
