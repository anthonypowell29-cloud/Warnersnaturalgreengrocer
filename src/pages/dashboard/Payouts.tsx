import { useEffect, useState } from "react";
import { adminApi } from "@/services/adminApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";
import jamaicaPattern from "@/assets/jamaica-produce-pattern.jpg";

interface Payout {
  farmerId: string;
  farmerName: string;
  farmerEmail: string;
  totalRevenue: number;
  orderCount: number;
  totalPayout: number;
  platformFee: number;
}

const Payouts = () => {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    try {
      const data = await adminApi.getPayouts();
      setPayouts(data.payouts || []);
    } catch (error: any) {
      console.error("Error fetching payouts:", error);
      toast.error(error.message || "Failed to load payouts");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-JM', {
      style: 'currency',
      currency: 'JMD',
    }).format(amount);
  };

  const handleProcessPayout = async (farmerId: string) => {
    // TODO: Integrate with payment gateway to process payout
    toast.info("Payout processing feature coming soon");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalPayouts = payouts.reduce((sum, p) => sum + p.totalPayout, 0);
  const totalRevenue = payouts.reduce((sum, p) => sum + p.totalRevenue, 0);
  const totalPlatformFee = payouts.reduce((sum, p) => sum + p.platformFee, 0);

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Jamaican Produce Pattern Overlay */}
      <div 
        className="fixed inset-0 opacity-5 pointer-events-none z-0"
        style={{
          backgroundImage: `url(${jamaicaPattern})`,
          backgroundRepeat: "repeat",
          backgroundSize: "200px",
        }}
      />

      <div className="relative z-10">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Payout Management</h1>
          <p className="text-muted-foreground">Manage farmer payouts and revenue distribution</p>
        </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <Card className="glass border-white/20 hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
            <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {formatCurrency(totalRevenue)}
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-white/20 hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Payouts
            </CardTitle>
            <div className="w-10 h-10 rounded-lg gradient-gold flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {formatCurrency(totalPayouts)}
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-white/20 hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Platform Fee (10%)
            </CardTitle>
            <div className="w-10 h-10 rounded-lg gradient-tropical flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {formatCurrency(totalPlatformFee)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass border-white/20 mt-6">
        <CardHeader>
          <CardTitle>Farmer Payouts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {payouts.map((payout) => (
              <div
                key={payout.farmerId}
                className="p-4 rounded-lg border border-border hover:bg-muted/5 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-foreground">{payout.farmerName}</h3>
                      <Badge variant="outline">{payout.orderCount} orders</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Email: {payout.farmerEmail}</p>
                      <p>Total Revenue: {formatCurrency(payout.totalRevenue)}</p>
                      <p>Platform Fee (10%): {formatCurrency(payout.platformFee)}</p>
                      <p className="font-semibold text-foreground">
                        Payout Amount: {formatCurrency(payout.totalPayout)}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="gradient-primary text-white"
                    onClick={() => handleProcessPayout(payout.farmerId)}
                  >
                    Process Payout
                  </Button>
                </div>
              </div>
            ))}
            {payouts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No payouts available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default Payouts;

