using FirebaseAdmin.Auth;
using KickSneak.Infrastructure.Contracts;
using System.Security.Claims;

namespace KickSneak.WebApi.Middlewares;

public sealed class FirebaseAuthMiddleware(RequestDelegate next, ILogger<FirebaseAuthMiddleware> logger)
{
    private const string BearerPrefix = "Bearer ";

    public async Task InvokeAsync(HttpContext context, Lazy<ICacheService> cache)
    {
        // ── Internal service-to-service token (admin-v2 → backend) ──
        // Allows server actions to call admin endpoints without a Firebase JWT.
        var internalToken = context.Request.Headers["X-Internal-Token"].ToString();
        var expectedToken = Environment.GetEnvironmentVariable("KS_ADMIN_PASSWORD");

        if (!string.IsNullOrWhiteSpace(internalToken)
            && !string.IsNullOrWhiteSpace(expectedToken)
            && internalToken == expectedToken)
        {
            List<Claim> adminClaims =
            [
                new("uid",           "internal-admin"),
                new(ClaimTypes.Email, "admin@kicksneak.local"),
                new(ClaimTypes.Role,  "Admin"),
                new("display_name",  "Internal Admin"),
            ];

            context.User = new ClaimsPrincipal(new ClaimsIdentity(adminClaims, "InternalToken"));

            logger.LogInformation("[AUTH] Internal-token auth for {Path}", context.Request.Path);

            await next(context);
            return;
        }

        var authHeader = context.Request.Headers.Authorization.ToString();
        string? token = null;

        if (!string.IsNullOrWhiteSpace(authHeader) && authHeader.StartsWith(BearerPrefix))
        {
            token = authHeader[BearerPrefix.Length..].Trim();
        }
        else if (context.Request.Query.TryGetValue("access_token", out var accessToken))
        {
            token = accessToken;
        }

        if (string.IsNullOrWhiteSpace(token))
        {
            await next(context);
            return;
        }

        var clientIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        try
        {
            // Token blacklist disabled for demo — caused spurious 401s after logout/
            // account-delete (stale token stayed blacklisted). Re-enable for prod.
            // var blacklistKey = $"auth:blacklist:{token[..Math.Min(token.Length, 20)]}";
            // if (await cache.Value.ExistsAsync(blacklistKey))
            // {
            //     context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            //     return;
            // }

            var decoded = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(token);

            var uid = decoded.Uid;
            var email = decoded.Claims.TryGetValue("email", out var e) ? e?.ToString() ?? string.Empty : string.Empty;
            var provider = decoded.Claims.TryGetValue("firebase", out var f) ? f?.ToString() ?? string.Empty : string.Empty;
            var displayName = decoded.Claims.TryGetValue("name", out var n) ? n?.ToString() ?? string.Empty : string.Empty;
            var picture = decoded.Claims.TryGetValue("picture", out var pic) ? pic?.ToString() ?? string.Empty : string.Empty;

            var sessionKey = $"auth:session:{decoded.Uid}";
            var knownIpsKey = $"auth:ips:{decoded.Uid}";

            var knownIps = await cache.Value.GetAsync<HashSet<string>>(knownIpsKey) ?? [];

            if (!knownIps.Contains(clientIp))
            {
                knownIps.Add(clientIp);
                await cache.Value.SetAsync(knownIpsKey, knownIps, TimeSpan.FromDays(30));

                logger.LogWarning("[AUTH] New IP detected for user {Uid}: {IP}", decoded.Uid, clientIp);

                context.Items["NewIpDetected"] = true;
            }

            await cache.Value.SetAsync(sessionKey, new
            {
                decoded.Uid,
                email,
                LastSeen = DateTimeOffset.UtcNow,
                clientIp
            }, TimeSpan.FromHours(1));

            List<Claim> claims =
            [
                new("uid",                          decoded.Uid),
                new(ClaimTypes.Email,               email ?? string.Empty),
                new("display_name",                 displayName),
                new("picture",                      picture),
                new("client_ip",                    clientIp),
                new("firebase_sign_in_provider",    provider ?? string.Empty)
            ];

            context.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Firebase"));

            logger.LogInformation("[AUTH] Authenticated user {Uid} from IP {IP}", decoded.Uid, clientIp);
        }
        catch (FirebaseAuthException ex)
        {
            logger.LogWarning("[AUTH] Invalid token from IP {IP}: {Reason}", clientIp, ex.AuthErrorCode);

            context.Response.StatusCode = StatusCodes.Status401Unauthorized;

            return;
        }

        await next(context);
    }
}
