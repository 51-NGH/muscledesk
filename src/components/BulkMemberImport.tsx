import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Loader2,
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

// Strict validation schema for member data
const memberSchema = z.object({
  full_name: z.string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens and apostrophes"),
  phone: z.string()
    .trim()
    .regex(/^\d{10}$/, "Phone must be exactly 10 digits"),
  email: z.string()
    .trim()
    .email("Invalid email format")
    .max(255)
    .optional()
    .or(z.literal("")),
  start_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  expiry_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  plan_name: z.string()
    .trim()
    .max(100)
    .optional()
    .or(z.literal("")),
  notes: z.string()
    .trim()
    .max(500, "Notes must be less than 500 characters")
    .optional()
    .or(z.literal("")),
});

type MemberRow = z.infer<typeof memberSchema>;

interface ParsedRow {
  row: number;
  data: Partial<MemberRow>;
  isValid: boolean;
  errors: string[];
}

interface BulkMemberImportProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BulkMemberImport({ isOpen, onClose }: BulkMemberImportProps) {
  const { gymId } = useAuth();
  const queryClient = useQueryClient();
  
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; failed: number }>({ success: 0, failed: 0 });
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "complete">("upload");

  const parseCSV = useCallback((text: string): Partial<MemberRow>[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => 
      h.trim().toLowerCase().replace(/['"]/g, "").replace(/\s+/g, "_")
    );

    // Map common header variations
    const headerMap: Record<string, keyof MemberRow> = {
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
    };

    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
      const row: Partial<MemberRow> = {};

      headers.forEach((header, index) => {
        const mappedKey = headerMap[header];
        if (mappedKey && values[index]) {
          row[mappedKey] = values[index];
        }
      });

      // Try to parse dates in various formats
      if (row.start_date) {
        row.start_date = normalizeDate(row.start_date);
      }
      if (row.expiry_date) {
        row.expiry_date = normalizeDate(row.expiry_date);
      }

      // Clean phone number
      if (row.phone) {
        row.phone = row.phone.replace(/\D/g, "").slice(-10);
      }

      return row;
    });
  }, []);

  const normalizeDate = (dateStr: string): string => {
    // Try various date formats
    const formats = [
      /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
      /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
      /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
      /^(\d{4})\/(\d{2})\/(\d{2})$/, // YYYY/MM/DD
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        if (format === formats[0]) return dateStr;
        if (format === formats[1] || format === formats[2]) {
          return `${match[3]}-${match[2]}-${match[1]}`;
        }
        if (format === formats[3]) {
          return `${match[1]}-${match[2]}-${match[3]}`;
        }
      }
    }
    return dateStr;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    // Validate file size (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setFile(selectedFile);
    setIsParsing(true);

    try {
      const text = await selectedFile.text();
      const rows = parseCSV(text);
      
      // Validate each row
      const validatedRows: ParsedRow[] = rows.map((data, index) => {
        const result = memberSchema.safeParse(data);
        if (result.success) {
          return {
            row: index + 2, // +2 for header row and 1-based index
            data: result.data,
            isValid: true,
            errors: [],
          };
        } else {
          return {
            row: index + 2,
            data,
            isValid: false,
            errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
          };
        }
      });

      setParsedData(validatedRows);
      setStep("preview");
    } catch (error: any) {
      toast.error("Failed to parse file: " + error.message);
    } finally {
      setIsParsing(false);
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

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        const { error } = await supabase.from("members").insert({
          gym_id: gymId,
          full_name: row.data.full_name,
          phone: row.data.phone,
          email: row.data.email || null,
          start_date: row.data.start_date,
          expiry_date: row.data.expiry_date,
          plan_name: row.data.plan_name || null,
          notes: row.data.notes || null,
        });

        if (error) {
          if (error.message.includes("unique") || error.message.includes("duplicate")) {
            // Mark as failed but continue
            failed++;
          } else {
            throw error;
          }
        } else {
          success++;
        }
      } catch (error) {
        failed++;
      }
      
      setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    setImportResults({ success, failed });
    setIsImporting(false);
    setStep("complete");
    queryClient.invalidateQueries({ queryKey: ["members"] });
  };

  const downloadTemplate = () => {
    const template = `full_name,phone,email,start_date,expiry_date,plan_name,notes
John Doe,9876543210,john@example.com,2025-01-01,2025-02-01,Monthly,New member
Jane Smith,8765432109,,2025-01-15,2025-04-15,Quarterly,`;
    
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "member_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFile(null);
    setParsedData([]);
    setStep("upload");
    setImportProgress(0);
    setImportResults({ success: 0, failed: 0 });
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const validCount = parsedData.filter((r) => r.isValid).length;
  const invalidCount = parsedData.filter((r) => !r.isValid).length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Import Members
          </DialogTitle>
          <DialogDescription>
            Import multiple members from a CSV file
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <div className="space-y-2">
                <Label
                  htmlFor="csv-upload"
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Choose CSV File
                </Label>
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <p className="text-sm text-muted-foreground">
                  or drag and drop your file here
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
                <p className="text-xs text-muted-foreground">Download our CSV template to get started</p>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </Button>
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Required columns:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li><code className="bg-muted px-1 rounded">full_name</code> - Member's full name</li>
                <li><code className="bg-muted px-1 rounded">phone</code> - 10-digit phone number</li>
                <li><code className="bg-muted px-1 rounded">start_date</code> - YYYY-MM-DD format</li>
                <li><code className="bg-muted px-1 rounded">expiry_date</code> - YYYY-MM-DD format</li>
              </ul>
              <p className="font-medium text-foreground mt-2">Optional columns:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li><code className="bg-muted px-1 rounded">email</code>, <code className="bg-muted px-1 rounded">plan_name</code>, <code className="bg-muted px-1 rounded">notes</code></li>
              </ul>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
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
              <span className="text-sm text-muted-foreground ml-auto">
                {file?.name}
              </span>
            </div>

            <ScrollArea className="h-[400px] rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Row</TableHead>
                    <TableHead className="w-12">Status</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Expiry Date</TableHead>
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
                      <TableCell>{row.data.start_date || "-"}</TableCell>
                      <TableCell>{row.data.expiry_date || "-"}</TableCell>
                      <TableCell className="text-xs text-destructive max-w-[200px] truncate">
                        {row.errors.join("; ")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex justify-between items-center pt-4">
              <Button variant="outline" onClick={reset}>
                Choose Different File
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleImport} disabled={validCount === 0}>
                  Import {validCount} Members
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
              <p className="text-sm text-muted-foreground">Please don't close this window</p>
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
      </DialogContent>
    </Dialog>
  );
}