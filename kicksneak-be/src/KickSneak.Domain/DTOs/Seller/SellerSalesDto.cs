namespace KickSneak.Domain.DTOs.Seller;

public record SalesChartPointDto(string Month, double Revenue, int Sales);

public record RecentSaleDto(
    Guid Id,
    string Buyer,
    string Item,
    double Price,
    string Date,
    string Status
);

public record SellerSalesDto(
    double TotalRevenue,
    int TotalSales,
    double AvgOrderValue,
    List<SalesChartPointDto> Chart,
    List<RecentSaleDto> RecentSales
);
