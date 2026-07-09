using KickSneak.BackgroundServices.Channels;
using KickSneak.BackgroundServices.Jobs;
using KickSneak.Infrastructure.Contracts;
using Microsoft.Extensions.DependencyInjection;
using Quartz;

namespace KickSneak.BackgroundServices;

public static class RegisterDependencies
{
    extension(IServiceCollection services)
    {
        public IServiceCollection AddCloseAuctionJob()
        {
            services.AddQuartz(q =>
            {
                var jobKey = JobKey.Create("auction-close");
                q.AddJob<AuctionCloseJob>(jobKey);
                q.AddTrigger(t => t
                    .ForJob(jobKey)
                    .WithSimpleSchedule(s => s
                        .WithIntervalInSeconds(30)
                        .RepeatForever()));

                // Demo: one varied notification per minute to real users (off via DEMO_NOTIFICATIONS=off).
                var demoKey = JobKey.Create("demo-notifications");
                q.AddJob<DemoNotificationJob>(demoKey);
                q.AddTrigger(t => t
                    .ForJob(demoKey)
                    .StartAt(DateTimeOffset.UtcNow.AddSeconds(45))
                    .WithSimpleSchedule(s => s
                        .WithIntervalInMinutes(1)
                        .RepeatForever()));
            });

            services.AddQuartzHostedService(o => o.WaitForJobsToComplete = true);

            return services;
        }

        public IServiceCollection AddElasticIndexing()
        {
            services.AddSingleton<ProductIndexChannel>();
            services.AddSingleton<IProductIndexChannel>(sp => sp.GetRequiredService<ProductIndexChannel>());
            services.AddHostedService<ProductIndexingJob>();
            services.AddHostedService<ElasticInitJob>();

            return services;
        }

        public IServiceCollection AddJobs()
        => services.AddCloseAuctionJob()
                   .AddElasticIndexing();
    }
}