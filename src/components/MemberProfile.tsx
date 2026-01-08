import { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Member, usePayments } from "@/hooks/useGymData";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  Phone,
  Mail,
  Calendar,
  ArrowLeft,
  Download,
  CreditCard,
  Edit,
  Clock,
  IndianRupee,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MemberProfileProps {
  member: Member;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (member: Member) => void;
  onRecordPayment?: (member: Member) => void;
}

export function MemberProfile({
  member,
  isOpen,
  onClose,
  onEdit,
  onRecordPayment,
}: MemberProfileProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const qrRef = useRef<HTMLDivElement>(null);
  const { data: allPayments = [] } = usePayments();

  const memberPayments = allPayments.filter((p) => p.member_id === member.id);
  const totalPaid = memberPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  const handleDownloadQR = () => {
    if (!qrRef.current) return;
    
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const data = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    
    canvas.width = 300;
    canvas.height = 300;
    
    img.onload = () => {
      ctx?.drawImage(img, 0, 0, 300, 300);
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${member.member_id}-qrcode.png`;
      a.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(data)));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6 border-b border-border">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">Member Profile</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">View and manage member details</p>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Left Column - Profile Card */}
            <div className="space-y-4 sm:space-y-6">
              {/* Profile Info Card */}
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex flex-col items-center text-center mb-6">
                  <MemberAvatar name={member.full_name} size="xl" />
                  <h3 className="mt-4 text-xl font-semibold text-foreground">{member.full_name}</h3>
                  <p className="text-sm text-muted-foreground font-mono">ID: {member.member_id}</p>
                  <div className="mt-2">
                    <StatusBadge status={member.is_blocked ? "blocked" : member.status} />
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{member.phone}</span>
                  </div>
                  {member.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{member.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Joined {format(new Date(member.start_date), "d/M/yyyy")}</span>
                  </div>
                </div>

                <Button 
                  className="w-full mt-6" 
                  onClick={() => onRecordPayment?.(member)}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Record Payment
                </Button>
              </div>

              {/* QR Code Card */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h4 className="font-semibold text-foreground mb-4">Member QR Code</h4>
                <div 
                  ref={qrRef}
                  className="flex justify-center p-4 rounded-lg border border-border bg-white"
                >
                  <QRCodeSVG
                    value={member.qr_token}
                    size={180}
                    level="H"
                    includeMargin
                  />
                </div>
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={handleDownloadQR}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download QR Code
                </Button>
              </div>
            </div>

            {/* Right Column - Stats & Tabs */}
            <div className="space-y-6">
              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full grid grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="memberships">Memberships</TabsTrigger>
                  <TabsTrigger value="payments">Payments</TabsTrigger>
                  <TabsTrigger value="attendance">Attendance</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4 space-y-4">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-3">
                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="text-xs text-muted-foreground">Total Visits</p>
                      <p className="text-xl font-bold text-foreground">{member.total_visits}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="text-xs text-muted-foreground">Total Paid</p>
                      <p className="text-xl font-bold text-foreground">₹{totalPaid.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="text-xs text-muted-foreground">Memberships</p>
                      <p className="text-xl font-bold text-foreground">{memberPayments.length || 1}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="text-xs text-muted-foreground">Last Visit</p>
                      <p className="text-xl font-bold text-foreground">
                        {member.last_visit_at ? format(new Date(member.last_visit_at), "d/M/yyyy") : "-"}
                      </p>
                    </div>
                  </div>

                  {/* Current Membership */}
                  <div>
                    <h4 className="font-semibold text-foreground mb-3">Current Membership</h4>
                    <div className="rounded-lg border border-md-green/30 bg-md-green/5 p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{member.plan_name || "Standard Plan"}</p>
                        <p className="text-sm text-muted-foreground">
                          Expires: {format(new Date(member.expiry_date), "d/M/yyyy")}
                        </p>
                      </div>
                      {member.custom_price && (
                        <p className="text-lg font-bold text-md-green">₹{member.custom_price}</p>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {member.notes && (
                    <div>
                      <h4 className="font-semibold text-foreground mb-3">Notes</h4>
                      <div className="rounded-lg border border-border bg-muted/50 p-4">
                        <p className="text-sm text-muted-foreground">{member.notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={() => onEdit(member)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Member
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="memberships" className="mt-4">
                  <div className="rounded-lg border border-border">
                    <div className="p-4 border-b border-border">
                      <h4 className="font-semibold text-foreground">Membership History</h4>
                    </div>
                    {memberPayments.length === 0 ? (
                      <div className="p-8 text-center">
                        <CreditCard className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">No membership renewals yet</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {memberPayments
                          .filter((p) => p.plan_name)
                          .map((payment) => (
                            <div key={payment.id} className="p-4 flex items-center justify-between">
                              <div>
                                <p className="font-medium text-foreground">{payment.plan_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {payment.new_start_date && format(new Date(payment.new_start_date), "d MMM yyyy")} - {payment.new_expiry_date && format(new Date(payment.new_expiry_date), "d MMM yyyy")}
                                </p>
                              </div>
                              <p className="font-semibold text-foreground">₹{payment.amount}</p>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="payments" className="mt-4">
                  <div className="rounded-lg border border-border">
                    <div className="p-4 border-b border-border">
                      <h4 className="font-semibold text-foreground">Payment History</h4>
                    </div>
                    {memberPayments.length === 0 ? (
                      <div className="p-8 text-center">
                        <IndianRupee className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">No payments recorded</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {memberPayments.map((payment) => (
                          <div key={payment.id} className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {payment.status === "completed" ? (
                                <CheckCircle2 className="h-5 w-5 text-md-green" />
                              ) : (
                                <XCircle className="h-5 w-5 text-destructive" />
                              )}
                              <div>
                                <p className="font-medium text-foreground">
                                  {payment.plan_name || "Payment"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(payment.created_at), "d MMM yyyy, h:mm a")}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-foreground">₹{payment.amount}</p>
                              <p className="text-xs text-muted-foreground capitalize">{payment.payment_mode}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="attendance" className="mt-4">
                  <div className="rounded-lg border border-border">
                    <div className="p-4 border-b border-border">
                      <h4 className="font-semibold text-foreground">Recent Attendance</h4>
                    </div>
                    <div className="p-8 text-center">
                      <Clock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                      <p className="text-foreground font-medium mb-1">{member.total_visits} Total Visits</p>
                      <p className="text-sm text-muted-foreground">
                        {member.last_visit_at 
                          ? `Last visited on ${format(new Date(member.last_visit_at), "d MMM yyyy")}`
                          : "No visits recorded yet"
                        }
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
