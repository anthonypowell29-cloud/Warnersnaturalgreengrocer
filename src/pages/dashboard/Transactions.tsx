import { useEffect, useState } from "react";
import { adminApi } from "@/services/adminApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DollarSign, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import jamaicaPattern from "@/assets/jamaica-produce-pattern.jpg";

interface Transaction {
  _id: string;
  amount: number;
  currency: string;
  paymentGateway: string;
  paymentReference: string;
  status: string;
  orderId: {
    _id: string;
    orderNumber: string;
    totalAmount: number;
    buyerId: {
      displayName: string;
      email: string;
    };
    sellerId: {
      displayName: string;
      email: string;
    };
  };
  createdAt: string;
}

const Transactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ totalAmount: 0, successCount: 0, failedCount: 0 });
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchTransactions();
  }, [statusFilter]);

  const fetchTransactions = async () => {
    try {
      const data = await adminApi.getTransactions({
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setTransactions(data.transactions || []);
      setTotals(data.totals || { totalAmount: 0, successCount: 0, failedCount: 0 });
    } catch (error: any) {
      console.error("Error fetching transactions:", error);
      toast.error(error.message || "Failed to load transactions");
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500">Success</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold text-foreground mb-2">Transaction Monitoring</h1>
          <p className="text-muted-foreground">Monitor all payment transactions</p>
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
              {formatCurrency(totals.totalAmount)}
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-white/20 hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Successful
            </CardTitle>
            <div className="w-10 h-10 rounded-lg gradient-gold flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{totals.successCount}</div>
          </CardContent>
        </Card>
        <Card className="glass border-white/20 hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Failed
            </CardTitle>
            <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{totals.failedCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass border-white/20 mt-6">
        <CardHeader>
          <div className="flex gap-2 mb-4">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
            >
              All
            </Button>
            <Button
              variant={statusFilter === "success" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("success")}
            >
              Success
            </Button>
            <Button
              variant={statusFilter === "failed" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("failed")}
            >
              Failed
            </Button>
            <Button
              variant={statusFilter === "pending" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("pending")}
            >
              Pending
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div
                key={transaction._id}
                className="p-4 rounded-lg border border-border hover:bg-muted/5 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-foreground">
                        Order #{transaction.orderId.orderNumber}
                      </h3>
                      {getStatusBadge(transaction.status)}
                      <Badge variant="outline">{transaction.paymentGateway}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Amount: {formatCurrency(transaction.amount)}</p>
                      <p>
                        Buyer: {transaction.orderId.buyerId.displayName} (
                        {transaction.orderId.buyerId.email})
                      </p>
                      <p>
                        Seller: {transaction.orderId.sellerId.displayName} (
                        {transaction.orderId.sellerId.email})
                      </p>
                      <p>Reference: {transaction.paymentReference}</p>
                      <p>Date: {new Date(transaction.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No transactions found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default Transactions;

