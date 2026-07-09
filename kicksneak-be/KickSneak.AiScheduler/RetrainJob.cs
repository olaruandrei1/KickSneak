using Microsoft.Extensions.Logging;
using Quartz;

namespace KickSneak.AiScheduler;

/// <summary>
/// Fires the AI service global retrain (which reads every user's latest
/// interactions from the DB → hybrid per-user personalization at inference).
/// </summary>
[DisallowConcurrentExecution]
public sealed class RetrainJob(IHttpClientFactory httpFactory, ILogger<RetrainJob> logger) : IJob
{
    public async Task Execute(IJobExecutionContext context)
    {
        var url = (Environment.GetEnvironmentVariable("AI_SERVICE_URL") ?? "http://ai-service:5050").TrimEnd('/');
        var client = httpFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(30);

        try
        {
            var resp = await client.PostAsync($"{url}/api/train", null, context.CancellationToken);
            logger.LogInformation("AI retrain triggered → HTTP {Status}", (int)resp.StatusCode);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "AI retrain trigger failed (ai-service down?)");
        }
    }
}
