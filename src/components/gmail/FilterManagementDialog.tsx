import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus } from "lucide-react";
import { useEmailLeadFilters, useCreateEmailFilter, useDeleteEmailFilter } from "@/hooks/useEmailLeads";

interface FilterManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FilterManagementDialog({ open, onOpenChange }: FilterManagementDialogProps) {
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("both");

  const { data: filters = [] } = useEmailLeadFilters();
  const createFilter = useCreateEmailFilter();
  const deleteFilter = useDeleteEmailFilter();

  const handleAdd = async () => {
    if (!keyword.trim()) return;
    await createFilter.mutateAsync({ keyword: keyword.trim(), filter_location: location });
    setKeyword("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lead Filter Rules</DialogTitle>
          <DialogDescription>
            Define keywords to identify potential leads from your emails.
            Emails matching these rules will be automatically captured as leads.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new filter */}
          <div className="space-y-2">
            <Label>Add Keyword</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. membership, pricing..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                className="flex-1"
              />
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Both</SelectItem>
                  <SelectItem value="subject">Subject</SelectItem>
                  <SelectItem value="body">Body</SelectItem>
                </SelectContent>
              </Select>
              <Button size="icon" onClick={handleAdd} disabled={!keyword.trim() || createFilter.isPending}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Existing filters */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Active Filters ({filters.length})</Label>
            {filters.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3 text-center">
                No filters configured. Default keywords (membership, pricing, etc.) will be used.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {filters.map((filter) => (
                  <div key={filter.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{filter.keyword}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {filter.filter_location}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => deleteFilter.mutate(filter.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            💡 Default keywords used when no custom filters are set: membership, join gym, enquiry, 
            price, fees, trial, fitness
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
