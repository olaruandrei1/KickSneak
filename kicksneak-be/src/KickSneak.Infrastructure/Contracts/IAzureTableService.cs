using Azure.Data.Tables;

namespace KickSneak.Infrastructure.Contracts;

public interface IAzureTableService
{
    Task UpsertAsync<T>(string tableName, T entity, CancellationToken ct = default) where T : class, ITableEntity, new();
    Task<T?> GetAsync<T>(string tableName, string partitionKey, string rowKey, CancellationToken ct = default) where T : class, ITableEntity, new();
    Task DeleteAsync(string tableName, string partitionKey, string rowKey, CancellationToken ct = default);
    IAsyncEnumerable<T> QueryAsync<T>(string tableName, string filter, CancellationToken ct = default) where T : class, ITableEntity, new();
}
