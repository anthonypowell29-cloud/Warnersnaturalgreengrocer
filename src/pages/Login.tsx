import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Leaf } from "lucide-react";
import jamaicaBg from "@/assets/jamaica-st-mary-bg.jpg";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user has admin role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .single();

      if (roleData?.role !== "admin") {
        await supabase.auth.signOut();
        toast.error("Access denied. Admin privileges required.");
        return;
      }

      toast.success("Welcome back, Admin!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Jamaican Background with St. Mary Parish Theme */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${jamaicaBg})`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-accent/20" />
      <div className="absolute inset-0 backdrop-blur-[2px]" />
      
      <div className="w-full max-w-md animate-scale-in relative z-10 px-4">
        <Card className="glass p-8 border-white/30 shadow-2xl">
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center shadow-lg">
              <Leaf className="w-10 h-10 text-white" />
            </div>
          </div>
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Jamaica Fresh Market
            </h1>
            <p className="text-muted-foreground font-medium">
              St. Mary Parish Admin Panel
            </p>
            <p className="text-sm text-muted-foreground/80 mt-1">
              Managing Jamaica's freshest produce
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/50 border-white/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white/50 border-white/20"
              />
            </div>

            <Button
              type="submit"
              className="w-full gradient-primary text-white hover:opacity-90 transition-opacity"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Login;
