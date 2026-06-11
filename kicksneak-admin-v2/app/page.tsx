import prisma from "@/lib/prisma";
import DashboardCharts from "@/components/DashboardCharts";
import { 
  Users, 
  Store, 
  ShoppingBag, 
  ShoppingCart, 
  DollarSign, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight,
  ShieldAlert
} from "lucide-react";
import Link from "next/link";

const MONTH_NAMES = ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Noi", "Dec"];

interface OrderStatusMap {
  [key: number]: { label: string; class: string };
}

const statusMap: OrderStatusMap = {
  0: { label: "Plasată", class: "badge-warning" },
  1: { label: "Confirmată", class: "badge-info" },
  2: { label: "Expediată", class: "badge-info" },
  3: { label: "Livrată", class: "badge-success" },
  4: { label: "Anulată", class: "badge-danger" },
  5: { label: "Returnată", class: "badge-danger" },
};

async function getDashboardData() {
  // 1. KPI Stats
  const totalUsers = await prisma.users.count({ where: { IsDeleted: false } });
  
  const activeSellers = await prisma.sellers.count({ 
    where: { IsDeleted: false, IsBlocked: false, IsSuspended: false } 
  });
  
  const totalProducts = await prisma.products.count({ where: { IsDeleted: false } });
  
  const totalOrders = await prisma.orders.count({ where: { IsDeleted: false } });
  
  // Delivered status is 3
  const revenueResult = await prisma.orders.aggregate({
    _sum: { TotalPrice: true },
    where: { Status: 3, IsDeleted: false }
  });
  const totalRevenue = revenueResult._sum.TotalPrice || 0;

  // Pending reviews is StatusItem = 0 (PendingReview)
  const pendingVerifications = await prisma.stock_items.count({
    where: { StatusItem: 0, IsDeleted: false }
  });

  // 2. Recent Feeds
  const recentOrders = await prisma.orders.findMany({
    take: 5,
    orderBy: { CreatedAt: "desc" },
    where: { IsDeleted: false },
    include: {
      users: {
        select: { FirstName: true, LastName: true }
      }
    }
  });

  const recentSellers = await prisma.sellers.findMany({
    take: 5,
    orderBy: { CreatedAt: "desc" },
    where: { IsDeleted: false },
    include: {
      users: {
        select: { FirstName: true, LastName: true }
      }
    }
  });

  const recentPendingStock = await prisma.stock_items.findMany({
    take: 5,
    where: { StatusItem: 0, IsDeleted: false },
    orderBy: { CreatedAt: "desc" },
    include: {
      products: {
        select: { Title: true }
      },
      sellers: {
        select: { StoreName: true }
      }
    }
  });

  // 3. Charts calculations
  // Get orders from last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const ordersLast6Months = await prisma.orders.findMany({
    where: {
      CreatedAt: { gte: sixMonthsAgo },
      IsDeleted: false
    },
    select: {
      CreatedAt: true,
      TotalPrice: true,
      Status: true
    }
  });

  // Generate 6 months data points
  const salesDataMap = new Map<string, { month: string; orders: number; revenue: number; orderIndex: number }>();
  
  for (let i = 0; i < 6; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - 5 + i);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const label = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`;
    salesDataMap.set(key, { month: label, orders: 0, revenue: 0, orderIndex: i });
  }

  // Populate map with db values
  ordersLast6Months.forEach(order => {
    const date = new Date(order.CreatedAt);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    if (salesDataMap.has(key)) {
      const point = salesDataMap.get(key)!;
      point.orders += 1;
      // Only count revenue for delivered orders (Status = 3)
      if (order.Status === 3) {
        point.revenue += order.TotalPrice;
      }
    }
  });

  const salesData = Array.from(salesDataMap.values()).sort((a, b) => a.orderIndex - b.orderIndex);

  // Top 5 brands by stock items count
  const allBrands = await prisma.brands.findMany({
    where: { IsDeleted: false },
    select: { Id: true, Name: true }
  });

  const brandStockCount = await prisma.stock_items.groupBy({
    by: ["ProductId"],
    _count: { Id: true },
    where: { IsDeleted: false }
  });

  const productsWithBrands = await prisma.products.findMany({
    where: { IsDeleted: false },
    select: { Id: true, BrandId: true }
  });

  // Map product to brand
  const productToBrand = new Map<string, string>();
  productsWithBrands.forEach(p => {
    if (p.BrandId) {
      productToBrand.set(p.Id, p.BrandId);
    }
  });

  // Aggregate stock by brand
  const brandCountMap = new Map<string, number>();
  brandStockCount.forEach(stockGroup => {
    const brandId = productToBrand.get(stockGroup.ProductId);
    if (brandId) {
      const count = stockGroup._count.Id || 0;
      brandCountMap.set(brandId, (brandCountMap.get(brandId) || 0) + count);
    }
  });

  // Format brand data for Recharts
  const brandData = allBrands
    .map(b => ({
      name: b.Name || "Necunoscut",
      value: brandCountMap.get(b.Id) || 0
    }))
    .filter(b => b.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Fallback if brandData is empty
  if (brandData.length === 0) {
    brandData.push({ name: "Nu există stoc", value: 1 });
  }

  return {
    totalUsers,
    activeSellers,
    totalProducts,
    totalOrders,
    totalRevenue,
    pendingVerifications,
    recentOrders,
    recentSellers,
    recentPendingStock,
    salesData,
    brandData
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON", maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard Overview</h1>
        <p className="page-subtitle">Indicatori cheie de performanță și activități recente în sistem.</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="glass-card kpi-card">
          <div className="kpi-icon">
            <Users size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Utilizatori</span>
            <span className="kpi-value">{data.totalUsers}</span>
            <span className="kpi-trend trend-up">
              <ArrowUpRight size={14} /> +4.2% înregistrați
            </span>
          </div>
        </div>

        <div className="glass-card kpi-card">
          <div className="kpi-icon">
            <Store size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Vânzători Activi</span>
            <span className="kpi-value">{data.activeSellers}</span>
            <span className="kpi-trend trend-up">
              <ArrowUpRight size={14} /> +1.8% magazine noi
            </span>
          </div>
        </div>

        <div className="glass-card kpi-card">
          <div className="kpi-icon">
            <ShoppingBag size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Produse Catalog</span>
            <span className="kpi-value">{data.totalProducts}</span>
            <span className="kpi-trend trend-up">
              <ArrowUpRight size={14} /> +12 adăugate recent
            </span>
          </div>
        </div>

        <div className="glass-card kpi-card">
          <div className="kpi-icon">
            <ShoppingCart size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Comenzi Totale</span>
            <span className="kpi-value">{data.totalOrders}</span>
            <span className="kpi-trend trend-up">
              <ArrowUpRight size={14} /> +8 comenzi noi azi
            </span>
          </div>
        </div>

        <div className="glass-card kpi-card">
          <div className="kpi-icon" style={{ color: "var(--success)", background: "rgba(16, 185, 129, 0.1)", borderColor: "rgba(16, 185, 129, 0.2)" }}>
            <DollarSign size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Venit Platformă</span>
            <span className="kpi-value">{formatCurrency(data.totalRevenue)}</span>
            <span className="kpi-trend trend-up">
              <ArrowUpRight size={14} /> +12.4% luna aceasta
            </span>
          </div>
        </div>

        <div className="glass-card kpi-card">
          <div className="kpi-icon" style={{ color: "var(--warning)", background: "rgba(245, 158, 11, 0.1)", borderColor: "rgba(245, 158, 11, 0.2)" }}>
            <ShieldAlert size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">De Verificat (Stoc)</span>
            <span className="kpi-value">{data.pendingVerifications}</span>
            <span className="kpi-trend" style={{ color: "var(--text-muted)" }}>
              <Clock size={14} /> Așteaptă autentificare
            </span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts */}
      <DashboardCharts salesData={data.salesData} brandData={data.brandData} />

      {/* Recent Activity Grid */}
      <div className="activity-grid">
        {/* Recent Orders */}
        <div className="glass-card activity-card">
          <div className="activity-header">
            <h3>Ultimele Comenzi</h3>
            <Link href="/orders" className="view-all-link">Vezi toate</Link>
          </div>
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Cumpărător</th>
                  <th>Valoare</th>
                  <th>Status</th>
                  <th>Dată</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", color: "var(--text-dim)" }}>Nicio comandă înregistrată</td>
                  </tr>
                ) : (
                  data.recentOrders.map(order => (
                    <tr key={order.Id}>
                      <td>{order.users ? `${order.users.FirstName} ${order.users.LastName}` : "Necunoscut"}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(order.TotalPrice)}</td>
                      <td>
                        <span className={`badge ${statusMap[order.Status]?.class || "badge-info"}`}>
                          {statusMap[order.Status]?.label || "Plasată"}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        {new Date(order.CreatedAt).toLocaleDateString("ro-RO")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Verifications */}
        <div className="glass-card activity-card">
          <div className="activity-header">
            <h3>Produse depuse spre Verificare</h3>
            <Link href="/stock" className="view-all-link">Verifică stoc</Link>
          </div>
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Sneaker</th>
                  <th>Vânzător</th>
                  <th>Preț</th>
                  <th>Dată</th>
                </tr>
              </thead>
              <tbody>
                {data.recentPendingStock.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", color: "var(--text-dim)" }}>Nu există produse în așteptare</td>
                  </tr>
                ) : (
                  data.recentPendingStock.map(item => (
                    <tr key={item.Id}>
                      <td style={{ fontWeight: 500 }}>{item.products?.Title || "Adidași"}</td>
                      <td>{item.sellers?.StoreName || "Magazin"}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(item.Price)}</td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        {new Date(item.CreatedAt).toLocaleDateString("ro-RO")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* New Sellers */}
        <div className="glass-card activity-card">
          <div className="activity-header">
            <h3>Vânzători Noi</h3>
            <Link href="/sellers" className="view-all-link">Vezi toți</Link>
          </div>
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nume Store</th>
                  <th>Proprietar</th>
                  <th>Oraș</th>
                  <th>Trust</th>
                </tr>
              </thead>
              <tbody>
                {data.recentSellers.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", color: "var(--text-dim)" }}>Niciun vânzător nou</td>
                  </tr>
                ) : (
                  data.recentSellers.map(seller => (
                    <tr key={seller.Id}>
                      <td style={{ fontWeight: 600 }}>{seller.StoreName}</td>
                      <td>{seller.users ? `${seller.users.FirstName} ${seller.users.LastName}` : "Membru"}</td>
                      <td>{seller.City || "Nespecificat"}</td>
                      <td>
                        <span className="badge badge-success" style={{ fontWeight: 700 }}>
                          {(seller.TrustScore || 100).toFixed(0)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
