"use client";

import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

interface ChartDataPoint {
  month: string;
  orders: number;
  revenue: number;
}

interface BrandDataPoint {
  name: string;
  value: number;
}

interface DashboardChartsProps {
  salesData: ChartDataPoint[];
  brandData: BrandDataPoint[];
}

const COLORS = ["#ff6000", "#00f0ff", "#7000ff", "#10b981", "#f59e0b"];

export default function DashboardCharts({ salesData, brandData }: DashboardChartsProps) {
  const [isMounted, setIsMounted] = useState(false);

  // Recharts has issues with SSR, wait until client-side mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="charts-loading">
        <span>Se încarcă graficele...</span>
        <style jsx>{`
          .charts-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 350px;
            color: var(--text-muted);
            font-size: 0.9rem;
          }
        `}</style>
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON", maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="charts-grid">
      {/* Sales & Revenue Chart */}
      <div className="glass-card chart-card">
        <h3 className="chart-title">Evoluție Vânzări și Venituri</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#00f0ff" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" stroke="var(--text-dim)" fontSize={11} />
              <YAxis yAxisId="left" stroke="var(--text-dim)" fontSize={11} />
              <YAxis yAxisId="right" orientation="right" stroke="var(--text-dim)" fontSize={11} tickFormatter={(v) => `${v} RON`} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "rgba(8, 12, 20, 0.95)", 
                  borderColor: "rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#fff"
                }} 
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Area yAxisId="right" type="monotone" dataKey="revenue" name="Venit (RON)" stroke="#00f0ff" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
              <Bar yAxisId="left" dataKey="orders" name="Comenzi (buc)" fill="#ff6000" radius={[4, 4, 0, 0]} maxBarSize={30}>
                {salesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="#ff6000" />
                ))}
              </Bar>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Brands Stock Distribution */}
      <div className="glass-card chart-card">
        <h3 className="chart-title">Top 5 Branduri (Machete în Stoc)</h3>
        <div className="chart-container pie-container">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={brandData}
                cx="50%"
                cy="45%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                labelLine={false}
              >
                {brandData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "rgba(8, 12, 20, 0.95)", 
                  borderColor: "rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#fff"
                }} 
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <style jsx>{`
        .charts-grid {
          display: grid;
          grid-template-columns: 2fr 1.2fr;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .chart-card {
          display: flex;
          flex-direction: column;
        }

        .chart-title {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
          color: #fff;
        }

        .chart-container {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @media (max-width: 1024px) {
          .charts-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
