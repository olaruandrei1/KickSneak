using KickSneak.Infrastructure.Contracts;
using System.Diagnostics;

namespace KickSneak.WebApi.Middlewares;

public sealed class TraceMiddleware(RequestDelegate next, IApplicationInsightsFactory insights, ILogger<TraceMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var traceId = Activity.Current?.TraceId.ToString() ?? Guid.NewGuid().ToString();
        var startTime = DateTimeOffset.UtcNow;
        var stopwatch = Stopwatch.StartNew();

        context.Response.Headers["X-Trace-Id"] = traceId;

        var userId = context.User.FindFirst("uid")?.Value;
        var method = context.Request.Method;
        var path = context.Request.Path;
        var clientIp = context.Connection.RemoteIpAddress?.ToString();

        logger.LogInformation("[TRACE] {Method} {Path} | TraceId: {TraceId} | IP: {IP} | User: {User}", method, path, traceId, clientIp, userId ?? "anonymous");

        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            insights.TrackException(ex, new()
            {
                ["TraceId"] = traceId,
                ["Path"] = path.ToString(),
                ["Method"] = method,
                ["UserId"] = userId ?? "anonymous"
            });

            throw;
        }
        finally
        {
            stopwatch.Stop();

            var statusCode = context.Response.StatusCode.ToString();
            var success = context.Response.StatusCode < 400;

            logger.LogInformation("[TRACE] {Method} {Path} -> {StatusCode} | {Duration}ms | TraceId: {TraceId}",method, path, statusCode, stopwatch.ElapsedMilliseconds, traceId);

            insights.TrackRequest(
                name: $"{method} {path}",
                startTime: startTime,
                duration: stopwatch.Elapsed,
                responseCode: statusCode,
                success: success,
                userId: userId,
                properties: new()
                {
                    ["TraceId"] = traceId,
                    ["ClientIp"] = clientIp ?? "unknown"
                }
            );
        }
    }
}
