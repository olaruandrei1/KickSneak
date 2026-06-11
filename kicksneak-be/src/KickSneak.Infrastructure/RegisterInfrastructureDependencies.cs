using Azure.Data.Tables;
using Azure.Storage.Blobs;
using Elastic.Clients.Elasticsearch;
using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;
using KickSneak.Domain.ConfigurableObjects;
using KickSneak.Domain.Extensions;
using KickSneak.Infrastructure.Contracts;
using KickSneak.Infrastructure.Implementations;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StackExchange.Redis;
using Stripe;
using System.Text;

namespace KickSneak.Infrastructure;

public static class RegisterInfrastructureDependencies
{
    public static IServiceCollection AddInfrastructureDependencies(this IServiceCollection services, IConfiguration configuration)
    {
        var connStrings = services.BuildServiceProvider().GetRequiredService<ConnectionStrings>();
        var stripeSettings = new StripeSettings();

        services.AddSingleton(stripeSettings);

        if (!string.IsNullOrEmpty(connStrings.Redis))
        {
            services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(connStrings.Redis));
            services.AddLazyScoped<ICacheService, RedisCacheService>();
            services.AddLazySingleton<IAuctionCacheService, AuctionCacheService>();
        }

        if (!string.IsNullOrEmpty(connStrings.AzureBlob))
        {
            services.AddSingleton(_ => new BlobServiceClient(connStrings.AzureBlob));
            services.AddLazyScoped<IBlobStorageService, BlobStorageService>();
        }

        if (!string.IsNullOrEmpty(connStrings.AzureTable))
        {
            services.AddSingleton(_ => new TableServiceClient(connStrings.AzureTable));
            services.AddLazyScoped<IAzureTableService, AzureTableService>();
        }

        StripeConfiguration.ApiKey = stripeSettings.SecretKey;
        services.AddLazyScoped<IStripeService, StripeService>();

        if (FirebaseApp.DefaultInstance == null)
        {
            var firebaseB64 = Environment.GetEnvironmentVariable("FIREBASE_CREDENTIALS_B64");

            FirebaseApp.Create(new AppOptions
            {
                Credential = GoogleCredential.FromJson(Encoding.UTF8.GetString(Convert.FromBase64String(firebaseB64))),
                ProjectId = Environment.GetEnvironmentVariable("FIREBASE_PROJECT_ID")
            });
        }

        var elasticUrl = Environment.GetEnvironmentVariable("ELASTICSEARCH_URL") ?? "http://localhost:9200";

        services.AddSingleton(new ElasticsearchClient(new ElasticsearchClientSettings(new Uri(elasticUrl))
            .DefaultIndex("kicksneak-products")
        ));

        services.AddScoped<IElasticSearchService, ElasticSearchService>();

        services.AddSingleton<IObservabilityFactory, GrafanaObservabilityFactory>();

        return services;
    }
}
