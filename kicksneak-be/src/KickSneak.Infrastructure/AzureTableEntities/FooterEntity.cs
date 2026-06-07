using Azure;
using Azure.Data.Tables;

namespace KickSneak.Infrastructure.AzureTableEntities;

public class FooterEntity : ITableEntity
{
    public string PartitionKey { get; set; } = "footer";
    public string RowKey { get; set; } = "main";
    public string ColumnsJson { get; set; } = string.Empty;
    public string SocialJson { get; set; } = string.Empty;
    public string LegalJson { get; set; } = string.Empty;
    public string Copyright { get; set; } = string.Empty;
    public DateTimeOffset? Timestamp { get; set; }
    public ETag ETag { get; set; }
}
