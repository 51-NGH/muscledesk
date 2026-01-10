import { useState, useRef } from "react";
import { useMemberAuth } from "@/contexts/MemberAuthContext";
import { MemberLayout } from "@/components/member-portal/MemberLayout";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Download, Maximize2, X, AlertTriangle } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";

export default function MemberQRCode() {
  const { member } = useMemberAuth();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  if (!member) return null;

  const expiryDate = parseISO(member.expiry_date);
  const isExpired = differenceInDays(expiryDate, new Date()) < 0;
  const isBlocked = member.is_blocked;
  const isInvalid = isExpired || isBlocked;

  const handleDownload = () => {
    const canvas = document.querySelector("#member-qr-code canvas") as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `${member.member_id}-qr-code.png`;
      link.href = url;
      link.click();
    }
  };

  const QRContent = ({ size = 200, showDetails = true }: { size?: number; showDetails?: boolean }) => (
    <div className="flex flex-col items-center">
      <div 
        id="member-qr-code"
        className={`p-4 bg-white rounded-2xl ${isInvalid ? "opacity-50 grayscale" : ""}`}
      >
        <QRCodeCanvas
          value={member.qr_token}
          size={size}
          level="H"
          includeMargin={false}
          bgColor="#FFFFFF"
          fgColor="#000000"
        />
      </div>
      {showDetails && (
        <div className="mt-4 text-center">
          <p className="font-mono text-sm text-muted-foreground">{member.member_id}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Scan at gym entrance
          </p>
        </div>
      )}
    </div>
  );

  return (
    <MemberLayout title="QR Code">
      <div className="space-y-6 animate-fade-in">
        {/* Warning for invalid QR */}
        {isInvalid && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive">QR Code Invalid</p>
              <p className="text-sm text-destructive/80 mt-1">
                {isBlocked 
                  ? "Your account has been blocked. Contact your gym."
                  : "Your membership has expired. Please renew to use check-in."}
              </p>
            </div>
          </div>
        )}

        {/* QR Code Card */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex flex-col items-center" ref={qrRef}>
            <QRContent />
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-xl"
              onClick={() => setIsFullscreen(true)}
              disabled={isInvalid}
            >
              <Maximize2 className="h-4 w-4 mr-2" />
              Fullscreen
            </Button>
            <Button
              className="flex-1 h-12 rounded-xl"
              onClick={handleDownload}
              disabled={isInvalid}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>

        {/* Member Info */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold mb-4">Member Details</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Name</span>
              <span className="font-medium">{member.full_name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Member ID</span>
              <span className="font-mono text-sm">{member.member_id}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Plan</span>
              <span>{member.plan_name || "Standard"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Valid Until</span>
              <span className={isExpired ? "text-destructive" : ""}>
                {format(expiryDate, "MMM d, yyyy")}
              </span>
            </div>
          </div>
        </div>

        {/* How to use */}
        <div className="bg-muted/50 rounded-xl p-4 border border-border">
          <h4 className="font-medium mb-2">How to Check In</h4>
          <ol className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded">1</span>
              <span>Open this page on your phone</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded">2</span>
              <span>Show the QR code to the scanner at entrance</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded">3</span>
              <span>Wait for confirmation beep</span>
            </li>
          </ol>
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
          onClick={() => setIsFullscreen(false)}
        >
          <button 
            className="absolute top-4 right-4 h-12 w-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            onClick={() => setIsFullscreen(false)}
          >
            <X className="h-6 w-6" />
          </button>
          <div className="text-center" onClick={(e) => e.stopPropagation()}>
            <div id="member-qr-code-fullscreen" className="p-6 bg-white rounded-3xl">
              <QRCodeCanvas
                value={member.qr_token}
                size={280}
                level="H"
                includeMargin={false}
                bgColor="#FFFFFF"
                fgColor="#000000"
              />
            </div>
            <p className="text-white font-mono text-lg mt-4">{member.member_id}</p>
            <p className="text-white/60 text-sm mt-1">{member.full_name}</p>
          </div>
        </div>
      )}
    </MemberLayout>
  );
}
