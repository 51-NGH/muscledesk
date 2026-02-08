import { useState, useCallback } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Loader2,
  Plus,
  Trash2,
  FileText,
  Sheet,
  CreditCard,
  Clock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";

interface MemberRow {
  full_name: string;
  phone: string;
  email?: string;
  start_date?: string;
  expiry_date?: string;
  plan_name?: string;
  notes?: string;
  // Attendance fields
  total_visits?: string;
  last_visit_date?: string;
  check_in_dates?: string; // comma-separated dates
  // Payment fields
  payment_amount?: string;
  payment_date?: string;
  payment_mode?: string;
  transaction_id?: string;
}

interface ParsedRow {
  row: number;
  data: Partial<MemberRow>;
  isValid: boolean;
  errors: string[];
  planId?: string;
}

interface DetectedPlan {
  name: string;
  memberCount: number;
  duration_days: number;
  price: number;
  isNew: boolean;
  existingId?: string;
}

export function BulkMemberImport() {
  const { gymId } = useAuth();
  const queryClient = useQueryClient();
  
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; attendance: number; payments: number }>({ success: 0, failed: 0, attendance: 0, payments: 0 });
  const [step, setStep] = useState<"upload" | "configure-plans" | "preview" | "importing" | "complete">("upload");
  
  // Detected plans from CSV
  const [detectedPlans, setDetectedPlans] = useState<DetectedPlan[]>([]);
  const [createdPlanIds, setCreatedPlanIds] = useState<Record<string, string>>({});

  // Fetch existing membership plans
  const { data: existingPlans = [] } = useQuery({
    queryKey: ["membership-plans", gymId],
    queryFn: async () => {
      if (!gymId) return [];
      const { data, error } = await supabase
        .from("membership_plans")
        .select("id, name, duration_days, price")
        .eq("gym_id", gymId)
        .eq("is_active", true)
        .order("price", { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!gymId && isOpen,
  });

  const headerMap: Record<string, keyof MemberRow> = {
    // Member fields
    "full_name": "full_name",
    "name": "full_name",
    "member_name": "full_name",
    "phone": "phone",
    "phone_number": "phone",
    "mobile": "phone",
    "contact": "phone",
    "email": "email",
    "email_address": "email",
    "start_date": "start_date",
    "joining_date": "start_date",
    "join_date": "start_date",
    "expiry_date": "expiry_date",
    "expiry": "expiry_date",
    "end_date": "expiry_date",
    "plan_name": "plan_name",
    "plan": "plan_name",
    "membership": "plan_name",
    "notes": "notes",
    "note": "notes",
    "remarks": "notes",
    // Attendance fields
    "total_visits": "total_visits",
    "visits": "total_visits",
    "visit_count": "total_visits",
    "attendance_count": "total_visits",
    "last_visit": "last_visit_date",
    "last_visit_date": "last_visit_date",
    "last_checkin": "last_visit_date",
    "last_check_in": "last_visit_date",
    "check_in_dates": "check_in_dates",
    "checkin_dates": "check_in_dates",
    "attendance_dates": "check_in_dates",
    "attendance": "check_in_dates",
    // Payment fields
    "payment_amount": "payment_amount",
    "amount_paid": "payment_amount",
    "amount": "payment_amount",
    "fee": "payment_amount",
    "fees": "payment_amount",
    "payment_date": "payment_date",
    "paid_on": "payment_date",
    "paid_date": "payment_date",
    "payment_mode": "payment_mode",
    "pay_mode": "payment_mode",
    "mode_of_payment": "payment_mode",
    "payment_method": "payment_mode",
    "transaction_id": "transaction_id",
    "txn_id": "transaction_id",
    "reference": "transaction_id",
    "ref_no": "transaction_id",
  };

  const normalizeDate = (dateValue: any): string => {
    if (!dateValue) return "";
    
    // Handle Excel serial date numbers
    if (typeof dateValue === "number") {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + dateValue * 86400000);
      return format(date, "yyyy-MM-dd");
    }
    
    const dateStr = String(dateValue).trim();
    
    const formats = [
      /^(\d{4})-(\d{2})-(\d{2})$/,
      /^(\d{2})\/(\d{2})\/(\d{4})$/,
      /^(\d{2})-(\d{2})-(\d{4})$/,
      /^(\d{4})\/(\d{2})\/(\d{2})$/,
    ];

    for (const fmt of formats) {
      const match = dateStr.match(fmt);
      if (match) {
        if (fmt === formats[0]) return dateStr;
        if (fmt === formats[1] || fmt === formats[2]) {
          return `${match[3]}-${match[2]}-${match[1]}`;
        }
        if (fmt === formats[3]) {
          return `${match[1]}-${match[2]}-${match[3]}`;
        }
      }
    }
    return dateStr;
  };

  const normalizePaymentMode = (mode: string): "cash" | "upi" | "card" => {
    const m = mode.toLowerCase().trim();
    if (["upi", "gpay", "phonepe", "paytm", "google_pay", "google pay"].includes(m)) return "upi";
    if (["card", "credit", "debit", "credit_card", "debit_card", "credit card", "debit card"].includes(m)) return "card";
    return "cash";
  };

  const parseExcel = useCallback((buffer: ArrayBuffer): Partial<MemberRow>[] => {
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
    
    if (jsonData.length < 2) return [];

    const headers = (jsonData[0] as string[]).map((h) => 
      String(h || "").trim().toLowerCase().replace(/['"]/g, "").replace(/\s+/g, "_")
    );

    return jsonData.slice(1).filter(row => row.some(cell => cell)).map((values) => {
      const row: Partial<MemberRow> = {};

      headers.forEach((header, index) => {
        const mappedKey = headerMap[header];
        if (mappedKey && values[index] !== undefined && values[index] !== null && values[index] !== "") {
          row[mappedKey] = String(values[index]);
        }
      });

      // Normalize dates
      if (row.start_date) row.start_date = normalizeDate(row.start_date);
      if (row.expiry_date) row.expiry_date = normalizeDate(row.expiry_date);
      if (row.last_visit_date) row.last_visit_date = normalizeDate(row.last_visit_date);
      if (row.payment_date) row.payment_date = normalizeDate(row.payment_date);
      
      // Clean phone number
      if (row.phone) row.phone = String(row.phone).replace(/\D/g, "").slice(-10);

      return row;
    });
  }, []);

  const parseCSV = useCallback((text: string): Partial<MemberRow>[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => 
      h.trim().toLowerCase().replace(/['"]/g, "").replace(/\s+/g, "_")
    );

    return lines.slice(1).filter(line => line.trim()).map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
      const row: Partial<MemberRow> = {};

      headers.forEach((header, index) => {
        const mappedKey = headerMap[header];
        if (mappedKey && values[index]) {
          row[mappedKey] = values[index];
        }
      });

      // Normalize dates
      if (row.start_date) row.start_date = normalizeDate(row.start_date);
      if (row.expiry_date) row.expiry_date = normalizeDate(row.expiry_date);
      if (row.last_visit_date) row.last_visit_date = normalizeDate(row.last_visit_date);
      if (row.payment_date) row.payment_date = normalizeDate(row.payment_date);
      
      // Clean phone number
      if (row.phone) row.phone = row.phone.replace(/\D/g, "").slice(-10);

      return row;
    });
  }, []);

  // Detect if file has attendance or payment data
  const hasAttendanceData = parsedData.some(r => r.data.total_visits || r.data.last_visit_date || r.data.check_in_dates);
  const hasPaymentData = parsedData.some(r => r.data.payment_amount);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const fileName = selectedFile.name.toLowerCase();
    const isCSV = fileName.endsWith(".csv");
    const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");

    if (!isCSV && !isExcel) {
      toast.error("Please upload a CSV or Excel file (.csv, .xlsx, .xls)");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setFile(selectedFile);
    setIsParsing(true);

    try {
      let rows: Partial<MemberRow>[];

      if (isExcel) {
        const buffer = await selectedFile.arrayBuffer();
        rows = parseExcel(buffer);
      } else {
        const text = await selectedFile.text();
        rows = parseCSV(text);
      }
      
      if (rows.length === 0) {
        toast.error("No data found in file. Please check the format.");
        setIsParsing(false);
        return;
      }

      // Basic validation
      const validatedRows: ParsedRow[] = rows.map((data, index) => {
        const errors: string[] = [];
        if (!data.full_name || data.full_name.trim().length < 2) errors.push("Name required");
        if (!data.phone || !/^\d{10}$/.test(data.phone)) errors.push("Valid 10-digit phone required");
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push("Invalid email");

        return { row: index + 2, data, isValid: errors.length === 0, errors };
      });

      setParsedData(validatedRows);

      // Detect extra data
      const hasAtt = rows.some(r => r.total_visits || r.last_visit_date || r.check_in_dates);
      const hasPay = rows.some(r => r.payment_amount);

      // Extract unique plan names
      const planCounts: Record<string, number> = {};
      rows.forEach(row => {
        const planName = row.plan_name?.trim();
        if (planName) {
          planCounts[planName] = (planCounts[planName] || 0) + 1;
        }
      });

      // Create detected plans with defaults
      const detected: DetectedPlan[] = Object.entries(planCounts).map(([name, count]) => {
        const existing = existingPlans.find(p => 
          p.name.toLowerCase() === name.toLowerCase()
        );
        
        return {
          name,
          memberCount: count,
          duration_days: existing?.duration_days || 30,
          price: existing?.price || 0,
          isNew: !existing,
          existingId: existing?.id,
        };
      });

      // If no plans found, add a default one
      if (detected.length === 0) {
        detected.push({
          name: "Monthly",
          memberCount: rows.length,
          duration_days: 30,
          price: 0,
          isNew: true,
        });
      }

      setDetectedPlans(detected);

      const extras: string[] = [];
      if (hasAtt) extras.push("attendance");
      if (hasPay) extras.push("payment");
      const extraMsg = extras.length > 0 ? ` (with ${extras.join(" & ")} data)` : "";

      toast.success(`Found ${rows.length} members${extraMsg} in ${isExcel ? "Excel" : "CSV"} file`);
      setStep("configure-plans");
    } catch (error: any) {
      toast.error("Failed to parse file: " + error.message);
    } finally {
      setIsParsing(false);
    }
  };

  const updatePlanConfig = (index: number, field: keyof DetectedPlan, value: string | number) => {
    setDetectedPlans(prev => prev.map((plan, i) => {
      if (i === index) {
        return { ...plan, [field]: value };
      }
      return plan;
    }));
  };

  const addNewPlan = () => {
    setDetectedPlans(prev => [...prev, {
      name: "",
      memberCount: 0,
      duration_days: 30,
      price: 0,
      isNew: true,
    }]);
  };

  const removePlan = (index: number) => {
    setDetectedPlans(prev => prev.filter((_, i) => i !== index));
  };

  const createPlansAndProceed = async () => {
    const invalidPlans = detectedPlans.filter(p => !p.name.trim() || p.duration_days <= 0 || p.price < 0);
    if (invalidPlans.length > 0) {
      toast.error("Please fill in all plan details (name, duration, price)");
      return;
    }

    const planIdMap: Record<string, string> = {};

    try {
      for (const plan of detectedPlans) {
        if (plan.existingId) {
          const { error } = await supabase
            .from("membership_plans")
            .update({ duration_days: plan.duration_days, price: plan.price })
            .eq("id", plan.existingId);
          
          if (error) throw error;
          planIdMap[plan.name.toLowerCase()] = plan.existingId;
        } else {
          const { data, error } = await supabase
            .from("membership_plans")
            .insert({
              gym_id: gymId,
              name: plan.name,
              duration_days: plan.duration_days,
              price: plan.price,
              is_active: true,
            })
            .select("id")
            .single();
          
          if (error) throw error;
          planIdMap[plan.name.toLowerCase()] = data.id;
        }
      }

      setCreatedPlanIds(planIdMap);
      
      const today = format(new Date(), "yyyy-MM-dd");
      
      const updatedRows = parsedData.map(row => {
        const planName = row.data.plan_name?.trim().toLowerCase() || detectedPlans[0]?.name.toLowerCase();
        const planId = planIdMap[planName];
        const plan = detectedPlans.find(p => p.name.toLowerCase() === planName);
        
        let startDate = row.data.start_date || today;
        let expiryDate = row.data.expiry_date;
        
        if (!expiryDate && plan) {
          expiryDate = format(addDays(new Date(startDate), plan.duration_days), "yyyy-MM-dd");
        }

        const errors: string[] = [];
        if (!row.data.full_name || row.data.full_name.trim().length < 2) errors.push("Name required");
        if (!row.data.phone || !/^\d{10}$/.test(row.data.phone)) errors.push("Valid phone required");
        if (!startDate) errors.push("Start date required");
        if (!expiryDate) errors.push("Expiry date required");

        return {
          ...row,
          planId,
          data: {
            ...row.data,
            plan_name: plan?.name || row.data.plan_name,
            start_date: startDate,
            expiry_date: expiryDate,
          },
          isValid: errors.length === 0,
          errors,
        };
      });

      setParsedData(updatedRows);
      queryClient.invalidateQueries({ queryKey: ["membership-plans"] });
      
      toast.success(`${detectedPlans.filter(p => p.isNew).length} new plans created!`);
      setStep("preview");
    } catch (error: any) {
      toast.error("Failed to create plans: " + error.message);
    }
  };

  const handleImport = async () => {
    const validRows = parsedData.filter((r) => r.isValid);
    if (validRows.length === 0) {
      toast.error("No valid rows to import");
      return;
    }

    setStep("importing");
    setIsImporting(true);
    setImportProgress(0);
    let success = 0;
    let failed = 0;
    let attendanceCount = 0;
    let paymentCount = 0;
    const importedMemberIds: string[] = [];
    const importedAttendanceIds: string[] = [];
    const importedPaymentIds: string[] = [];

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        // Calculate total_visits and last_visit_at from data
        const totalVisits = row.data.total_visits ? parseInt(row.data.total_visits) || 0 : 0;
        const lastVisitAt = row.data.last_visit_date || null;

        const { data: memberData, error } = await supabase.from("members").insert({
          gym_id: gymId,
          full_name: row.data.full_name,
          phone: row.data.phone,
          email: row.data.email || null,
          start_date: row.data.start_date,
          expiry_date: row.data.expiry_date,
          plan_id: row.planId || null,
          plan_name: row.data.plan_name || null,
          notes: row.data.notes || null,
          total_visits: totalVisits,
          last_visit_at: lastVisitAt,
        }).select("id").single();

        if (error) {
          if (error.message.includes("unique") || error.message.includes("duplicate")) {
            failed++;
          } else {
            throw error;
          }
        } else {
          success++;
          const memberId = memberData.id;
          importedMemberIds.push(memberId);

          // Import attendance records if check_in_dates provided
          if (row.data.check_in_dates) {
            const dates = row.data.check_in_dates.split(/[;|,]/).map(d => d.trim()).filter(Boolean);
            const attendanceRows = dates.map(dateStr => {
              const normalized = normalizeDate(dateStr);
              return {
                gym_id: gymId!,
                member_id: memberId,
                check_in_at: normalized ? `${normalized}T09:00:00` : new Date().toISOString(),
                source: "manual" as const,
                notes: "Imported via bulk import",
              };
            }).filter(a => a.check_in_at);

            if (attendanceRows.length > 0) {
              const { data: attData, error: attError } = await supabase.from("attendance").insert(attendanceRows).select("id");
              if (!attError && attData) {
                attendanceCount += attData.length;
                attData.forEach(a => importedAttendanceIds.push(a.id));
              }
            }
          }

          // Import payment record if payment_amount provided
          if (row.data.payment_amount) {
            const amount = parseFloat(row.data.payment_amount);
            if (amount > 0) {
              const payMode = normalizePaymentMode(row.data.payment_mode || "cash");
              const payDate = row.data.payment_date || row.data.start_date || format(new Date(), "yyyy-MM-dd");

              const { data: payData, error: payError } = await supabase.from("payments").insert({
                gym_id: gymId!,
                member_id: memberId,
                amount,
                payment_mode: payMode,
                status: "completed",
                plan_id: row.planId || null,
                plan_name: row.data.plan_name || null,
                new_start_date: row.data.start_date,
                new_expiry_date: row.data.expiry_date,
                notes: `Imported via bulk import${row.data.transaction_id ? ` (Ref: ${row.data.transaction_id})` : ""}`,
                transaction_id: row.data.transaction_id || null,
              }).select("id").single();
              if (!payError && payData) {
                paymentCount++;
                importedPaymentIds.push(payData.id);
              }
            }
          }
        }
      } catch (error) {
        failed++;
      }
      
      setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    // Log the import with tracked IDs for revert
    const newPlansCreated = detectedPlans.filter(p => p.isNew && !p.existingId).length;
    const fileExt = file?.name.split('.').pop()?.toLowerCase() || 'csv';
    
    await supabase.from("import_logs").insert({
      gym_id: gymId,
      file_name: file?.name || 'unknown',
      file_type: fileExt,
      total_rows: parsedData.length,
      success_count: success,
      failure_count: failed,
      plans_created: newPlansCreated,
      imported_member_ids: importedMemberIds,
      imported_attendance_ids: importedAttendanceIds,
      imported_payment_ids: importedPaymentIds,
    } as any);

    setImportResults({ success, failed, attendance: attendanceCount, payments: paymentCount });
    setIsImporting(false);
    setStep("complete");
    queryClient.invalidateQueries({ queryKey: ["members"] });
    queryClient.invalidateQueries({ queryKey: ["import-logs"] });
    queryClient.invalidateQueries({ queryKey: ["attendance"] });
    queryClient.invalidateQueries({ queryKey: ["payments"] });
  };

  const downloadCSVTemplate = () => {
    const template = `full_name,phone,email,plan_name,start_date,expiry_date,total_visits,last_visit_date,payment_amount,payment_mode,payment_date,transaction_id,notes
John Doe,9876543210,john@example.com,Monthly,2025-01-01,2025-02-01,12,2025-01-28,1000,upi,2025-01-01,TXN123,New member
Jane Smith,8765432109,,Quarterly,2025-01-15,2025-04-15,5,2025-01-20,2500,cash,2025-01-15,,
Mike Johnson,7654321098,mike@test.com,Annual,2025-01-01,2026-01-01,30,2025-02-01,8000,card,2025-01-01,REF456,VIP member`;
    
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "member_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadExcelTemplate = () => {
    const templateData = [
      ["full_name", "phone", "email", "plan_name", "start_date", "expiry_date", "total_visits", "last_visit_date", "payment_amount", "payment_mode", "payment_date", "transaction_id", "notes"],
      ["John Doe", "9876543210", "john@example.com", "Monthly", "2025-01-01", "2025-02-01", 12, "2025-01-28", 1000, "upi", "2025-01-01", "TXN123", "New member"],
      ["Jane Smith", "8765432109", "", "Quarterly", "2025-01-15", "2025-04-15", 5, "2025-01-20", 2500, "cash", "2025-01-15", "", ""],
      ["Mike Johnson", "7654321098", "mike@test.com", "Annual", "2025-01-01", "2026-01-01", 30, "2025-02-01", 8000, "card", "2025-01-01", "REF456", "VIP member"],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(templateData);

    ws["!cols"] = [
      { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 15 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 },
      { wch: 15 }, { wch: 14 }, { wch: 12 }, { wch: 15 }, { wch: 30 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Members");
    XLSX.writeFile(wb, "member_import_template.xlsx");
  };

  const reset = () => {
    setFile(null);
    setParsedData([]);
    setStep("upload");
    setImportProgress(0);
    setImportResults({ success: 0, failed: 0, attendance: 0, payments: 0 });
    setDetectedPlans([]);
    setCreatedPlanIds({});
  };

  const handleClose = () => {
    reset();
    setIsOpen(false);
  };

  const validCount = parsedData.filter((r) => r.isValid).length;
  const invalidCount = parsedData.filter((r) => !r.isValid).length;
  const newPlansCount = detectedPlans.filter(p => p.isNew && !p.existingId).length;
  const existingPlansCount = detectedPlans.filter(p => p.existingId).length;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)} className="hidden sm:flex">
        <Upload className="mr-2 h-4 w-4" />
        Bulk Import
      </Button>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Bulk Import Members
            </DialogTitle>
            <DialogDescription>
              {step === "upload" && "Upload a CSV or Excel file with member details, attendance & payment data"}
              {step === "configure-plans" && "Configure membership plans found in your file"}
              {step === "preview" && "Review and confirm import"}
              {step === "importing" && "Importing members..."}
              {step === "complete" && "Import completed!"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            {step === "upload" && (
              <div className="space-y-6">
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <div className="p-3 rounded-xl bg-green-500/10">
                      <Sheet className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="p-3 rounded-xl bg-blue-500/10">
                      <FileText className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="file-upload"
                      className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <Upload className="h-4 w-4" />
                      Choose File
                    </Label>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <p className="text-sm text-muted-foreground">
                      Supports <span className="font-medium text-green-600">Excel (.xlsx, .xls)</span> and <span className="font-medium text-blue-600">CSV</span> files
                    </p>
                  </div>
                  {isParsing && (
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Parsing file...</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Need a template?</p>
                    <p className="text-xs text-muted-foreground">Download with sample data including attendance & payments</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={downloadExcelTemplate} className="gap-2">
                      <Sheet className="h-4 w-4 text-green-600" />
                      Excel
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadCSVTemplate} className="gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      CSV
                    </Button>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Required columns:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li><code className="bg-muted px-1 rounded">full_name</code> or <code className="bg-muted px-1 rounded">name</code></li>
                    <li><code className="bg-muted px-1 rounded">phone</code> or <code className="bg-muted px-1 rounded">mobile</code></li>
                  </ul>
                  <p className="font-medium text-foreground mt-2">Optional columns:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li><code className="bg-muted px-1 rounded">plan_name</code> / <code className="bg-muted px-1 rounded">membership</code> - We'll detect & create plans</li>
                    <li><code className="bg-muted px-1 rounded">start_date</code>, <code className="bg-muted px-1 rounded">expiry_date</code>, <code className="bg-muted px-1 rounded">email</code>, <code className="bg-muted px-1 rounded">notes</code></li>
                  </ul>
                  <p className="font-medium text-foreground mt-2 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Attendance columns:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li><code className="bg-muted px-1 rounded">total_visits</code> / <code className="bg-muted px-1 rounded">visits</code> - Total visit count</li>
                    <li><code className="bg-muted px-1 rounded">last_visit_date</code> / <code className="bg-muted px-1 rounded">last_checkin</code></li>
                    <li><code className="bg-muted px-1 rounded">check_in_dates</code> - Semicolon-separated dates</li>
                  </ul>
                  <p className="font-medium text-foreground mt-2 flex items-center gap-1">
                    <CreditCard className="h-3.5 w-3.5" /> Payment columns:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li><code className="bg-muted px-1 rounded">payment_amount</code> / <code className="bg-muted px-1 rounded">amount_paid</code> / <code className="bg-muted px-1 rounded">fee</code></li>
                    <li><code className="bg-muted px-1 rounded">payment_mode</code> - cash, upi, card</li>
                    <li><code className="bg-muted px-1 rounded">payment_date</code> / <code className="bg-muted px-1 rounded">paid_on</code></li>
                    <li><code className="bg-muted px-1 rounded">transaction_id</code> / <code className="bg-muted px-1 rounded">ref_no</code></li>
                  </ul>
                  <p className="text-xs mt-3 text-muted-foreground">
                    💡 <span className="font-medium">Pro tip:</span> Export your existing member list from any software and upload directly!
                  </p>
                </div>
              </div>
            )}

            {step === "configure-plans" && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 flex-wrap p-4 bg-muted/50 rounded-lg">
                  <Badge variant="outline" className="gap-1">
                    <FileSpreadsheet className="h-3 w-3" />
                    {parsedData.length} members found
                  </Badge>
                  {newPlansCount > 0 && (
                    <Badge className="gap-1 bg-blue-500/10 text-blue-600 border-blue-500/20">
                      <Plus className="h-3 w-3" />
                      {newPlansCount} new plans
                    </Badge>
                  )}
                  {existingPlansCount > 0 && (
                    <Badge className="gap-1 bg-md-green/10 text-md-green border-md-green/20">
                      <CheckCircle className="h-3 w-3" />
                      {existingPlansCount} existing
                    </Badge>
                  )}
                  {hasAttendanceData && (
                    <Badge className="gap-1 bg-purple-500/10 text-purple-600 border-purple-500/20">
                      <Clock className="h-3 w-3" />
                      Attendance data
                    </Badge>
                  )}
                  {hasPaymentData && (
                    <Badge className="gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
                      <CreditCard className="h-3 w-3" />
                      Payment data
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Configure Membership Plans</Label>
                    <Button variant="outline" size="sm" onClick={addNewPlan}>
                      <Plus className="mr-1 h-4 w-4" />
                      Add Plan
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Set the duration and price for each plan. New plans will be created automatically.
                  </p>
                </div>

                <ScrollArea className="h-[350px]">
                  <div className="space-y-3 pr-4">
                    {detectedPlans.map((plan, index) => (
                      <Card key={index} className={plan.existingId ? "border-md-green/30 bg-md-green/5" : "border-blue-500/30 bg-blue-500/5"}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="flex-1 grid grid-cols-3 gap-4">
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Plan Name</Label>
                                <Input
                                  value={plan.name}
                                  onChange={(e) => updatePlanConfig(index, "name", e.target.value)}
                                  placeholder="e.g., Monthly"
                                  className="h-9"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Duration (days)</Label>
                                <Input
                                  type="number"
                                  value={plan.duration_days}
                                  onChange={(e) => updatePlanConfig(index, "duration_days", parseInt(e.target.value) || 0)}
                                  placeholder="30"
                                  min={1}
                                  className="h-9"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Price (₹)</Label>
                                <Input
                                  type="number"
                                  value={plan.price}
                                  onChange={(e) => updatePlanConfig(index, "price", parseFloat(e.target.value) || 0)}
                                  placeholder="1000"
                                  min={0}
                                  className="h-9"
                                />
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge variant="outline" className="text-xs">
                                {plan.memberCount} members
                              </Badge>
                              {detectedPlans.length > 1 && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => removePlan(index)}
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          {plan.existingId && (
                            <p className="text-xs text-md-green mt-2 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              This plan already exists - will update if changed
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex justify-between items-center pt-4 border-t">
                  <Button variant="outline" onClick={() => setStep("upload")}>
                    Back
                  </Button>
                  <Button onClick={createPlansAndProceed}>
                    Create Plans & Continue
                  </Button>
                </div>
              </div>
            )}

            {step === "preview" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="outline" className="gap-1">
                    <CheckCircle className="h-3 w-3 text-md-green" />
                    {validCount} valid
                  </Badge>
                  {invalidCount > 0 && (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="h-3 w-3" />
                      {invalidCount} errors
                    </Badge>
                  )}
                  {hasAttendanceData && (
                    <Badge variant="outline" className="gap-1 text-purple-600">
                      <Clock className="h-3 w-3" />
                      + Attendance
                    </Badge>
                  )}
                  {hasPaymentData && (
                    <Badge variant="outline" className="gap-1 text-amber-600">
                      <CreditCard className="h-3 w-3" />
                      + Payments
                    </Badge>
                  )}
                </div>

                <ScrollArea className="h-[400px] rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Row</TableHead>
                        <TableHead className="w-12">Status</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Start</TableHead>
                        <TableHead>Expiry</TableHead>
                        {hasAttendanceData && <TableHead>Visits</TableHead>}
                        {hasPaymentData && <TableHead>Payment</TableHead>}
                        <TableHead>Errors</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.map((row) => (
                        <TableRow key={row.row} className={row.isValid ? "" : "bg-destructive/5"}>
                          <TableCell className="font-mono text-xs">{row.row}</TableCell>
                          <TableCell>
                            {row.isValid ? (
                              <CheckCircle className="h-4 w-4 text-md-green" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{row.data.full_name || "-"}</TableCell>
                          <TableCell className="font-mono text-sm">{row.data.phone || "-"}</TableCell>
                          <TableCell>{row.data.plan_name || "-"}</TableCell>
                          <TableCell>{row.data.start_date || "-"}</TableCell>
                          <TableCell>{row.data.expiry_date || "-"}</TableCell>
                          {hasAttendanceData && (
                            <TableCell className="text-sm">
                              {row.data.total_visits || row.data.check_in_dates ? (
                                <span className="text-purple-600">
                                  {row.data.total_visits || "—"}
                                  {row.data.check_in_dates && ` (${row.data.check_in_dates.split(/[;|,]/).filter(Boolean).length} dates)`}
                                </span>
                              ) : "-"}
                            </TableCell>
                          )}
                          {hasPaymentData && (
                            <TableCell className="text-sm">
                              {row.data.payment_amount ? (
                                <span className="text-amber-600">
                                  ₹{row.data.payment_amount}
                                  {row.data.payment_mode && ` (${row.data.payment_mode})`}
                                </span>
                              ) : "-"}
                            </TableCell>
                          )}
                          <TableCell className="text-xs text-destructive max-w-[200px] truncate">
                            {row.errors.join("; ")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>

                <div className="flex justify-between items-center pt-4 border-t">
                  <Button variant="outline" onClick={() => setStep("configure-plans")}>
                    Back to Plans
                  </Button>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={handleClose}>
                      Cancel
                    </Button>
                    <Button onClick={handleImport} disabled={validCount === 0}>
                      Import {validCount} Members
                      {(hasAttendanceData || hasPaymentData) && " + Data"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {step === "importing" && (
              <div className="py-8 space-y-6 text-center">
                <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                <div>
                  <p className="text-lg font-medium">Importing members...</p>
                  <p className="text-sm text-muted-foreground">Including attendance & payment records where available</p>
                </div>
                <Progress value={importProgress} className="w-full" />
                <p className="text-sm text-muted-foreground">{importProgress}% complete</p>
              </div>
            )}

            {step === "complete" && (
              <div className="py-8 space-y-6 text-center">
                <CheckCircle className="h-16 w-16 mx-auto text-md-green" />
                <div>
                  <p className="text-xl font-semibold">Import Complete!</p>
                  <p className="text-muted-foreground mt-2">
                    Successfully imported <span className="text-md-green font-medium">{importResults.success}</span> members
                    {importResults.failed > 0 && (
                      <>, <span className="text-destructive font-medium">{importResults.failed}</span> failed</>
                    )}
                  </p>
                  {(importResults.attendance > 0 || importResults.payments > 0) && (
                    <div className="mt-3 flex items-center justify-center gap-4 text-sm">
                      {importResults.attendance > 0 && (
                        <span className="flex items-center gap-1 text-purple-600">
                          <Clock className="h-4 w-4" />
                          {importResults.attendance} attendance records
                        </span>
                      )}
                      {importResults.payments > 0 && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <CreditCard className="h-4 w-4" />
                          {importResults.payments} payment records
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {importResults.failed > 0 && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="h-4 w-4 text-md-yellow" />
                    Some rows failed (likely duplicates)
                  </div>
                )}
                <Button onClick={handleClose}>Done</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
