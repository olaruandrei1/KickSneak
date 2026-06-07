namespace KickSneak.Domain.DTOs.Seller;

public record SellerReturnDto(
    Guid Id, Guid OrderId, string BuyerName, string ItemName,
    string Size, double Price, string Reason, string? Description,
    string Status, string Date, bool IsUsedItem
);
