using KickSneak.WebApi.Filters;

namespace KickSneak.WebApi.Middlewares;

public static class MiddlewareExtensions
{
    extension(IApplicationBuilder app)
    {
        public IApplicationBuilder UseSecurityHeaders()
        => app.UseMiddleware<SecurityHeadersMiddleware>();

        public IApplicationBuilder UseTracing()
        => app.UseMiddleware<TraceMiddleware>();

        public IApplicationBuilder UseFirebaseAuth()
        => app.UseMiddleware<FirebaseAuthMiddleware>();

        public IApplicationBuilder UseCustomRateLimiter()
        => app.UseMiddleware<RateLimiterMiddleware>();

        public IApplicationBuilder UseUserResolverMiddleware()
        => app.UseMiddleware<UserResolverMiddleware>();
    }

    extension(RouteGroupBuilder group)
    {
        public RouteGroupBuilder RequireAuth()
        => group.AddEndpointFilter<AuthEndpointFilter>();
    }

    extension(RouteHandlerBuilder builder)
    {
        public RouteHandlerBuilder RequireAuth()
        => builder.AddEndpointFilter<AuthEndpointFilter>();
    }
}