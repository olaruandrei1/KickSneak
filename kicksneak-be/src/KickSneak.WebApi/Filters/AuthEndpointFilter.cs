namespace KickSneak.WebApi.Filters;

public sealed class AuthEndpointFilter : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var user = context.HttpContext.User;

        if (user.Identity is not { IsAuthenticated: true })
            return Results.Unauthorized();

        var uid = user.FindFirst("uid")?.Value;

        if (string.IsNullOrWhiteSpace(uid))
            return Results.Unauthorized();

        return await next(context);
    }
}