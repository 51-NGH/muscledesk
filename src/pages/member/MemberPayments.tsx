import { useQuery } from "@tanstack/react-query";
import { useMemberAuth } from "@/contexts/MemberAuthContext";
import { MemberLayout } from "@/components/member-portal/MemberLayout";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { CreditCard, Calendar, Loader2, Receipt, IndianRupee } from "lucide-react";

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
  const { member } = useMemberAuth();

  const { data: payments, isLoading } = useQuery({
    queryKey: ["member-payments", member?.id],
    queryFn: async () => {
      if (!member) return [];
      
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("member_id", member.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as PaymentRecord[];
    },
    enabled: !!member,
  });

  const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

  return (
    <MemberLayout title="Payments">
      <div className="space-y-6 animate-fade-in">
        {/* Stats Header */}
        <div className="bg-gradient-to-br from-md-teal to-md-teal/80 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm">Total Paid</p>
              <div className="flex items-center gap-1 mt-1">
                <IndianRupee className="h-6 w-6" />
                <p className="text-4xl font-bold">{totalPaid.toLocaleString()}</p>
              </div>
            </div>
            <div className="h-14 w-14 rounded-xl bg-white/10 flex items-center justify-center">
              <CreditCard className="h-7 w-7" />
            </div>
          </div>
          <p className="text-white/70 text-sm mt-3">
            {payments?.length || 0} payment{(payments?.length || 0) !== 1 ? "s" : ""} on record
          </p>
        </div>

        {/* Payments History */}
        <div>
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            Payment History
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !payments || payments.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-8 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <CreditCard className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium">No payments yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your payment history will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div 
                  key={payment.id}
                  className="bg-card rounded-xl border border-border p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-md-teal/10 flex items-center justify-center">
                        <IndianRupee className="h-5 w-5 text-md-teal" />
                      </div>
                      <div>
                        <p className="font-medium">₹{Number(payment.amount).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {paymentModeLabels[payment.payment_mode] || payment.payment_mode}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        payment.status === "completed" 
                          ? "bg-md-green-light text-md-green" 
                          : payment.status === "pending"
                          ? "bg-md-orange-light text-md-orange"
                          : "bg-md-red-light text-md-red"
                      }`}>
                        {payment.status}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(parseISO(payment.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>

                  {/* Plan details */}
                  {(payment.plan_name || payment.new_expiry_date) && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex items-center gap-4 text-sm">
                        {payment.plan_name && (
                          <div className="flex items-center gap-1.5">
                            <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">{payment.plan_name}</span>
                          </div>
                        )}
                        {payment.new_expiry_date && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
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
          <p className="text-sm text-muted-foreground text-center">
            Payments are recorded by your gym when you renew your membership.
            Contact your gym for any discrepancies.
          </p>
        </div>
      </div>
    </MemberLayout>
  );
}
