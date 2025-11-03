import { useEffect, useState } from "react";
import { adminApi } from "@/services/adminApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Ban, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import jamaicaPattern from "@/assets/jamaica-produce-pattern.jpg";

interface User {
  _id: string;
  displayName: string;
  email: string;
  phoneNumber?: string;
  userType: 'buyer' | 'farmer' | 'admin';
  isVerified: boolean;
  isBanned?: boolean;
  createdAt: string;
}

const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState<string>("all");

  useEffect(() => {
    fetchUsers();
  }, [userTypeFilter]);

  useEffect(() => {
    const filtered = users.filter(
      (user) =>
        user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    try {
      const data = await adminApi.getUsers({
        userType: userTypeFilter !== 'all' ? userTypeFilter : undefined,
        status: undefined, // Will filter client-side for banned
      });
      setUsers(data.users || []);
      setFilteredUsers(data.users || []);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error(error.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId: string, isBanned: boolean) => {
    try {
      await adminApi.updateUser(userId, { isBanned });
      toast.success(`User ${isBanned ? "banned" : "unbanned"} successfully`);
      fetchUsers();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(error.message || "Failed to update user status");
    }
  };

  const verifyUser = async (userId: string) => {
    try {
      await adminApi.updateUser(userId, { isVerified: true });
      toast.success("User verified successfully");
      fetchUsers();
    } catch (error: any) {
      console.error("Error verifying user:", error);
      toast.error(error.message || "Failed to verify user");
    }
  };

  const getStatusBadge = (user: User) => {
    if (user.isBanned) {
      return <Badge variant="destructive">Banned</Badge>;
    }
    return <Badge className="bg-primary">Active</Badge>;
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
            <div className="mb-4 flex gap-2">
              <Button
                variant={userTypeFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setUserTypeFilter("all")}
              >
                All
              </Button>
              <Button
                variant={userTypeFilter === "buyer" ? "default" : "outline"}
                size="sm"
                onClick={() => setUserTypeFilter("buyer")}
              >
                Buyers
              </Button>
              <Button
                variant={userTypeFilter === "farmer" ? "default" : "outline"}
                size="sm"
                onClick={() => setUserTypeFilter("farmer")}
              >
                Farmers
              </Button>
            </div>
            {filteredUsers.map((user) => (
              <div
                key={user._id}
                className="p-4 rounded-lg border border-border hover:bg-muted/5 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-foreground">{user.displayName}</h3>
                      {getStatusBadge(user)}
                      {user.isVerified && (
                        <Badge variant="outline" className="bg-accent/10">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                      <Badge variant="outline">{user.userType}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Email: {user.email}</p>
                      {user.phoneNumber && <p>Phone: {user.phoneNumber}</p>}
                      <p>Joined: {new Date(user.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!user.isVerified && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => verifyUser(user._id)}
                        className="border-accent text-accent hover:bg-accent/10"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Verify
                      </Button>
                    )}
                    {!user.isBanned ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateUserStatus(user._id, true)}
                      >
                        <Ban className="w-4 h-4 mr-1" />
                        Ban
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="gradient-primary text-white"
                        onClick={() => updateUserStatus(user._id, false)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Unban
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
    </div>
  );
};

export default Users;
