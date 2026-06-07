using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore.Diagnostics;
using System.Data.Common;

namespace KickSneak.Persistence.Interceptors;

public sealed class RlsSessionInterceptor(IHttpContextAccessor httpContextAccessor) : DbCommandInterceptor
{
    public override async ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
        DbCommand command, CommandEventData eventData, InterceptionResult<DbDataReader> result,
        CancellationToken ct = default
    )
    {
        await SetSessionVariables(command, ct);

        return result;
    }

    public override async ValueTask<InterceptionResult<int>> NonQueryExecutingAsync(
        DbCommand command, CommandEventData eventData, InterceptionResult<int> result,
        CancellationToken ct = default
    )
    {
        await SetSessionVariables(command, ct);

        return result;
    }

    public override async ValueTask<InterceptionResult<object>> ScalarExecutingAsync(
        DbCommand command, CommandEventData eventData, InterceptionResult<object> result,
        CancellationToken ct = default
    )
    {
        await SetSessionVariables(command, ct);
        return result;
    }

    private async Task SetSessionVariables(DbCommand command, CancellationToken ct)
    {
        var ctx = httpContextAccessor.HttpContext;

        if (ctx is null) 
            return;

        var (role, userId) = ResolveRoleAndUser(ctx);

        var original = command.CommandText;

        command.CommandText = $"""
            SET LOCAL ROLE {role};
            SELECT set_config('app.current_user_id', '{userId}', true);
            {original}
        """;
    }

    private static (string role, string userId) ResolveRoleAndUser(HttpContext ctx)
    {
        var uid = ctx.User.FindFirst("uid")?.Value;

        if (string.IsNullOrEmpty(uid))
            return ("ks_guest", Guid.Empty.ToString());

        var dbUserId = ctx.Items["DbUserId"]?.ToString() ?? Guid.Empty.ToString();
        var isSeller = ctx.Items["IsSeller"] is true;

        return isSeller
            ? ("ks_seller", dbUserId)
            : ("ks_user", dbUserId);
    }
}
