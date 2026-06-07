using Azure;
using Azure.Data.Tables;

namespace KickSneak.Infrastructure.AzureTableEntities;

public class NavbarCategoryEntity : ITableEntity
{
    public string PartitionKey { get; set; } = "navbar";
    public string RowKey { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public bool Highlight { get; set; }
    public string ColumnsJson { get; set; } = string.Empty;
    public int Order { get; set; }
    public DateTimeOffset? Timestamp { get; set; }
    public ETag ETag { get; set; }
}
