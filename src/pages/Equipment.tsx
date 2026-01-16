import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UpgradeRequiredPage } from "@/components/UpgradeOverlay";
import { useGymPlanFeatures } from "@/hooks/useGymPlanFeatures";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dumbbell,
  Plus,
  Search,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  IndianRupee,
  MoreVertical,
  Edit,
  Trash2,
  ClipboardList,
  Calendar,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

type EquipmentCondition = "excellent" | "good" | "fair" | "needs_repair" | "out_of_service";
type EquipmentCategory = "cardio" | "strength" | "free_weights" | "machines" | "accessories" | "other";

interface Equipment {
  id: string;
  gym_id: string;
  name: string;
  category: EquipmentCategory;
  purchase_date: string | null;
  purchase_price: number | null;
  condition: EquipmentCondition;
  serial_number: string | null;
  notes: string | null;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  created_at: string;
  updated_at: string;
}

interface MaintenanceLog {
  id: string;
  equipment_id: string;
  maintenance_date: string;
  maintenance_type: string;
  description: string | null;
  cost: number | null;
  performed_by: string | null;
  created_at: string;
}

const categoryLabels: Record<EquipmentCategory, string> = {
  cardio: "Cardio",
  strength: "Strength",
  free_weights: "Free Weights",
  machines: "Machines",
  accessories: "Accessories",
  other: "Other",
};

const conditionLabels: Record<EquipmentCondition, string> = {
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  needs_repair: "Needs Repair",
  out_of_service: "Out of Service",
};

const conditionColors: Record<EquipmentCondition, string> = {
  excellent: "bg-md-green/10 text-md-green border-md-green/20",
  good: "bg-md-teal/10 text-md-teal border-md-teal/20",
  fair: "bg-md-yellow/10 text-md-yellow border-md-yellow/20",
  needs_repair: "bg-md-orange/10 text-md-orange border-md-orange/20",
  out_of_service: "bg-md-red/10 text-md-red border-md-red/20",
};

export default function Equipment() {
  const { gymId } = useAuth();
  const { data: features, isLoading: featuresLoading } = useGymPlanFeatures();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false);
  const [isMaintenanceHistoryOpen, setIsMaintenanceHistoryOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    category: "cardio" as EquipmentCategory,
    purchase_date: "",
    purchase_price: "",
    condition: "excellent" as EquipmentCondition,
    serial_number: "",
    notes: "",
    next_maintenance_date: "",
  });

  const [maintenanceForm, setMaintenanceForm] = useState({
    maintenance_type: "routine",
    description: "",
    cost: "",
    performed_by: "",
  });

  // Fetch equipment
  const { data: equipment = [], isLoading: equipmentLoading } = useQuery({
    queryKey: ["equipment", gymId],
    queryFn: async () => {
      if (!gymId) return [];
      const { data, error } = await supabase
        .from("equipment" as any)
        .select("*")
        .eq("gym_id", gymId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Equipment[];
    },
    enabled: !!gymId && features?.hasEquipmentTracking,
  });

  // Fetch maintenance logs for selected equipment
  const { data: maintenanceLogs = [] } = useQuery({
    queryKey: ["equipment_maintenance", selectedEquipment?.id],
    queryFn: async () => {
      if (!selectedEquipment?.id) return [];
      const { data, error } = await supabase
        .from("equipment_maintenance" as any)
        .select("*")
        .eq("equipment_id", selectedEquipment.id)
        .order("maintenance_date", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as MaintenanceLog[];
    },
    enabled: !!selectedEquipment?.id && isMaintenanceHistoryOpen,
  });

  // Add equipment mutation
  const addEquipment = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!gymId) throw new Error("No gym ID");
      const { error } = await supabase.from("equipment" as any).insert({
        gym_id: gymId,
        name: data.name,
        category: data.category,
        purchase_date: data.purchase_date || null,
        purchase_price: data.purchase_price ? parseFloat(data.purchase_price) : null,
        condition: data.condition,
        serial_number: data.serial_number || null,
        notes: data.notes || null,
        next_maintenance_date: data.next_maintenance_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      setIsAddDialogOpen(false);
      resetForm();
      toast.success("Equipment added successfully");
    },
    onError: (error) => {
      toast.error(`Failed to add equipment: ${error.message}`);
    },
  });

  // Update equipment mutation
  const updateEquipment = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { error } = await supabase
        .from("equipment" as any)
        .update({
          name: data.name,
          category: data.category,
          purchase_date: data.purchase_date || null,
          purchase_price: data.purchase_price ? parseFloat(data.purchase_price) : null,
          condition: data.condition,
          serial_number: data.serial_number || null,
          notes: data.notes || null,
          next_maintenance_date: data.next_maintenance_date || null,
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      setIsEditDialogOpen(false);
      setSelectedEquipment(null);
      resetForm();
      toast.success("Equipment updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update equipment: ${error.message}`);
    },
  });

  // Delete equipment mutation
  const deleteEquipment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("equipment" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      setIsDeleteDialogOpen(false);
      setSelectedEquipment(null);
      toast.success("Equipment deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete equipment: ${error.message}`);
    },
  });

  // Add maintenance log mutation
  const addMaintenance = useMutation({
    mutationFn: async (data: typeof maintenanceForm & { equipment_id: string }) => {
      const { error: logError } = await supabase.from("equipment_maintenance" as any).insert({
        equipment_id: data.equipment_id,
        maintenance_type: data.maintenance_type,
        description: data.description || null,
        cost: data.cost ? parseFloat(data.cost) : null,
        performed_by: data.performed_by || null,
      });
      if (logError) throw logError;

      // Update equipment's last maintenance date
      const { error: updateError } = await supabase
        .from("equipment" as any)
        .update({ last_maintenance_date: new Date().toISOString().split("T")[0] })
        .eq("id", data.equipment_id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      queryClient.invalidateQueries({ queryKey: ["equipment_maintenance"] });
      setIsMaintenanceDialogOpen(false);
      setSelectedEquipment(null);
      setMaintenanceForm({ maintenance_type: "routine", description: "", cost: "", performed_by: "" });
      toast.success("Maintenance logged successfully");
    },
    onError: (error) => {
      toast.error(`Failed to log maintenance: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      category: "cardio",
      purchase_date: "",
      purchase_price: "",
      condition: "excellent",
      serial_number: "",
      notes: "",
      next_maintenance_date: "",
    });
  };

  const openEditDialog = (item: Equipment) => {
    setSelectedEquipment(item);
    setFormData({
      name: item.name,
      category: item.category,
      purchase_date: item.purchase_date || "",
      purchase_price: item.purchase_price?.toString() || "",
      condition: item.condition,
      serial_number: item.serial_number || "",
      notes: item.notes || "",
      next_maintenance_date: item.next_maintenance_date || "",
    });
    setIsEditDialogOpen(true);
  };

  const filteredEquipment = useMemo(() => {
    return equipment.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.serial_number?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [equipment, searchQuery, categoryFilter]);

  const stats = useMemo(() => {
    const totalValue = equipment.reduce((sum, e) => sum + (e.purchase_price || 0), 0);
    const excellent = equipment.filter((e) => e.condition === "excellent" || e.condition === "good").length;
    const needsAttention = equipment.filter((e) => e.condition === "needs_repair" || e.condition === "out_of_service").length;
    return {
      total: equipment.length,
      excellent,
      needsAttention,
      totalValue,
    };
  }, [equipment]);

  if (featuresLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  if (!features?.hasEquipmentTracking) {
    return (
      <DashboardLayout>
        <UpgradeRequiredPage
          feature="Equipment Tracking"
          description="Track your gym equipment inventory, monitor conditions, and schedule maintenance to keep your gym running smoothly."
          benefits={[
            "Complete equipment inventory management",
            "Track purchase dates and values",
            "Monitor equipment condition",
            "Maintenance scheduling & logs",
            "Asset value tracking",
          ]}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader title="Equipment" description="Track gym equipment and maintenance">
        <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Equipment
        </Button>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard title="Total Equipment" value={stats.total} icon={Dumbbell} iconVariant="teal" />
        <StatCard title="Good Condition" value={stats.excellent} icon={CheckCircle2} iconVariant="green" />
        <StatCard title="Needs Attention" value={stats.needsAttention} icon={AlertTriangle} iconVariant="orange" />
        <StatCard title="Total Value" value={`₹${stats.totalValue.toLocaleString()}`} icon={IndianRupee} iconVariant="blue" />
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or serial number..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Equipment Grid */}
      {equipmentLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filteredEquipment.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Equipment Found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchQuery ? "Try adjusting your search" : "Add your first equipment to get started"}
          </p>
          {!searchQuery && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Equipment
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEquipment.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-border bg-card p-5 hover:border-primary/50 transition-colors relative group"
            >
              {/* Action Menu */}
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditDialog(item)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSelectedEquipment(item); setIsMaintenanceDialogOpen(true); }}>
                      <Wrench className="mr-2 h-4 w-4" />
                      Log Maintenance
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSelectedEquipment(item); setIsMaintenanceHistoryOpen(true); }}>
                      <ClipboardList className="mr-2 h-4 w-4" />
                      View History
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => { setSelectedEquipment(item); setIsDeleteDialogOpen(true); }}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-start gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Dumbbell className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{item.name}</h3>
                  <p className="text-xs text-muted-foreground">{categoryLabels[item.category]}</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Condition</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${conditionColors[item.condition]}`}>
                    {conditionLabels[item.condition]}
                  </span>
                </div>
                {item.purchase_price && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Value</span>
                    <span className="font-medium text-foreground">₹{item.purchase_price.toLocaleString()}</span>
                  </div>
                )}
                {item.last_maintenance_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Last Service</span>
                    <span className="text-foreground">{format(new Date(item.last_maintenance_date), "MMM d, yyyy")}</span>
                  </div>
                )}
              </div>

              {item.serial_number && (
                <div className="mt-3 pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground font-mono">S/N: {item.serial_number}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Equipment Dialog */}
      <Dialog open={isAddDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false);
          setIsEditDialogOpen(false);
          setSelectedEquipment(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditDialogOpen ? "Edit Equipment" : "Add Equipment"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (isEditDialogOpen && selectedEquipment) {
              updateEquipment.mutate({ ...formData, id: selectedEquipment.id });
            } else {
              addEquipment.mutate(formData);
            }
          }} className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Treadmill, Dumbbells, etc."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v as EquipmentCategory })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="condition">Condition</Label>
                <Select value={formData.condition} onValueChange={(v) => setFormData({ ...formData, condition: v as EquipmentCondition })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(conditionLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="purchase_date">Purchase Date</Label>
                <Input
                  id="purchase_date"
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="purchase_price">Purchase Price (₹)</Label>
                <Input
                  id="purchase_price"
                  type="number"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                  placeholder="50000"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="serial_number">Serial Number</Label>
              <Input
                id="serial_number"
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                placeholder="Optional"
              />
            </div>

            <div>
              <Label htmlFor="next_maintenance">Next Maintenance Date</Label>
              <Input
                id="next_maintenance"
                type="date"
                value={formData.next_maintenance_date}
                onChange={(e) => setFormData({ ...formData, next_maintenance_date: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => {
                setIsAddDialogOpen(false);
                setIsEditDialogOpen(false);
                setSelectedEquipment(null);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={addEquipment.isPending || updateEquipment.isPending}>
                {isEditDialogOpen ? "Update" : "Add Equipment"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Log Maintenance Dialog */}
      <Dialog open={isMaintenanceDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsMaintenanceDialogOpen(false);
          setSelectedEquipment(null);
          setMaintenanceForm({ maintenance_type: "routine", description: "", cost: "", performed_by: "" });
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Maintenance</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (selectedEquipment) {
              addMaintenance.mutate({ ...maintenanceForm, equipment_id: selectedEquipment.id });
            }
          }} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Logging maintenance for: <strong>{selectedEquipment?.name}</strong>
            </p>

            <div>
              <Label htmlFor="maintenance_type">Type</Label>
              <Select value={maintenanceForm.maintenance_type} onValueChange={(v) => setMaintenanceForm({ ...maintenanceForm, maintenance_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="replacement">Part Replacement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={maintenanceForm.description}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                placeholder="What was done..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cost">Cost (₹)</Label>
                <Input
                  id="cost"
                  type="number"
                  value={maintenanceForm.cost}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="performed_by">Performed By</Label>
                <Input
                  id="performed_by"
                  value={maintenanceForm.performed_by}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, performed_by: e.target.value })}
                  placeholder="Technician name"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => {
                setIsMaintenanceDialogOpen(false);
                setSelectedEquipment(null);
              }}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={addMaintenance.isPending}>
                Log Maintenance
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Maintenance History Dialog */}
      <Dialog open={isMaintenanceHistoryOpen} onOpenChange={(open) => {
        if (!open) {
          setIsMaintenanceHistoryOpen(false);
          setSelectedEquipment(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Maintenance History</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            {selectedEquipment?.name}
          </p>
          {maintenanceLogs.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No maintenance records yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {maintenanceLogs.map((log) => (
                <div key={log.id} className="p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium capitalize">{log.maintenance_type}</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(log.maintenance_date), "MMM d, yyyy")}</span>
                  </div>
                  {log.description && <p className="text-sm text-muted-foreground mb-2">{log.description}</p>}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {log.cost !== null && <span>Cost: ₹{log.cost.toLocaleString()}</span>}
                    {log.performed_by && <span>By: {log.performed_by}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Equipment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedEquipment?.name}"? This will also delete all maintenance records for this equipment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedEquipment && deleteEquipment.mutate(selectedEquipment.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
