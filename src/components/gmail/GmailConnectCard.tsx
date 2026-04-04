import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Shield, Zap, ArrowRight } from "lucide-react";
import { useConnectGmail } from "@/hooks/useGmailIntegration";

export function GmailConnectCard() {
  const { connect, isConnecting } = useConnectGmail();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="border-2 border-dashed">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto p-4 rounded-full bg-primary/10 w-fit mb-4">
            <Mail className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Connect Your Gmail</CardTitle>
          <CardDescription className="text-base mt-2">
            Turn your inbox into a lead generation machine. MuscleDesk will
            automatically scan your emails and convert inquiries into actionable leads.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 shrink-0">
                <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Auto-Capture Leads</p>
                <p className="text-sm text-muted-foreground">
                  Emails containing keywords like "membership", "pricing", "join" are
                  automatically converted into leads.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 shrink-0">
                <ArrowRight className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Reply from MuscleDesk</p>
                <p className="text-sm text-muted-foreground">
                  Respond to leads directly from the platform. Every reply is tracked
                  in the conversation thread.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 shrink-0">
                <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Secure & Private</p>
                <p className="text-sm text-muted-foreground">
                  OAuth 2.0 authentication. We only read emails that match your
                  configured lead filters.
                </p>
              </div>
            </div>
          </div>

          <Button
            className="w-full gap-2"
            size="lg"
            onClick={connect}
            disabled={isConnecting}
          >
            <Mail className="h-5 w-5" />
            {isConnecting ? "Connecting..." : "Connect Gmail Account"}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            You can disconnect at any time from Settings → Integrations
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
