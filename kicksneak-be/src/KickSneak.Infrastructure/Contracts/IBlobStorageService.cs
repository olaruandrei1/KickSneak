namespace KickSneak.Infrastructure.Contracts;

public interface IBlobStorageService
{
    Task<string> UploadAsync(string containerName, string fileName, Stream content, string contentType, CancellationToken ct = default);
    Task DeleteAsync(string containerName, string fileName, CancellationToken ct = default);
    string GetUrl(string containerName, string fileName);
}
