using KickSneak.Domain.Events;
using KickSneak.Infrastructure.Contracts;
using System.Threading.Channels;

namespace KickSneak.BackgroundServices.Channels;

public sealed class ProductIndexChannel : IProductIndexChannel
{
    private readonly Channel<ProductIndexEvent> _channel =
    Channel.CreateUnbounded<ProductIndexEvent>(new UnboundedChannelOptions
    {
        SingleReader = true,
        SingleWriter = false
    });

    internal ChannelReader<ProductIndexEvent> Reader => _channel.Reader;

    public ValueTask PublishAsync(ProductIndexEvent evt, CancellationToken ct = default)
        => _channel.Writer.WriteAsync(evt, ct);
}
