import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  Search,
  MapPin,
  Link2,
  Unlink,
  BarChart3,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  owner_id: string;
  created_at: string;
  gyms?: { id: string; name: string; city: string | null }[];
}

interface BrandFormData {
  name: string;
  owner_id: string;
}

export function BrandManagement() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isAnalyticsDialogOpen, setIsAnalyticsDialogOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedGymId, setSelectedGymId] = useState<string>("");
  const [formData, setFormData] = useState<BrandFormData>({
    name: "",
    owner_id: "",
  });

  // Fetch brands with their gyms
  const { data: brands, isLoading: brandsLoading } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const { data: brandsData, error: brandsError } = await supabase
        .from("brands")
        .select("*")
        .is("deleted_at", null)
        .order("name");

      if (brandsError) throw brandsError;

      // Fetch gyms for each brand
      const brandsWithGyms = await Promise.all(
        brandsData.map(async (brand) => {
          const { data: gyms } = await supabase
            .from("gyms")
            .select("id, name, city")
            .eq("brand_id", brand.id)
            .is("deleted_at", null);
          return { ...brand, gyms: gyms || [] };
        })
      );

      return brandsWithGyms as Brand[];
    },
  });

  // Fetch gym owners for dropdown
  const { data: gymOwners } = useQuery({
    queryKey: ["gym_owners_for_brands"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "gym_owner");

      if (!roles || roles.length === 0) return [];

      const userIds = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);

      return profiles || [];
    },
  });

  // Fetch unassigned gyms
  const { data: unassignedGyms } = useQuery({
    queryKey: ["unassigned_gyms"],
    queryFn: async () => {
      const { data } = await supabase
        .from("gyms")
        .select("id, name, city, owner_id")
        .is("brand_id", null)
        .is("deleted_at", null)
        .order("name");
      return data || [];
    },
  });

  // Fetch brand analytics
  const { data: brandAnalytics, refetch: refetchAnalytics } = useQuery({
    queryKey: ["brand_analytics", selectedBrand?.id],
    queryFn: async () => {
      if (!selectedBrand) return null;
      const { data, error } = await supabase.rpc("get_brand_analytics", {
        _brand_id: selectedBrand.id,
      });
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!selectedBrand && isAnalyticsDialogOpen,
  });

  // Fetch branch stats
  const { data: branchStats } = useQuery({
    queryKey: ["brand_branch_stats", selectedBrand?.id],
    queryFn: async () => {
      if (!selectedBrand) return [];
      const { data, error } = await supabase.rpc("get_brand_branch_stats", {
        _brand_id: selectedBrand.id,
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedBrand && isAnalyticsDialogOpen,
  });

  // Create brand
  const createBrandMutation = useMutation({
    mutationFn: async (data: BrandFormData) => {
      const { error } = await supabase.from("brands").insert({
        name: data.name,
        owner_id: data.owner_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Brand created successfully");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to create brand: " + error.message);
    },
  });

  // Update brand
  const updateBrandMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<BrandFormData>;
    }) => {
      const { error } = await supabase.from("brands").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Brand updated successfully");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to update brand: " + error.message);
    },
  });

  // Delete brand
  const deleteBrandMutation = useMutation({
    mutationFn: async (id: string) => {
      // First unassign all gyms
      await supabase.from("gyms").update({ brand_id: null }).eq("brand_id", id);
      // Then soft delete the brand
      const { error } = await supabase
        .from("brands")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      queryClient.invalidateQueries({ queryKey: ["unassigned_gyms"] });
      toast.success("Brand deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete brand: " + error.message);
    },
  });

  // Assign gym to brand
  const assignGymMutation = useMutation({
    mutationFn: async ({
      gymId,
      brandId,
    }: {
      gymId: string;
      brandId: string;
    }) => {
      const { error } = await supabase
        .from("gyms")
        .update({ brand_id: brandId })
        .eq("id", gymId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      queryClient.invalidateQueries({ queryKey: ["unassigned_gyms"] });
      toast.success("Gym assigned to brand");
      setIsAssignDialogOpen(false);
      setSelectedGymId("");
    },
    onError: (error) => {
      toast.error("Failed to assign gym: " + error.message);
    },
  });

  // Unassign gym from brand
  const unassignGymMutation = useMutation({
    mutationFn: async (gymId: string) => {
      const { error } = await supabase
        .from("gyms")
        .update({ brand_id: null })
        .eq("id", gymId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      queryClient.invalidateQueries({ queryKey: ["unassigned_gyms"] });
      toast.success("Gym removed from brand");
    },
    onError: (error) => {
      toast.error("Failed to unassign gym: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({ name: "", owner_id: "" });
    setSelectedBrand(null);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.owner_id) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (selectedBrand) {
      updateBrandMutation.mutate({ id: selectedBrand.id, data: formData });
    } else {
      createBrandMutation.mutate(formData);
    }
  };

  const openEditDialog = (brand: Brand) => {
    setSelectedBrand(brand);
    setFormData({
      name: brand.name,
      owner_id: brand.owner_id,
    });
    setIsDialogOpen(true);
  };

  const openAssignDialog = (brand: Brand) => {
    setSelectedBrand(brand);
    setIsAssignDialogOpen(true);
  };

  const openAnalyticsDialog = (brand: Brand) => {
    setSelectedBrand(brand);
    setIsAnalyticsDialogOpen(true);
    refetchAnalytics();
  };

  const filteredBrands = useMemo(() => {
    if (!brands) return [];
    if (!searchQuery) return brands;
    return brands.filter((brand) =>
      brand.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [brands, searchQuery]);

  if (brandsLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Brand Management
            </CardTitle>
            <CardDescription>
              Group multiple gyms under a single brand for cross-branch
              management
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  resetForm();
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Brand
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {selectedBrand ? "Edit Brand" : "Create New Brand"}
                </DialogTitle>
                <DialogDescription>
                  {selectedBrand
                    ? "Update the brand details below"
                    : "Create a new brand to group multiple gym branches"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Brand Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., FitLife Gyms"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner">Brand Owner *</Label>
                  <Select
                    value={formData.owner_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, owner_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {gymOwners?.map((owner) => (
                        <SelectItem key={owner.id} value={owner.id}>
                          {owner.full_name || owner.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={
                    createBrandMutation.isPending ||
                    updateBrandMutation.isPending
                  }
                >
                  {selectedBrand ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search brands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {filteredBrands.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No brands found. Create one to start grouping gyms.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Brand Name</TableHead>
                  <TableHead>Branches</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBrands.map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell className="font-medium">{brand.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {brand.gyms && brand.gyms.length > 0 ? (
                          brand.gyms.map((gym) => (
                            <Badge
                              key={gym.id}
                              variant="secondary"
                              className="flex items-center gap-1"
                            >
                              <MapPin className="h-3 w-3" />
                              {gym.name}
                              {gym.city && (
                                <span className="text-muted-foreground">
                                  ({gym.city})
                                </span>
                              )}
                              <button
                                onClick={() => unassignGymMutation.mutate(gym.id)}
                                className="ml-1 hover:text-destructive"
                              >
                                <Unlink className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            No branches assigned
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(brand.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openAnalyticsDialog(brand)}
                          title="View Analytics"
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openAssignDialog(brand)}
                          title="Assign Gym"
                        >
                          <Link2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(brand)}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteBrandMutation.mutate(brand.id)}
                          className="text-destructive hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Assign Gym Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Gym to {selectedBrand?.name}</DialogTitle>
            <DialogDescription>
              Select a gym to add as a branch under this brand
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {unassignedGyms && unassignedGyms.length > 0 ? (
              <Select value={selectedGymId} onValueChange={setSelectedGymId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a gym" />
                </SelectTrigger>
                <SelectContent>
                  {unassignedGyms.map((gym) => (
                    <SelectItem key={gym.id} value={gym.id}>
                      {gym.name} {gym.city && `(${gym.city})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                All gyms are already assigned to brands
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAssignDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                selectedBrand &&
                selectedGymId &&
                assignGymMutation.mutate({
                  gymId: selectedGymId,
                  brandId: selectedBrand.id,
                })
              }
              disabled={!selectedGymId || assignGymMutation.isPending}
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog
        open={isAnalyticsDialogOpen}
        onOpenChange={setIsAnalyticsDialogOpen}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {selectedBrand?.name} - Cross-Branch Analytics
            </DialogTitle>
            <DialogDescription>
              Overview of all branches under this brand
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Summary Stats */}
            {brandAnalytics && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard
                  title="Total Branches"
                  value={brandAnalytics.total_gyms?.toString() || "0"}
                  icon={Building2}
                  iconVariant="blue"
                />
                <StatCard
                  title="Total Members"
                  value={brandAnalytics.total_members?.toString() || "0"}
                  icon={Building2}
                  iconVariant="teal"
                />
                <StatCard
                  title="Active Members"
                  value={brandAnalytics.active_members?.toString() || "0"}
                  icon={Building2}
                  iconVariant="green"
                />
                <StatCard
                  title="Total Revenue"
                  value={`₹${Number(brandAnalytics.total_revenue || 0).toLocaleString()}`}
                  icon={Building2}
                  iconVariant="orange"
                />
                <StatCard
                  title="Monthly Revenue"
                  value={`₹${Number(brandAnalytics.monthly_revenue || 0).toLocaleString()}`}
                  icon={Building2}
                  iconVariant="teal"
                />
                <StatCard
                  title="Today's Attendance"
                  value={brandAnalytics.today_attendance?.toString() || "0"}
                  icon={Building2}
                  iconVariant="blue"
                />
              </div>
            )}

            {/* Per-Branch Stats */}
            {branchStats && branchStats.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3">Branch Performance</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Branch</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead className="text-right">Members</TableHead>
                      <TableHead className="text-right">Active</TableHead>
                      <TableHead className="text-right">Monthly Revenue</TableHead>
                      <TableHead className="text-right">Today</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {branchStats.map((branch: any) => (
                      <TableRow key={branch.gym_id}>
                        <TableCell className="font-medium">
                          {branch.gym_name}
                        </TableCell>
                        <TableCell>{branch.city || "-"}</TableCell>
                        <TableCell className="text-right">
                          {branch.total_members}
                        </TableCell>
                        <TableCell className="text-right">
                          {branch.active_members}
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{Number(branch.monthly_revenue || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {branch.today_attendance}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
