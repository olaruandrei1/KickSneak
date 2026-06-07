using Azure;
using Azure.Data.Tables;
using KickSneak.Infrastructure.Contracts;

namespace KickSneak.Infrastructure.Implementations;

public class AzureTableService(TableServiceClient tableServiceClient) : IAzureTableService
{
    public async Task UpsertAsync<T>(string tableName, T entity, CancellationToken ct = default) where T : class, ITableEntity, new()
    {
        TableClient client = tableServiceClient.GetTableClient(tableName);

        await client.CreateIfNotExistsAsync(ct);

        await client.UpsertEntityAsync(entity, TableUpdateMode.Merge, ct);
    }

    public async Task<T?> GetAsync<T>(string tableName, string partitionKey, string rowKey, CancellationToken ct = default)
    where T : class, ITableEntity, new()
    {
        try
        {
            var client = tableServiceClient.GetTableClient(tableName);

            await client.CreateIfNotExistsAsync(ct);

            var response = await client.GetEntityAsync<T>(partitionKey, rowKey, cancellationToken: ct);

            return response.Value;
        }
        catch
        {
            return null;
        }
    }

    public async Task DeleteAsync(string tableName, string partitionKey, string rowKey, CancellationToken ct = default)
    {
        TableClient client = tableServiceClient.GetTableClient(tableName);

        await client.DeleteEntityAsync(partitionKey, rowKey, cancellationToken: ct);
    }

    public IAsyncEnumerable<T> QueryAsync<T>(string tableName, string filter, CancellationToken ct = default)
    where T : class, ITableEntity, new()
    {
        try
        {
            var client = tableServiceClient.GetTableClient(tableName);

            client.CreateIfNotExists();

            return client.QueryAsync<T>(filter, cancellationToken: ct);
        }
        catch
        {
            return AsyncEnumerable.Empty<T>();
        }
    }
}
