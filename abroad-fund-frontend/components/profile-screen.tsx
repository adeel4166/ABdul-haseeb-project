"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  getMeRequest, 
  changePasswordRequest, 
  getAdminUsersRequest, 
  deleteAdminUserRequest, 
  saveToken 
} from "@/lib/desk-api";
import { useLedger } from "@/lib/ledger-context";

export function ProfileScreen() {
  const { entries } = useLedger();
  const [user, setUser] = useState<{ id: number, username: string, role: string, created_at: string } | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwMessage, setPwMessage] = useState("");
  const [pwError, setPwError] = useState("");
  
  // Admin message state
  const [adminMessage, setAdminMessage] = useState("");
  const [adminError, setAdminError] = useState("");

  useEffect(() => {
    getMeRequest()
      .then((data) => {
        setUser(data);
        if (data.role === "admin") {
          loadAdminUsers();
        }
      })
      .catch((err) => console.error("Failed to load profile", err));
  }, []);

  const loadAdminUsers = async () => {
    try {
      const data = await getAdminUsersRequest();
      setUsers(data);
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : "Failed to load users");
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage("");
    setPwError("");
    try {
      await changePasswordRequest(currentPassword, newPassword);
      setPwMessage("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Error changing password");
    }
  };

  const handleLogout = () => {
    saveToken("");
    window.location.reload();
  };

  const handleDeleteUser = async (id: number, username: string) => {
    if (!window.confirm(`Are you sure you want to delete user '${username}' and all their data? This cannot be undone.`)) {
      return;
    }
    setAdminMessage("");
    setAdminError("");
    try {
      await deleteAdminUserRequest(id);
      setAdminMessage(`User ${username} deleted successfully.`);
      loadAdminUsers();
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : "Error deleting user");
    }
  };

  if (!user) {
    return <div className="p-4">Loading profile...</div>;
  }

  // Calculate stats
  const totalEntries = entries.length;
  const moneyIn = entries.filter(e => e.type === "in").reduce((sum, e) => sum + e.amount, 0);
  const moneyOut = entries.filter(e => e.type === "out").reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-10">
      
      {/* PROFILE SECTION */}
      <div>
        <h2 className="font-heading text-2xl text-ink sm:text-3xl">Profile</h2>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          View your account details and update your password.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Stats Card */}
        <div className="rounded-xl border border-border/50 bg-white/50 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-heading text-xl text-ink">Account Info</h3>
            <span className="rounded-full bg-money-in/10 px-2.5 py-0.5 text-xs font-semibold text-money-in capitalize">
              {user.role}
            </span>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Username:</span>
              <span className="font-medium">{user.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Joined:</span>
              <span className="font-medium">{new Date(user.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Ledger Entries:</span>
              <span className="font-medium">{totalEntries}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Money In:</span>
              <span className="font-medium text-money-in">Rs {moneyIn.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Money Out:</span>
              <span className="font-medium text-money-out">Rs {moneyOut.toLocaleString()}</span>
            </div>
          </div>
          
          <Button onClick={handleLogout} variant="outline" className="mt-6 w-full">
            Log out
          </Button>
        </div>

        {/* Change Password Card */}
        <div className="rounded-xl border border-border/50 bg-white/50 p-6 shadow-sm">
          <h3 className="mb-4 font-heading text-xl text-ink">Change Password</h3>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current">Current Password</Label>
              <Input 
                id="current" 
                type="password" 
                value={currentPassword} 
                onChange={e => setCurrentPassword(e.target.value)} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new">New Password</Label>
              <Input 
                id="new" 
                type="password" 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                required 
              />
            </div>
            <Button type="submit" className="w-full">Update Password</Button>
            
            {pwMessage && <p className="text-sm text-money-in mt-2">{pwMessage}</p>}
            {pwError && <p className="text-sm text-money-out mt-2">{pwError}</p>}
          </form>
        </div>
      </div>

      {/* ADMIN DASHBOARD SECTION */}
      {user.role === "admin" && (
        <div className="mt-8">
          <h2 className="font-heading text-2xl text-ink sm:text-3xl mb-4">Admin Dashboard</h2>
          <div className="rounded-xl border border-border/50 bg-white shadow-sm overflow-hidden">
            <div className="p-4 bg-muted/20 border-b border-border/50 flex justify-between items-center">
              <h3 className="font-medium text-ink">User Management</h3>
            </div>
            
            {adminMessage && <div className="p-3 bg-money-in/10 text-money-in text-sm">{adminMessage}</div>}
            {adminError && <div className="p-3 bg-money-out/10 text-money-out text-sm">{adminError}</div>}
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/10 border-b border-border/50">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-border/10 last:border-0 hover:bg-muted/5 transition-colors">
                      <td className="px-4 py-3 font-medium text-ink">{u.id}</td>
                      <td className="px-4 py-3">{u.username}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${u.role === 'admin' ? 'bg-money-in/10 text-money-in' : 'bg-muted text-muted-foreground'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        {u.id !== user.id ? (
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            className="h-8 text-xs px-3"
                          >
                            Delete
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Current</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
