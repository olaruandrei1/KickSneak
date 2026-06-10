namespace KickSneak.Domain.Events;

public enum ProductIndexAction { Upsert, Delete }

public sealed record ProductIndexEvent(
    ProductIndexAction Action,
    Guid? ProductId = null
);