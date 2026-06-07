using Dapper;
using KickSneak.Domain.ConfigurableObjects;

namespace KickSneak.WebApi.Middlewares;

public sealed class UserResolverMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext ctx, IServiceProvider sp)
    {
        var uid = ctx.User.FindFirst("uid")?.Value;

        if (!string.IsNullOrEmpty(uid))
        {
            var connStrings = sp.GetRequiredService<ConnectionStrings>();

            await using var conn = new Npgsql.NpgsqlConnection(connStrings.DatabaseConnection);

            await conn.OpenAsync();

            var result = await SqlMapper.QueryFirstOrDefaultAsync<UserLookup>(
                conn,
                """
                    SELECT u."Id", 
                           EXISTS(SELECT 1 FROM sellers s WHERE s."UserId" = u."Id" AND NOT s."IsDeleted") AS "IsSeller"
                    FROM users u 
                    WHERE u."FirebaseUid" = @Uid AND NOT u."IsDeleted"
                """,
                new { Uid = uid }
            );

            if (result is not null)
            {
                ctx.Items["DbUserId"] = result.Id.ToString();
                ctx.Items["IsSeller"] = result.IsSeller;
            }
        }

        await next(ctx);
    }
}

file class UserLookup
{
    public Guid Id { get; init; }
    public bool IsSeller { get; init; }
}
