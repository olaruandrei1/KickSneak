using KickSneak.Domain.DTOs.Orders;

namespace KickSneak.Application.Contracts.Application;

public interface IOrderService
{
    Task<OrdersResponseDto> GetOrdersAsync(string firebaseUid, CancellationToken ct = default);
    Task<OrderDto?> GetOrderByIdAsync(string firebaseUid, Guid orderId, CancellationToken ct = default);
}
