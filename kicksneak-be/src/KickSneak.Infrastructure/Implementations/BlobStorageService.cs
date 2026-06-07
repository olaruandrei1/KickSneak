using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using KickSneak.Infrastructure.Contracts;

namespace KickSneak.Infrastructure.Implementations;

public class BlobStorageService(BlobServiceClient blobServiceClient) : IBlobStorageService
{
    public async Task<string> UploadAsync(string containerName, string fileName, Stream content, string contentType, CancellationToken ct = default)
    {
        BlobContainerClient container = blobServiceClient.GetBlobContainerClient(containerName);

        await container.CreateIfNotExistsAsync(PublicAccessType.Blob, cancellationToken: ct);

        BlobClient blob = container.GetBlobClient(fileName);
        
        await blob.UploadAsync(content, new BlobHttpHeaders { ContentType = contentType }, cancellationToken: ct);
        
        return blob.Uri.ToString();
    }

    public async Task DeleteAsync(string containerName, string fileName, CancellationToken ct = default)
    {
        BlobContainerClient container = blobServiceClient.GetBlobContainerClient(containerName);

        BlobClient blob = container.GetBlobClient(fileName);
        
        await blob.DeleteIfExistsAsync(cancellationToken: ct);
    }

    public string GetUrl(string containerName, string fileName)
    {
        BlobContainerClient container = blobServiceClient.GetBlobContainerClient(containerName);
        
        return container.GetBlobClient(fileName).Uri.ToString();
    }
}
