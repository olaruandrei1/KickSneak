using KickSneak.Application.Contracts.Application;
using KickSneak.Application.Contracts.Persistence;
using KickSneak.Domain.DTOs.Checkout;
using KickSneak.Domain.Entities.Commerce;
using KickSneak.Domain.Enums;
using KickSneak.Infrastructure.Contracts;
using Microsoft.Extensions.Configuration;
using Stripe;

namespace KickSneak.Application.Implementations;

public sealed class CheckoutService(
    IUnitOfWork uow,
    Lazy<IStripeService> stripe,
    IConfiguration config
) : ICheckoutService
{
    private const double VatRate = 0.19;
    private const double ShippingFee = 15.0;
    private const double FreeShipAbove = 300.0;

    public async Task<PaymentIntentResponseDto?> CreatePaymentIntentAsync(string firebaseUid, CreatePaymentIntentDto dto, CancellationToken ct = default)
    {
        var user = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid, ct);
        if (user is null) return null;

        var (itemPrice, itemName) = await ResolveItemAsync(dto.StockItemId, dto.UsedItemId, ct);
        if (itemPrice <= 0) return null;

        var total = CalculateTotal(itemPrice);
        var amountCents = (long)(total * 100);

        var clientSecret = await stripe.Value.CreatePaymentIntentAsync(
            amountCents, "usd", $"KickSneak — {itemName}");

        return new PaymentIntentResponseDto(
            ClientSecret: clientSecret,
            PaymentIntentId: string.Empty,
            Amount: amountCents,
            Currency: "usd"
        );
    }

    public async Task<CheckoutSessionResponseDto?> CreateCheckoutSessionAsync(string firebaseUid, CreateCheckoutSessionDto dto, CancellationToken ct = default)
    {
        var user = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid, ct);
        if (user is null) return null;

        var cartItems = await uow.Cart.GetAsync(
            c => c.UserId == user.Id && dto.CartItemIds.Contains(c.Id), ct,
            c => c.StockItem,
            c => c.StockItem.Product,
            c => c.UsedItem,
            c => c.UsedItem.Product);

        if (cartItems.Count == 0) return null;

        var subtotal = cartItems.Sum(c =>
            c.StockItem?.Price ?? c.UsedItem?.Price ?? 0);

        var total = CalculateTotal(subtotal);

        var amountCents = (long)(total * 100);

        var productName = cartItems.Count == 1
            ? cartItems[0].StockItem?.Product?.Title ?? "KickSneak Order"
            : $"{cartItems.Count} items";

        var sessionUrl = await stripe.Value.CreateCheckoutSessionAsync(dto.SuccessUrl, dto.CancelUrl, amountCents, productName);

        await uow.ExecuteInTransactionAsync(async () =>
        {
            foreach (var item in cartItems)
            {
                var order = new Order
                {
                    BuyerId = user.Id,
                    StockItemId = item.StockItemId,
                    UsedItemId = item.UsedItemId,
                    BuyerAddressId = dto.AddressId,
                    Status = OrderStatus.Pending,
                    TotalPrice = CalculateTotal(item.StockItem?.Price ?? item.UsedItem?.Price ?? 0),
                    CreatedBy = firebaseUid
                };

                await uow.Orders.AddAsync(order, ct);

                if (item.StockItem is not null)
                {
                    item.StockItem.StatusItem = ItemStatus.Pending;
                    uow.StockItems.Update(item.StockItem);
                }

                item.IsDeleted = true;
                uow.Cart.Update(item);
            }
        }, ct);

        return new CheckoutSessionResponseDto(
            SessionId: string.Empty,
            Url: sessionUrl
        );
    }

    public async Task HandleWebhookAsync(string payload, string stripeSignature, CancellationToken ct = default)
    {
        var webhookSecret = config["StripeSettings:WebhookSecret"];

        Event stripeEvent;
        try
        {
            stripeEvent = EventUtility.ConstructEvent(payload, stripeSignature, webhookSecret);
        }
        catch (StripeException ex)
        {
            throw new Exception($"Webhook signature invalid: {ex.Message}");
        }

        if (stripeEvent.Type == EventTypes.CheckoutSessionCompleted)
        {
            var session = stripeEvent.Data.Object as Stripe.Checkout.Session;
            if (session is null) return;

            var orders = await uow.Orders.GetAsync(
                o => o.Status == OrderStatus.Pending, ct,
                o => o.StockItem);

            foreach (var order in orders)
            {
                order.Status = OrderStatus.Confirmed;
                if (order.StockItem is not null)
                    order.StockItem.StatusItem = ItemStatus.Sold;
                uow.Orders.Update(order);
            }

            await uow.SaveChangesAsync(ct);
        }
    }

    private async Task<(double Price, string Name)> ResolveItemAsync(Guid? stockItemId, Guid? usedItemId, CancellationToken ct)
    {
        if (stockItemId.HasValue)
        {
            var item = await uow.StockItems.GetFirstOrDefaultAsync(s => s.Id == stockItemId.Value, ct);
            return item is null ? (0, string.Empty) : (item.Price, item.Product?.Title ?? string.Empty);
        }

        if (usedItemId.HasValue)
        {
            var item = await uow.UsedItems.GetFirstOrDefaultAsync(u => u.Id == usedItemId.Value, ct);
            return item is null ? (0, string.Empty) : (item.Price, item.Product?.Title ?? string.Empty);
        }

        return (0, string.Empty);
    }

    private static double CalculateTotal(double subtotal)
    {
        var shipping = subtotal >= FreeShipAbove ? 0 : ShippingFee;
        var vat = Math.Round(subtotal * VatRate, 2);

        return subtotal + shipping + vat;
    }
}
