import { useEffect, useState } from "react";
import { adminApi } from "@/services/adminApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, Star, DollarSign, TrendingUp, ShoppingCart } from "lucide-react";
import jamaicaPattern from "@/assets/jamaica-produce-pattern.jpg";
import { useNavigate } from "react-router-dom";

interface Stats {
  totalUsers: number;
  totalProducts: number;
  pendingProducts: number;
  totalReviews: number;
  pendingReviews: number;
  totalTransactions: number;
  totalRevenue: number;
  pendingPayouts: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalProducts: 0,
    pendingProducts: 0,
    totalReviews: 0,
    pendingReviews: 0,
    totalTransactions: 0,
    totalRevenue: 0,
    pendingPayouts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const navigate = useNavigate();

  const fetchStats = async () => {
    try {
      const data = await adminApi.getStats();

      setStats({
        totalUsers: data.users.total,
        totalProducts: data.products.total,
        pendingProducts: data.products.pending,
        totalReviews: data.reviews.total,
        pendingReviews: data.reviews.pending,
        totalTransactions: data.transactions.total,
        totalRevenue: data.transactions.revenue,
        pendingPayouts: 0, // Will be calculated from payouts endpoint
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      gradient: "gradient-primary",
      change: "+12%",
    },
    {
      title: "Total Products",
      value: stats.totalProducts,
      subtitle: `${stats.pendingProducts} pending`,
      icon: Package,
      gradient: "gradient-gold",
      change: "+8%",
    },
    {
      title: "Reviews",
      value: stats.totalReviews,
      subtitle: `${stats.pendingReviews} pending`,
      icon: Star,
      gradient: "gradient-tropical",
      change: "+15%",
    },
    {
      title: "Revenue (JMD)",
      value: `$${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      gradient: "gradient-gold",
      change: "+23%",
    },
    {
      title: "Transactions",
      value: stats.totalTransactions,
      icon: ShoppingCart,
      gradient: "gradient-primary",
      change: "+18%",
    },
    {
      title: "Pending Payouts",
      value: stats.pendingPayouts,
      icon: TrendingUp,
      gradient: "gradient-tropical",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Jamaican Produce Pattern Overlay */}
      <div 
        className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `url(${jamaicaPattern})`,
          backgroundRepeat: "repeat",
          backgroundSize: "200px",
        }}
      />

      <div className="relative z-10">
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard Overview</h1>
        <p className="text-muted-foreground">
          St. Mary Parish - Jamaica Fresh Market Admin
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card
              key={index}
              className="glass border-white/20 hover:shadow-lg transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={`w-10 h-10 rounded-lg ${card.gradient} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{card.value}</div>
                {card.subtitle && (
                  <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
                )}
                {card.change && (
                  <p className="text-xs text-primary mt-2 font-medium">
                    {card.change} from last month
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="glass border-white/20 relative z-10">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button 
              onClick={() => navigate("/dashboard/products")}
              className="p-4 rounded-lg border border-primary/20 hover:bg-primary/5 transition-colors text-left"
            >
              <h3 className="font-semibold text-foreground">Review Products</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {stats.pendingProducts} pending approval
              </p>
            </button>
            <button 
              onClick={() => navigate("/dashboard/reviews")}
              className="p-4 rounded-lg border border-secondary/20 hover:bg-secondary/5 transition-colors text-left"
            >
              <h3 className="font-semibold text-foreground">Moderate Reviews</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {stats.pendingReviews} pending moderation
              </p>
            </button>
            <button 
              onClick={() => navigate("/dashboard/payouts")}
              className="p-4 rounded-lg border border-accent/20 hover:bg-accent/5 transition-colors text-left"
            >
              <h3 className="font-semibold text-foreground">Process Payouts</h3>
              <p className="text-sm text-muted-foreground mt-1">
                View farmer payouts
              </p>
            </button>
            <button 
              onClick={() => navigate("/dashboard/users")}
              className="p-4 rounded-lg border border-primary/20 hover:bg-primary/5 transition-colors text-left"
            >
              <h3 className="font-semibold text-foreground">User Management</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Manage {stats.totalUsers} users
              </p>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
