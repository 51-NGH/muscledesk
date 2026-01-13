import { useQuery } from "@tanstack/react-query";
import { useMemberAuth } from "@/contexts/MemberAuthContext";
import { MemberLayout } from "@/components/member-portal/MemberLayout";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { CreditCard, Calendar, Loader2, Receipt, IndianRupee, AlertCircle } from "lucide-react";

interface PaymentRecord {
  id: string;
  amount: number;
  payment_mode: string;
  status: string;
  plan_name: string | null;
  new_start_date: string | null;
  new_expiry_date: string | null;
  created_at: string;
  notes: string | null;
}

const paymentModeLabels: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
  bank_transfer: "Bank Transfer",
  other: "Other",
};

export default function MemberPayments() {
  const { member, loading, memberLoading } = useMemberAuth();

  const { data: payments, isLoading, error } = useQuery({
    queryKey: ["member-payments", member?.id],
    queryFn: async () => {
      if (!member) return [];
      
      // Use edge function with service role to bypass RLS
      const { data, error } = await supabase.functions.invoke("member-auth", {
        body: { action: "get-payments", member_id: member.id, limit: 50 }
      });

      if (error) {
        console.error("Error fetching payments:", error);
        throw new Error("Failed to fetch payments");
      }

      return (data?.payments || []) as PaymentRecord[];
    },
    enabled: !!member,
    retry: 2,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

  // Show loading state
  if (loading || memberLoading || !member) {
    return (
      <MemberLayout title="Payments">
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            <p className="text-muted-foreground">Loading payments...</p>
          </div>
        </div>
      </MemberLayout>
    );
  }

  return (
    <MemberLayout title="Payments">
      <div className="space-y-5 animate-fade-in">
        {/* Stats Header */}
        <div className="bg-gradient-to-br from-[hsl(var(--md-teal))] to-[hsl(var(--md-teal))]/80 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm">Total Paid</p>
              <div className="flex items-center gap-1 mt-1">
                <IndianRupee className="h-5 w-5 sm:h-6 sm:w-6" />
                <p className="text-3xl sm:text-4xl font-bold">{totalPaid.toLocaleString()}</p>
              </div>
            </div>
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-white/10 flex items-center justify-center">
              <CreditCard className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
          </div>
          <p className="text-white/70 text-xs sm:text-sm mt-3">
            {payments?.length || 0} payment{(payments?.length || 0) !== 1 ? "s" : ""} on record
          </p>
        </div>

        {/* Payments History */}
        <div>
          <h2 className="font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
            <Receipt className="h-4 w-4 text-primary" />
            Payment History
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="bg-card rounded-xl border border-destructive/20 p-6 sm:p-8 text-center">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <p className="font-medium text-sm sm:text-base text-destructive">Failed to load payments</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Please try again later or contact support
              </p>
            </div>
          ) : !payments || payments.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-6 sm:p-8 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <CreditCard className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium text-sm sm:text-base">No payments yet</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Your payment history will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment, index) => (
                <div 
                  key={payment.id}
                  className="bg-card rounded-xl border border-border p-4 animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-[hsl(var(--md-teal))]/10 flex items-center justify-center shrink-0">
                        <IndianRupee className="h-4 w-4 sm:h-5 sm:w-5 text-[hsl(var(--md-teal))]" />
                      </div>
                      <div>
                        <p className="font-medium text-sm sm:text-base">₹{Number(payment.amount).toLocaleString()}</p>
                        <p className="text-[11px] sm:text-xs text-muted-foreground">
                          {paymentModeLabels[payment.payment_mode] || payment.payment_mode}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${
                        payment.status === "completed" 
                          ? "bg-[hsl(var(--md-green-light))] text-[hsl(var(--md-green))]" 
                          : payment.status === "pending"
                          ? "bg-[hsl(var(--md-orange-light))] text-[hsl(var(--md-orange))]"
                          : "bg-[hsl(var(--md-red-light))] text-[hsl(var(--md-red))]"
                      }`}>
                        {payment.status}
                      </span>
                      <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">
                        {format(parseISO(payment.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>

                  {/* Plan details */}
                  {(payment.plan_name || payment.new_expiry_date) && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                        {payment.plan_name && (
                          <div className="flex items-center gap-1.5">
                            <CreditCard className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">{payment.plan_name}</span>
                          </div>
                        )}
                        {payment.new_expiry_date && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              Valid till {format(parseISO(payment.new_expiry_date), "MMM d, yyyy")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Note */}
        <div className="bg-muted/50 rounded-xl p-4 border border-border">
          <p className="text-xs sm:text-sm text-muted-foreground text-center">
            Payments are recorded by your gym when you renew your membership.
            Contact your gym for any discrepancies.
          </p>
        </div>
      </div>
    </MemberLayout>
  );
}