using KickSneak.BackgroundServices.Jobs;
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
            });

            services.AddQuartzHostedService(o => o.WaitForJobsToComplete = true);

            return services;
        }

        public IServiceCollection AddJobs()
        => services.AddCloseAuctionJob();
    }
}
