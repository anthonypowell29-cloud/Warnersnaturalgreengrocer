import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Ban, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  user_type: string;
  status: string;
  is_verified: boolean;
  created_at: string;
}

const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const filtered = users.filter(
      (user) =>
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
      setFilteredUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("users")
        .update({ status })
        .eq("id", userId);

      if (error) throw error;
      toast.success(`User ${status === "banned" ? "banned" : "activated"} successfully`);
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Failed to update user status");
    }
  };

  const verifyUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("users")
        .update({ is_verified: true })
        .eq("id", userId);

      if (error) throw error;
      toast.success("User verified successfully");
      fetchUsers();
    } catch (error) {
      console.error("Error verifying user:", error);
      toast.error("Failed to verify user");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-primary">Active</Badge>;
      case "banned":
        return <Badge variant="destructive">Banned</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">User Management</h1>
        <p className="text-muted-foreground">Manage marketplace users</p>
      </div>

      <Card className="glass border-white/20">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/50 border-white/20"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="p-4 rounded-lg border border-border hover:bg-muted/5 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-foreground">{user.full_name}</h3>
                      {getStatusBadge(user.status)}
                      {user.is_verified && (
                        <Badge variant="outline" className="bg-accent/10">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                      <Badge variant="outline">{user.user_type}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Email: {user.email}</p>
                      {user.phone && <p>Phone: {user.phone}</p>}
                      <p>Joined: {new Date(user.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!user.is_verified && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => verifyUser(user.id)}
                        className="border-accent text-accent hover:bg-accent/10"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Verify
                      </Button>
                    )}
                    {user.status === "active" ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateUserStatus(user.id, "banned")}
                      >
                        <Ban className="w-4 h-4 mr-1" />
                        Ban
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="gradient-primary text-white"
                        onClick={() => updateUserStatus(user.id, "active")}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Activate
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No users found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Users;
