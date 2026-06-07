namespace KickSneak.WebApi.Middlewares;

public sealed class SecurityHeadersMiddleware(RequestDelegate next)
{
    private static readonly Dictionary<string, string> _headersToAdd = new()
    {
        ["X-Content-Type-Options"] = "nosniff",
        ["X-Frame-Options"] = "DENY",
        ["Cache-Control"] = "no-store, no-cache, must-revalidate, private",
        ["Pragma"] = "no-cache",
        ["Referrer-Policy"] = "strict-origin-when-cross-origin",
        ["Permissions-Policy"] = "geolocation=(), microphone=(), camera=(), payment=(self)",
        ["Content-Security-Policy"] = "default-src 'self'; img-src 'self' data: https:; script-src 'self'"
    };

    private static readonly string[] _headersToRemove =
    [
        "X-Powered-By", "Server", "X-AspNet-Version", "X-AspNetMvc-Version"
    ];

    public async Task InvokeAsync(HttpContext context)
    {
        foreach (var header in _headersToRemove)
            context.Response.Headers.Remove(header);

        foreach (var (key, value) in _headersToAdd)
            context.Response.Headers[key] = value;

        if (context.Request.IsHttps)
            context.Response.Headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload";

        await next(context);
    }
}
