import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ModulePage } from "@/components/admin/ModulePage";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Column } from "@/components/admin/DataTable";
import { DetailDrawer } from "@/components/admin/DetailDrawer";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { AdjustCoinsDialog } from "@/components/admin/AdjustCoinsDialog";
import { ImagePickerField } from "@/components/admin/ImagePickerField";
import { FilterField } from "@/components/admin/AdvancedFilterDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Edit, Trash2, Send, Coins, Copy, Calendar, Phone, Mail, User as UserIcon } from "lucide-react";
import { useAdminResource } from "@/hooks/useAdminResource";
import { useCreateResource, useUpdateResource, useDeleteResource } from "@/hooks/useAdminMutations";
import { adjustAdminUserCoins, fetchAdminResource, fetchAdminStats } from "@/lib/api";

interface UserData {
  id: string; phone: string; email: string; full_name: string; profile_photo: string;
  date_of_birth: string; gender: string; is_active: boolean; is_verified: boolean;
  referral_code: string; referred_by: string | null; coin_balance: number;
  created_at: string; updated_at: string; roles: string[];
}

const allRoles = ["customer", "rider", "parcel_delivery", "vendor", "restaurant", "room_owner"];

const emptyUser: Omit<UserData, "id" | "created_at" | "updated_at"> = {
  phone: "", email: "", full_name: "", profile_photo: "", date_of_birth: "",
  gender: "male", is_active: true, is_verified: false, referral_code: "",
  referred_by: null, coin_balance: 0, roles: ["customer"],
};

const advancedFilterFields: FilterField[] = [
  { key: "gender", label: "Gender", type: "select", options: [{ label: "Male", value: "male" }, { label: "Female", value: "female" }, { label: "Other", value: "other" }] },
  { key: "role", label: "Role", type: "select", options: allRoles.map(r => ({ label: r.replace("_", " "), value: r })) },
  { key: "coin_balance", label: "Coin Balance", type: "number" },
  { key: "created_at", label: "Joined Date", type: "date_range" },
  { key: "is_verified", label: "Verified Only", type: "boolean" },
  { key: "is_active", label: "Active Only", type: "boolean" },
  { key: "has_referral", label: "Has Referral", type: "boolean" },
];

export default function UserList() {
  const [users, setUsers] = useState<UserData[]>([]);
  const queryClient = useQueryClient();
  const { data } = useAdminResource<any>("users", { page_size: 200 });
  const createMutation = useCreateResource("users");
  const updateMutation = useUpdateResource("users");
  const deleteMutation = useDeleteResource("users");
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<UserData> & typeof emptyUser>(emptyUser);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserData | null>(null);
  const [coinDialogOpen, setCoinDialogOpen] = useState(false);
  const [coinTarget, setCoinTarget] = useState<UserData | null>(null);
  const [advFilters, setAdvFilters] = useState<Record<string, any>>({});
  const [searchQ, setSearchQ] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");
  const coinMutation = useMutation({
    mutationFn: ({ userId, amount, reason }: { userId: string; amount: number; reason: string }) =>
      adjustAdminUserCoins(userId, { amount, reason }),
    onSuccess: async (_, vars) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-resource", "users"] }),
        queryClient.invalidateQueries({ queryKey: ["user-coin-txns", vars.userId] }),
      ]);
      toast.success(`Coins adjusted: ${vars.amount > 0 ? "+" : ""}${vars.amount}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Live stats for the stats bar
  const { data: statsData } = useQuery({
    queryKey: ["admin-stats", "users"],
    queryFn: () => fetchAdminStats("users"),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  // Sub-data for detail drawer — live API queries scoped to the selected user
  const userId = selectedUser?.id;
  const { data: walletData } = useQuery({
    queryKey: ["user-wallet", userId],
    queryFn: () => fetchAdminResource<any>("wallets", { user: userId!, page_size: 1 }),
    enabled: !!userId,
  });
  const { data: walletTxnData } = useQuery({
    queryKey: ["user-wallet-txns", userId],
    queryFn: () => fetchAdminResource<any>("wallet_transactions", { "wallet__user": userId!, page_size: 20, ordering: "-created_at" }),
    enabled: !!userId,
  });
  const { data: coinTxnData } = useQuery({
    queryKey: ["user-coin-txns", userId],
    queryFn: () => fetchAdminResource<any>("coin_transactions", { user: userId!, page_size: 20, ordering: "-created_at" }),
    enabled: !!userId,
  });
  const { data: sessionData } = useQuery({
    queryKey: ["user-sessions", userId],
    queryFn: () => fetchAdminResource<any>("user_sessions", { user: userId!, page_size: 10, ordering: "-last_active" }),
    enabled: !!userId,
  });
  const { data: otpData } = useQuery({
    queryKey: ["user-otps", userId],
    queryFn: () => fetchAdminResource<any>("otps", { user: userId!, page_size: 10, ordering: "-created_at" }),
    enabled: !!userId,
  });

  useEffect(() => {
    if (!data?.results) return;
    const mapped: UserData[] = data.results.map((u: any) => ({
      id: u.id,
      phone: u.phone || "",
      email: u.email || "",
      full_name: u.full_name || u.username || "Unknown",
      profile_photo: u.profile_photo || "",
      date_of_birth: u.date_of_birth || "",
      gender: u.gender || "other",
      is_active: Boolean(u.is_active),
      is_verified: Boolean(u.is_verified),
      referral_code: u.referral_code || "",
      referred_by: u.referred_by || null,
      coin_balance: Number(u.coin_balance || 0),
      created_at: u.created_at ? String(u.created_at).slice(0, 10) : "",
      updated_at: u.updated_at ? String(u.updated_at).slice(0, 10) : "",
      roles: Array.isArray(u.roles) ? u.roles : [],
    }));
    setUsers(mapped);
  }, [data?.results]);

  const filteredUsers = users.filter(u => {
    if (searchQ) {
      const q = searchQ.toLowerCase();
      if (!u.full_name.toLowerCase().includes(q) && !u.phone.includes(q) && !u.email.toLowerCase().includes(q)) return false;
    }
    if (activeStatus === "active" && !u.is_active) return false;
    if (activeStatus === "inactive" && u.is_active) return false;
    if (activeStatus === "verified" && !u.is_verified) return false;
    if (activeStatus === "unverified" && u.is_verified) return false;
    if (advFilters.gender && u.gender !== advFilters.gender) return false;
    if (advFilters.role && !u.roles.includes(advFilters.role)) return false;
    if (advFilters.is_verified && !u.is_verified) return false;
    if (advFilters.is_active && !u.is_active) return false;
    if (advFilters.has_referral && !u.referred_by) return false;
    return true;
  });

  const handleCreate = () => { setEditingUser({ ...emptyUser, referral_code: `PG${String(Math.random()).slice(2, 8).toUpperCase()}` }); setIsEditing(false); setFormOpen(true); };
  const handleEdit = (user: UserData) => { setEditingUser({ ...user }); setIsEditing(true); setFormOpen(true); };
  const handleSave = () => {
    if (!editingUser.full_name || !editingUser.phone) { toast.error("Name and phone are required"); return; }
    // Strip server-managed / read-only fields before sending
    const { id: _id, created_at, updated_at, referral_code, ...writableFields } = editingUser as any;
    const payload: Record<string, any> = { ...writableFields };
    const referredBy = typeof payload.referred_by === "string" ? payload.referred_by.trim() : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(referredBy)) {
      payload.referred_by = null;
    }
    if (isEditing && editingUser.id) {
      updateMutation.mutate({ id: editingUser.id, data: payload }, {
        onSuccess: () => { toast.success("User updated"); setFormOpen(false); },
      });
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => { toast.success("User created"); setFormOpen(false); },
      });
    }
  };
  const handleDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id, {
        onSuccess: () => {
          toast.success(`User ${deleteTarget.full_name} deleted`);
          setDeleteOpen(false); setDeleteTarget(null);
          if (selectedUser?.id === deleteTarget.id) { setDrawerOpen(false); setSelectedUser(null); }
        },
      });
    }
  };
  const handleAdjustCoins = (amount: number, reason: string) => {
    if (coinTarget) {
      coinMutation.mutate({ userId: coinTarget.id, amount, reason });
    }
  };

  const columns: Column<UserData>[] = [
    { key: "id", label: "ID", render: r => <span className="font-mono text-xs font-semibold text-primary">{r.id}</span> },
    { key: "full_name", label: "Full Name", render: r => (
      <div className="flex items-center gap-2.5">
        {r.profile_photo ? <img src={r.profile_photo} className="h-8 w-8 rounded-full object-cover" /> : (
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary">{r.full_name.split(" ").map(n => n[0]).join("")}</div>
        )}
        <div><span className="font-medium text-sm block">{r.full_name}</span><span className="text-xs text-muted-foreground">{r.gender}</span></div>
      </div>
    )},
    { key: "phone", label: "Phone", render: r => <span className="font-mono text-xs">{r.phone}</span> },
    { key: "email", label: "Email", render: r => <span className="text-xs truncate max-w-[160px] block">{r.email}</span> },
    { key: "roles", label: "Roles", render: r => <div className="flex gap-1 flex-wrap">{r.roles.map(role => <Badge key={role} variant="secondary" className="text-[10px] capitalize">{role.replace("_", " ")}</Badge>)}</div> },
    { key: "is_verified", label: "Verified", render: r => <StatusBadge status={r.is_verified ? "active" : "pending"} /> },
    { key: "is_active", label: "Active", render: r => <StatusBadge status={r.is_active ? "online" : "offline"} pulse={r.is_active} /> },
    { key: "coin_balance", label: "Coins", render: r => <span className="font-mono text-sm font-semibold">{r.coin_balance}</span> },
    { key: "created_at", label: "Joined" },
  ];

  return (
    <>
      <ModulePage
        title="Users" subtitle="Manage all platform users" createLabel="Create User"
        onCreate={handleCreate} onRowClick={(u: UserData) => { setSelectedUser(u); setDrawerOpen(true); }}
        stats={[
          { label: "Total Users", value: statsData?.total ?? users.length },
          { label: "Active", value: statsData?.bool_counts.is_active ?? users.filter(u => u.is_active).length },
          { label: "Verified", value: statsData?.bool_counts.is_verified ?? users.filter(u => u.is_verified).length },
          { label: "New Today", value: statsData?.today ?? 0 },
          { label: "Multi-Role", value: users.filter(u => u.roles.length > 1).length },
          { label: "Referral Signups", value: users.filter(u => u.referred_by).length },
        ]}
        statusFilters={[{ label: "All", value: "all" }, { label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }, { label: "Verified", value: "verified" }, { label: "Unverified", value: "unverified" }]}
        activeStatus={activeStatus} onStatusChange={setActiveStatus} onSearch={setSearchQ}
        searchPlaceholder="Search name, phone, email..." columns={columns} data={filteredUsers}
        advancedFilterFields={advancedFilterFields} advancedFilters={advFilters}
        onAdvancedFilterApply={setAdvFilters} onAdvancedFilterClear={() => setAdvFilters({})}
      />

      <DetailDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={selectedUser?.full_name || ""} subtitle={selectedUser?.id}>
        {selectedUser && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => { handleEdit(selectedUser); setDrawerOpen(false); }}><Edit className="h-3.5 w-3.5 mr-1" /> Edit</Button>
              <Button size="sm" variant="outline"><Send className="h-3.5 w-3.5 mr-1" /> Notify</Button>
              <Button size="sm" variant="outline" onClick={() => { setCoinTarget(selectedUser); setCoinDialogOpen(true); }}><Coins className="h-3.5 w-3.5 mr-1" /> Adjust Coins</Button>
              <Button size="sm" variant="destructive" onClick={() => { setDeleteTarget(selectedUser); setDeleteOpen(true); }}><Trash2 className="h-3.5 w-3.5 mr-1" /> Delete</Button>
            </div>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="wallet">Wallet & Coins</TabsTrigger>
                <TabsTrigger value="sessions">Sessions</TabsTrigger>
                <TabsTrigger value="otp">OTP History</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4 mt-4">
                {selectedUser.profile_photo && <img src={selectedUser.profile_photo} className="h-20 w-20 rounded-full object-cover border-2 border-primary/20" />}
                <div className="grid grid-cols-2 gap-4">
                  <InfoField icon={<UserIcon className="h-4 w-4" />} label="Full Name" value={selectedUser.full_name} />
                  <InfoField icon={<Phone className="h-4 w-4" />} label="Phone" value={selectedUser.phone} />
                  <InfoField icon={<Mail className="h-4 w-4" />} label="Email" value={selectedUser.email} />
                  <InfoField label="Gender" value={selectedUser.gender} />
                  <InfoField icon={<Calendar className="h-4 w-4" />} label="DOB" value={selectedUser.date_of_birth} />
                  <InfoField label="Coins" value={String(selectedUser.coin_balance)} />
                  <InfoField label="Verified" value={selectedUser.is_verified ? "Yes" : "No"} />
                  <InfoField label="Active" value={selectedUser.is_active ? "Yes" : "No"} />
                </div>
                <Separator />
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Roles</Label>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {allRoles.map(role => (
                      <div key={role} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-muted/30">
                        <Switch checked={selectedUser.roles.includes(role)} disabled className="scale-75" />
                        <span className="text-xs capitalize font-medium">{role.replace("_", " ")}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                  <div><span className="font-medium">Created:</span> {selectedUser.created_at}</div>
                  <div><span className="font-medium">Updated:</span> {selectedUser.updated_at}</div>
                </div>
              </TabsContent>
              <TabsContent value="wallet" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4 bg-muted/20">
                    <p className="text-xs text-muted-foreground">Wallet Balance</p>
                    <p className="text-2xl font-bold font-mono">Rs. {walletData?.results?.[0]?.balance ?? "—"}</p>
                  </div>
                  <div className="rounded-lg border p-4 bg-muted/20"><p className="text-xs text-muted-foreground">Coins</p><p className="text-2xl font-bold font-mono">{selectedUser.coin_balance}</p></div>
                </div>
                <h4 className="text-sm font-semibold">Wallet Transactions</h4>
                {walletTxnData?.results?.length ? (
                  <MiniTable headers={["Type", "Amount", "Source", "Date"]} rows={walletTxnData.results.map((t: any) => [
                    <StatusBadge status={t.transaction_type === "credit" ? "success" : "cancelled"} />,
                    <span className="font-mono">Rs. {t.amount}</span>, t.source || "—",
                    t.created_at ? String(t.created_at).slice(0, 16).replace("T", " ") : "—",
                  ])} />
                ) : <p className="text-xs text-muted-foreground py-4 text-center">No wallet transactions found.</p>}
                <h4 className="text-sm font-semibold">Coin Transactions</h4>
                {coinTxnData?.results?.length ? (
                  <MiniTable headers={["Type", "Coins", "Source", "Date"]} rows={coinTxnData.results.map((t: any) => [
                    <StatusBadge status={t.transaction_type === "earn" ? "success" : t.transaction_type === "spend" ? "cancelled" : "pending"} />,
                    <span className={`font-mono ${Number(t.coins) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{Number(t.coins) > 0 ? "+" : ""}{t.coins}</span>,
                    t.source || "—", t.created_at ? String(t.created_at).slice(0, 10) : "—",
                  ])} />
                ) : <p className="text-xs text-muted-foreground py-4 text-center">No coin transactions found.</p>}
              </TabsContent>
              <TabsContent value="sessions" className="space-y-4 mt-4">
                <Button size="sm" variant="destructive">Revoke All Sessions</Button>
                {sessionData?.results?.length ? (
                  <MiniTable headers={["Device", "Status", "Last Active", "Action"]} rows={sessionData.results.map((s: any) => [
                    <Badge variant="secondary" className="capitalize text-[10px]">{s.device_type || "web"}</Badge>,
                    <StatusBadge status={s.is_active ? "online" : "offline"} pulse={s.is_active} />,
                    s.last_active ? String(s.last_active).slice(0, 16).replace("T", " ") : "—",
                    s.is_active ? <Button size="sm" variant="ghost" className="text-xs text-destructive h-6">Revoke</Button> : "—",
                  ])} />
                ) : <p className="text-xs text-muted-foreground py-4 text-center">No active sessions.</p>}
              </TabsContent>
              <TabsContent value="otp" className="space-y-4 mt-4">
                {otpData?.results?.length ? (
                  <MiniTable headers={["Purpose", "Used", "Expires", "Created"]} rows={otpData.results.map((o: any) => [
                    <Badge variant="secondary" className="capitalize text-[10px]">{o.purpose || "—"}</Badge>,
                    <StatusBadge status={o.is_used ? "completed" : "pending"} />,
                    o.expires_at ? String(o.expires_at).slice(0, 16).replace("T", " ") : "—",
                    o.created_at ? String(o.created_at).slice(0, 16).replace("T", " ") : "—",
                  ])} />
                ) : <p className="text-xs text-muted-foreground py-4 text-center">No OTP records found.</p>}
              </TabsContent>
              <TabsContent value="security" className="space-y-4 mt-4">
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                  <div><p className="text-xs text-muted-foreground">Referral Code</p><p className="font-mono font-bold text-lg">{selectedUser.referral_code}</p></div>
                  <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(selectedUser.referral_code); toast.success("Copied!"); }}><Copy className="h-4 w-4" /></Button>
                </div>
                {selectedUser.referred_by && <div className="p-3 rounded-lg border bg-muted/20"><p className="text-xs text-muted-foreground">Referred By</p><p className="font-mono font-semibold text-primary">{selectedUser.referred_by}</p></div>}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DetailDrawer>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isEditing ? "Edit User" : "Create User"}</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Basic Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <FF label="Full Name *" value={editingUser.full_name} onChange={v => setEditingUser(p => ({ ...p, full_name: v }))} />
                <FF label="Phone *" value={editingUser.phone} onChange={v => setEditingUser(p => ({ ...p, phone: v }))} placeholder="+977 98XXXXXXXX" />
                <FF label="Email" value={editingUser.email} onChange={v => setEditingUser(p => ({ ...p, email: v }))} type="email" />
                <FF label="Date of Birth" value={editingUser.date_of_birth} onChange={v => setEditingUser(p => ({ ...p, date_of_birth: v }))} type="date" />
                <div className="space-y-1.5">
                  <Label className="text-sm">Gender</Label>
                  <Select value={editingUser.gender} onValueChange={v => setEditingUser(p => ({ ...p, gender: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                  </Select>
                </div>
                <ImagePickerField label="Profile Photo" value={editingUser.profile_photo} onChange={v => setEditingUser(p => ({ ...p, profile_photo: v }))} />
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Account Settings</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 rounded-lg border"><Label className="text-sm">Is Active</Label><Switch checked={editingUser.is_active} onCheckedChange={v => setEditingUser(p => ({ ...p, is_active: v }))} /></div>
                <div className="flex items-center justify-between p-3 rounded-lg border"><Label className="text-sm">Is Verified</Label><Switch checked={editingUser.is_verified} onCheckedChange={v => setEditingUser(p => ({ ...p, is_verified: v }))} /></div>
                <FF label="Referral Code" value={editingUser.referral_code} onChange={v => setEditingUser(p => ({ ...p, referral_code: v }))} />
                <FF label="Referred By" value={editingUser.referred_by || ""} onChange={v => setEditingUser(p => ({ ...p, referred_by: v || null }))} placeholder="USR-XXXX" />
                <FF label="Coin Balance" value={String(editingUser.coin_balance)} onChange={v => setEditingUser(p => ({ ...p, coin_balance: parseInt(v) || 0 }))} type="number" />
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Roles</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {allRoles.map(role => (
                  <div key={role} className="flex items-center gap-2 p-3 rounded-lg border bg-muted/20">
                    <Switch checked={editingUser.roles.includes(role)} onCheckedChange={c => setEditingUser(p => ({ ...p, roles: c ? [...p.roles, role] : p.roles.filter(r => r !== role) }))} />
                    <span className="text-sm capitalize font-medium">{role.replace("_", " ")}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{isEditing ? "Save Changes" : "Create User"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {coinTarget && <AdjustCoinsDialog open={coinDialogOpen} onOpenChange={setCoinDialogOpen} userName={coinTarget.full_name} currentBalance={coinTarget.coin_balance} onAdjust={handleAdjustCoins} />}
      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Delete User" description={`Delete "${deleteTarget?.full_name}"? This cannot be undone.`} onConfirm={handleDelete} destructive />
    </>
  );
}

function InfoField({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (<div className="space-y-0.5"><div className="flex items-center gap-1.5 text-muted-foreground">{icon}<span className="text-[11px] uppercase tracking-wider font-medium">{label}</span></div><p className="text-sm font-medium">{value || "—"}</p></div>);
}
function FF({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (<div className="space-y-1.5"><Label className="text-sm">{label}</Label><Input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} /></div>);
}
function MiniTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (<div className="rounded-lg border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/30 border-b">{headers.map(h => <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i} className="border-b last:border-0">{row.map((cell, j) => <td key={j} className="px-3 py-2">{cell}</td>)}</tr>)}</tbody></table></div>);
}
