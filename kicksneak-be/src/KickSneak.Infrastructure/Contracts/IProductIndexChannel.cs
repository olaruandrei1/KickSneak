using KickSneak.Domain.Events;

namespace KickSneak.Infrastructure.Contracts;

public interface IProductIndexChannel
{
    ValueTask PublishAsync(ProductIndexEvent evt, CancellationToken ct = default);
}
