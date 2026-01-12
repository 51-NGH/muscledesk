import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useExpiringMembers } from "@/hooks/useGymData";
import { AlertCircle, MessageCircle } from "lucide-react";
import { differenceInDays, parseISO, format } from "date-fns";
import { cn } from "@/lib/utils";

type TemplateType = "renewal" | "expired" | "followup";

interface MessageTemplate {
  id: TemplateType;
  label: string;
  getMessage: (name: string, daysRemaining: number) => string;
}

const messageTemplates: MessageTemplate[] = [
  {
    id: "renewal",
    label: "Renewal",
    getMessage: (name, daysRemaining) => {
      if (daysRemaining < 0) {
        return `Hi ${name}, Your membership expired ${Math.abs(daysRemaining)} days ago. Renew now to continue your fitness journey!`;
      }
      return `Hi ${name}, Your membership expires in ${daysRemaining} days. Renew now to continue your fitness journey!`;
    },
  },
  {
    id: "expired",
    label: "Expired",
    getMessage: (name) => `Hi ${name}, Your membership has expired. Get back on track with a fresh renewal!`,
  },
  {
    id: "followup",
    label: "Followup",
    getMessage: (name) => `Hi ${name}, We miss you! Your membership expires soon. Reply to renew.`,
  },
];

const Reminders = () => {
  const { data: expiringMembers = [], isLoading } = useExpiringMembers(30);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>("renewal");

  // Get all members who are expired or expiring soon (within 7 days)
  const relevantMembers = useMemo(() => {
    const today = new Date();
    return expiringMembers.filter((member) => {
      const expiryDate = parseISO(member.expiry_date);
      const daysRemaining = differenceInDays(expiryDate, today);
      return daysRemaining <= 7; // Show expiring within 7 days or already expired
    }).sort((a, b) => {
      // Sort by days remaining (most urgent first)
      const daysA = differenceInDays(parseISO(a.expiry_date), today);
      const daysB = differenceInDays(parseISO(b.expiry_date), today);
      return daysA - daysB;
    });
  }, [expiringMembers]);

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const getSelectedMember = () => {
    if (selectedMembers.length === 0) return null;
    return relevantMembers.find((m) => m.id === selectedMembers[0]);
  };

  const formatPhoneForWhatsApp = (phone: string) => {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, "");
    // Add India country code if not present
    if (!cleaned.startsWith("91") && cleaned.length === 10) {
      cleaned = "91" + cleaned;
    }
    return cleaned;
  };

  const getWhatsAppLink = (phone: string, message: string) => {
    const formattedPhone = formatPhoneForWhatsApp(phone);
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
  };

  const getDaysAgoText = (expiryDate: string) => {
    const today = new Date();
    const expiry = parseISO(expiryDate);
    const days = differenceInDays(today, expiry);
    
    if (days > 0) {
      return `${days}d ago`;
    } else if (days === 0) {
      return "Today";
    } else {
      return `in ${Math.abs(days)}d`;
    }
  };

  const getDaysRemaining = (expiryDate: string) => {
    const today = new Date();
    const expiry = parseISO(expiryDate);
    return differenceInDays(expiry, today);
  };

  const getStatusText = (expiryDate: string) => {
    const daysRemaining = getDaysRemaining(expiryDate);
    if (daysRemaining < 0) {
      return `Expired ${Math.abs(daysRemaining)} days ago`;
    } else if (daysRemaining === 0) {
      return "Expires today";
    } else {
      return `Expires in ${daysRemaining} days`;
    }
  };

  const selectedMember = getSelectedMember();
  const currentTemplate = messageTemplates.find((t) => t.id === selectedTemplate)!;
  const previewMessage = selectedMember
    ? currentTemplate.getMessage(
        selectedMember.full_name.split(" ")[0],
        getDaysRemaining(selectedMember.expiry_date)
      )
    : currentTemplate.getMessage("Member", 0);

  const handleOpenWhatsApp = () => {
    if (selectedMembers.length === 0) return;

    // Open WhatsApp for each selected member
    selectedMembers.forEach((memberId, index) => {
      const member = relevantMembers.find((m) => m.id === memberId);
      if (member) {
        const message = currentTemplate.getMessage(
          member.full_name.split(" ")[0],
          getDaysRemaining(member.expiry_date)
        );
        const link = getWhatsAppLink(member.phone, message);
        
        // Small delay between opening multiple tabs
        setTimeout(() => {
          window.open(link, "_blank");
        }, index * 300);
      }
    });
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Renewal Reminders"
        description="Send WhatsApp reminders to members with expiring memberships."
      />

      {/* Alert Banner */}
      {relevantMembers.length > 0 && (
        <Alert className="mb-6 border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30">
          <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <AlertTitle className="text-orange-800 dark:text-orange-300">
            {relevantMembers.length} member{relevantMembers.length !== 1 ? "s" : ""} have expiring memberships
          </AlertTitle>
          <AlertDescription className="text-orange-700 dark:text-orange-400">
            Send reminders to help retain your members
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Members List - Left Side */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Expiring Members</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : relevantMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No members with expiring memberships</p>
                <p className="text-sm">All your members are up to date!</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {relevantMembers.map((member) => {
                    const daysRemaining = getDaysRemaining(member.expiry_date);
                    const isExpired = daysRemaining < 0;
                    const isSelected = selectedMembers.includes(member.id);

                    return (
                      <div
                        key={member.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        )}
                        onClick={() => toggleMember(member.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleMember(member.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div>
                            <p className="font-medium text-foreground">
                              {member.full_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {getStatusText(member.expiry_date)}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-medium",
                            isExpired
                              ? "border-destructive/50 bg-destructive/10 text-destructive"
                              : "border-orange-500/50 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                          )}
                        >
                          {getDaysAgoText(member.expiry_date)}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Message Templates - Right Side */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Message Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Template Buttons */}
            <div className="space-y-2">
              {messageTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  className={cn(
                    "w-full px-4 py-3 rounded-lg text-left font-medium transition-all",
                    selectedTemplate === template.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  )}
                >
                  {template.label}
                </button>
              ))}
            </div>

            {/* Preview Section */}
            <div className="pt-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Preview
              </p>
              <div className="bg-muted/50 rounded-lg p-4 text-sm text-foreground border">
                {previewMessage}
              </div>
            </div>

            {/* WhatsApp Button */}
            <Button
              onClick={handleOpenWhatsApp}
              disabled={selectedMembers.length === 0}
              className="w-full mt-4 bg-[#25D366] hover:bg-[#20BD5A] text-white"
              size="lg"
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              Open WhatsApp ({selectedMembers.length})
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Opens WhatsApp with pre-filled message
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Reminders;
