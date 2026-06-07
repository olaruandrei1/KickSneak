using Dapper;
using KickSneak.Application;
using KickSneak.Application.Hubs;
using KickSneak.BackgroundServices;
using KickSneak.Domain.ConfigurableObjects;
using KickSneak.Infrastructure;
using KickSneak.Persistence;
using KickSneak.Persistence.Context;
using KickSneak.WebApi.Endpoints;
using KickSneak.WebApi.Middlewares;
using Microsoft.EntityFrameworkCore;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration
    .AddJsonFile("appsettings.json", optional: false)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true)
    .AddEnvironmentVariables();

builder.Services.AddPersistenceDependencies(builder.Configuration);
builder.Services.AddApplicationDependencies();
builder.Services.AddInfrastructureDependencies(builder.Configuration);
builder.Services.AddJobs();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                builder.Configuration["Cors:AllowedOrigins"]?.Split(",") ?? ["http://localhost:5173"]
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddSignalR();

builder.Services.AddScoped<INotificationPusher, NotificationPusher>();

builder.Services.AddHttpClient();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var connStrings = scope.ServiceProvider.GetRequiredService<ConnectionStrings>();

    var adminOptions = new DbContextOptionsBuilder<AppDbContext>()
        .UseNpgsql(connStrings.AdminConnection)
        .Options;

    await using var adminDb = new AppDbContext(adminOptions);
    await adminDb.Database.MigrateAsync();

    await using var adminConn = new NpgsqlConnection(connStrings.AdminConnection);

    await adminConn.OpenAsync();

    var rbacSql = GetEmbeddedResource("KickSneak.Persistence.SqlResources.RBAC.sql");

    await adminConn.ExecuteAsync(rbacSql, commandTimeout: 60);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
app.UseHttpsRedirection();

app.UseSecurityHeaders();
app.UseCustomRateLimiter();
app.UseFirebaseAuth();
app.UseUserResolverMiddleware();
app.UseTracing();

app.Use(async (context, next) =>
{
    context.Request.EnableBuffering();
    await next();
});

app.MapAllEndpoints();

app.Run();

static string GetEmbeddedResource(string resourceName)
{
    var assembly = typeof(AppDbContext).Assembly;

    using var stream = assembly.GetManifestResourceStream(resourceName)
        ?? throw new InvalidOperationException($"Resource {resourceName} not found");

    using var reader = new StreamReader(stream);

    return reader.ReadToEnd();
}