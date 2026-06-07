using System.Collections.Concurrent;

namespace KickSneak.WebApi.Middlewares;

public sealed class RateLimiterMiddleware(RequestDelegate next, ILogger<RateLimiterMiddleware> logger)
{
    private sealed class RateLimitBucket
    {
        private readonly Queue<DateTime> _timestamps = new();
        private readonly object _lock = new();

        public int Count => _timestamps.Count;

        public void Add()
        {
            lock (_lock) _timestamps.Enqueue(DateTime.UtcNow);
        }

        public void Cleanup(int windowSeconds)
        {
            var cutoff = DateTime.UtcNow.AddSeconds(-windowSeconds);

            lock (_lock)
                while (_timestamps.TryPeek(out var ts) && ts < cutoff)
                    _timestamps.Dequeue();
        }
    }

    private record RateLimitPolicy(int MaxRequests, int WindowSeconds);

    private static readonly ConcurrentDictionary<string, RateLimitBucket> _buckets = new();
    private static readonly RateLimitPolicy _defaultPolicy = new(100, 60);
    private static readonly RateLimitPolicy _authPolicy = new(10, 60);
    private static readonly RateLimitPolicy _strictPolicy = new(5, 60);

    private static readonly Dictionary<string, RateLimitPolicy> _pathPolicies = new()
    {
        ["/auth/"] = _authPolicy,
        ["/checkout/"] = _strictPolicy,
        ["/auctions/"] = new(30, 60)
    };

    public async Task InvokeAsync(HttpContext context)
    {
        var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var path = context.Request.Path.Value?.ToLowerInvariant() ?? "/";
        var userId = context.User.FindFirst("uid")?.Value;

        var policy = userId is not null
            ? ResolvePolicy(path) with { MaxRequests = ResolvePolicy(path).MaxRequests * 3 }
            : ResolvePolicy(path);

        var key = userId ?? ip;
        var bucket = _buckets.GetOrAdd($"{key}:{path}", _ => new RateLimitBucket());

        bucket.Cleanup(policy.WindowSeconds);

        if (bucket.Count >= policy.MaxRequests)
        {
            logger.LogWarning("[RATE LIMIT] {Key} exceeded limit on {Path}", key, path);

            context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            context.Response.Headers["Retry-After"] = policy.WindowSeconds.ToString();
            context.Response.Headers["X-RateLimit-Limit"] = policy.MaxRequests.ToString();
            context.Response.Headers["X-RateLimit-Remaining"] = "0";

            return;
        }

        bucket.Add();

        context.Response.Headers["X-RateLimit-Limit"] = policy.MaxRequests.ToString();
        context.Response.Headers["X-RateLimit-Remaining"] = (policy.MaxRequests - bucket.Count).ToString();

        await next(context);
    }

    private static RateLimitPolicy ResolvePolicy(string path)
    {
        foreach (var (prefix, policy) in _pathPolicies)
            if (path.StartsWith(prefix))
                return policy;

        return _defaultPolicy;
    }
}
