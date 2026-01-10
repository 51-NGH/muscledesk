import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Edit2, Power, Search, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import type { Database } from "@/integrations/supabase/types";

type GymPlan = Database["public"]["Enums"]["gym_plan"];

interface GymFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  plan: GymPlan;
  owner_id: string;
}

export function GymManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingGym, setEditingGym] = useState<any>(null);
  const [formData, setFormData] = useState<GymFormData>({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    plan: "lite",
    owner_id: "",
  });

  const queryClient = useQueryClient();

  // Fetch all gyms
  const { data: gyms, isLoading } = useQuery({
    queryKey: ["super-admin-gyms-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gyms")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch gym owners for assignment
  const { data: gymOwners } = useQuery({
    queryKey: ["super-admin-gym-owners"],
    queryFn: async () => {
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "gym_owner");
      
      if (rolesError) throw rolesError;
      
      if (!roles?.length) return [];

      const userIds = roles.map(r => r.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds);
      
      if (profilesError) throw profilesError;
      return profiles;
    },
  });

  // Create gym mutation
  const createGymMutation = useMutation({
    mutationFn: async (data: GymFormData) => {
      const { error } = await supabase.from("gyms").insert({
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        plan: data.plan,
        owner_id: data.owner_id,
        member_limit: data.plan === "lite" ? 100 : data.plan === "standard" ? 500 : 10000,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-gyms-list"] });
      toast.success("Gym created successfully");
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to create gym: ${error.message}`);
    },
  });

  // Update gym mutation
  const updateGymMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<GymFormData> }) => {
      const updateData: any = {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        plan: data.plan,
      };
      
      if (data.plan) {
        updateData.member_limit = data.plan === "lite" ? 100 : data.plan === "standard" ? 500 : 10000;
      }

      const { error } = await supabase
        .from("gyms")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-gyms-list"] });
      toast.success("Gym updated successfully");
      setEditingGym(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to update gym: ${error.message}`);
    },
  });

  // Toggle gym active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("gyms")
        .update({ is_active: !isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-gyms-list"] });
      toast.success("Gym status updated");
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  // Delete gym (soft delete)
  const deleteGymMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("gyms")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-gyms-list"] });
      toast.success("Gym deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete gym: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      plan: "lite",
      owner_id: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingGym) {
      updateGymMutation.mutate({ id: editingGym.id, data: formData });
    } else {
      createGymMutation.mutate(formData);
    }
  };

  const openEditDialog = (gym: any) => {
    setEditingGym(gym);
    setFormData({
      name: gym.name,
      email: gym.email || "",
      phone: gym.phone || "",
      address: gym.address || "",
      city: gym.city || "",
      plan: gym.plan,
      owner_id: gym.owner_id,
    });
  };

  const filteredGyms = gyms?.filter(gym =>
    gym.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    gym.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    gym.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Gym Management
            </CardTitle>
            <CardDescription>
              Add, edit, and manage all registered gyms
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingGym(null); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add New Gym
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Gym</DialogTitle>
                <DialogDescription>
                  Create a new gym and assign an owner
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Gym Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plan">Plan *</Label>
                    <Select
                      value={formData.plan}
                      onValueChange={(value: GymPlan) => setFormData({ ...formData, plan: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lite">Lite (100 members)</SelectItem>
                        <SelectItem value="standard">Standard (500 members)</SelectItem>
                        <SelectItem value="pro">Pro (Unlimited)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner">Assign Owner *</Label>
                  <Select
                    value={formData.owner_id}
                    onValueChange={(value) => setFormData({ ...formData, owner_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a gym owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {gymOwners?.map((owner) => (
                        <SelectItem key={owner.id} value={owner.id}>
                          {owner.full_name || owner.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!gymOwners?.length && (
                    <p className="text-xs text-muted-foreground">
                      No gym owners available. Create a user with gym_owner role first.
                    </p>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createGymMutation.isPending || !formData.owner_id}>
                    {createGymMutation.isPending ? "Creating..." : "Create Gym"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search gyms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGyms?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No gyms found
                  </TableCell>
                </TableRow>
              ) : (
                filteredGyms?.map((gym) => (
                  <TableRow key={gym.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{gym.name}</p>
                        <p className="text-xs text-muted-foreground">{gym.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{gym.city || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase">
                        {gym.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={gym.is_active ? "default" : "secondary"}>
                        {gym.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Dialog open={editingGym?.id === gym.id} onOpenChange={(open) => !open && setEditingGym(null)}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(gym)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Edit Gym</DialogTitle>
                              <DialogDescription>
                                Update gym details
                              </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="edit-name">Gym Name *</Label>
                                <Input
                                  id="edit-name"
                                  value={formData.name}
                                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                  required
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="edit-email">Email</Label>
                                  <Input
                                    id="edit-email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit-phone">Phone</Label>
                                  <Input
                                    id="edit-phone"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="edit-address">Address</Label>
                                <Input
                                  id="edit-address"
                                  value={formData.address}
                                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="edit-city">City</Label>
                                  <Input
                                    id="edit-city"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit-plan">Plan *</Label>
                                  <Select
                                    value={formData.plan}
                                    onValueChange={(value: GymPlan) => setFormData({ ...formData, plan: value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="lite">Lite (100 members)</SelectItem>
                                      <SelectItem value="standard">Standard (500 members)</SelectItem>
                                      <SelectItem value="pro">Pro (Unlimited)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setEditingGym(null)}>
                                  Cancel
                                </Button>
                                <Button type="submit" disabled={updateGymMutation.isPending}>
                                  {updateGymMutation.isPending ? "Saving..." : "Save Changes"}
                                </Button>
                              </div>
                            </form>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleActiveMutation.mutate({ id: gym.id, isActive: gym.is_active })}
                        >
                          <Power className={`h-4 w-4 ${gym.is_active ? "text-green-600" : "text-muted-foreground"}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this gym?")) {
                              deleteGymMutation.mutate(gym.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
