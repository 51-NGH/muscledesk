import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface FingerprintDevice {
  id: string;
  gym_id: string;
  device_name: string;
  device_serial: string;
  device_ip: string | null;
  api_key: string;
  is_active: boolean;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FingerprintTemplate {
  id: string;
  member_id: string;
  gym_id: string;
  device_id: string | null;
  fingerprint_uid: string;
  created_at: string;
  member?: {
    full_name: string;
    member_id: string;
  };
}

// Device online status threshold (5 minutes)
const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

export function isDeviceOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  const lastSeen = new Date(lastSeenAt).getTime();
  const now = Date.now();
  return now - lastSeen < ONLINE_THRESHOLD_MS;
}

// ============= FINGERPRINT DEVICES =============
export function useFingerprintDevices() {
  const { gymId } = useAuth();

  return useQuery({
    queryKey: ["fingerprint-devices", gymId],
    queryFn: async () => {
      if (!gymId) return [];
      
      const { data, error } = await supabase
        .from("fingerprint_devices")
        .select("*")
        .eq("gym_id", gymId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as FingerprintDevice[];
    },
    enabled: !!gymId,
    refetchInterval: 30000, // Refresh every 30 seconds for status updates
  });
}

export function useRegisterDevice() {
  const { gymId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (device: {
      device_name: string;
      device_serial: string;
      device_ip?: string;
    }) => {
      if (!gymId) throw new Error("No gym selected");

      const { data, error } = await supabase.functions.invoke('register-device', {
        body: {
          gym_id: gymId,
          device_name: device.device_name,
          device_serial: device.device_serial,
          device_ip: device.device_ip || null,
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to register device");
      
      return data.device;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fingerprint-devices"] });
      toast.success("Device registered successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateDevice() {
  const { gymId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FingerprintDevice> & { id: string }) => {
      const { data, error } = await supabase
        .from("fingerprint_devices")
        .update(updates)
        .eq("id", id)
        .eq("gym_id", gymId!)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fingerprint-devices"] });
      toast.success("Device updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteDevice() {
  const { gymId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deviceId: string) => {
      // First delete related fingerprint templates
      await supabase
        .from("fingerprint_templates")
        .delete()
        .eq("device_id", deviceId);

      const { error } = await supabase
        .from("fingerprint_devices")
        .delete()
        .eq("id", deviceId)
        .eq("gym_id", gymId!);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fingerprint-devices"] });
      queryClient.invalidateQueries({ queryKey: ["fingerprint-templates"] });
      toast.success("Device deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// ============= FINGERPRINT TEMPLATES =============
export function useFingerprintTemplates() {
  const { gymId } = useAuth();

  return useQuery({
    queryKey: ["fingerprint-templates", gymId],
    queryFn: async () => {
      if (!gymId) return [];
      
      const { data, error } = await supabase
        .from("fingerprint_templates")
        .select(`
          *,
          member:members(full_name, member_id)
        `)
        .eq("gym_id", gymId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as FingerprintTemplate[];
    },
    enabled: !!gymId,
  });
}

export function useEnrollFingerprint() {
  const { gymId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (enrollment: {
      member_id: string;
      fingerprint_uid: string;
      device_id?: string;
    }) => {
      const { data, error } = await supabase.rpc('register_fingerprint_template', {
        _member_id: enrollment.member_id,
        _fingerprint_uid: enrollment.fingerprint_uid,
        _device_id: enrollment.device_id || null,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; template_id?: string; member_name?: string };
      if (!result.success) throw new Error(result.error || "Failed to enroll fingerprint");
      
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["fingerprint-templates"] });
      toast.success(`Fingerprint enrolled for ${data.member_name}!`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteFingerprintTemplate() {
  const { gymId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from("fingerprint_templates")
        .delete()
        .eq("id", templateId)
        .eq("gym_id", gymId!);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fingerprint-templates"] });
      toast.success("Fingerprint enrollment deleted!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// ============= FINGERPRINT ATTENDANCE =============
export function useFingerprintAttendance(limit = 20) {
  const { gymId } = useAuth();

  return useQuery({
    queryKey: ["fingerprint-attendance", gymId, limit],
    queryFn: async () => {
      if (!gymId) return [];
      
      const { data, error } = await supabase
        .from("attendance")
        .select(`
          *,
          member:members(full_name, member_id, status)
        `)
        .eq("gym_id", gymId)
        .eq("source", "fingerprint")
        .order("check_in_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
    enabled: !!gymId,
    refetchInterval: 10000, // Refresh every 10 seconds for real-time feel
  });
}
