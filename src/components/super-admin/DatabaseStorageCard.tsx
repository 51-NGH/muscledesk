import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Database, HardDrive, Activity, RefreshCw, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface LargestTable {
  table_name: string;
  size: string;
  size_bytes: number;
}

interface PlanLimit {
  plan: string;
  member_limit: number;
  gym_count: number;
  member_count: number;
}

interface StorageStats {
  database_size_bytes: number;
  database_size_pretty: string;
  disk_capacity_bytes: number;
  disk_capacity_pretty: string;
  disk_used_pct: number;
  wal_size_bytes: number;
  wal_size_pretty: string;
  connections: number;
  max_connections: number;
  total_members: number;
  max_members: number;
  total_gyms: number;
  avg_bytes_per_member: number;
  avg_per_member_pretty: string;
  plan_limits: PlanLimit[];
  largest_tables: LargestTable[];
  measured_at: string;
}

export function DatabaseStorageCard() {
  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["db-storage-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_db_storage_stats");
      if (error) throw error;
      return data as unknown as StorageStats;
    },
    refetchInterval: 60_000,
  });

  const connPct = data ? Math.round((data.connections / data.max_connections) * 100) : 0;
  const memberPct = data && data.max_members > 0 ? Math.round((data.total_members / data.max_members) * 100) : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Storage & Capacity
          </CardTitle>
          <CardDescription>
            {data ? `Updated ${formatDistanceToNow(new Date(data.measured_at), { addSuffix: true })}` : "Live database metrics"}
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : error ? (
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        ) : data ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <HardDrive className="h-4 w-4" /> Database Storage
                </div>
                <p className="text-2xl font-bold">
                  {data.database_size_pretty}
                  <span className="text-base text-muted-foreground font-normal"> / {data.disk_capacity_pretty}</span>
                </p>
                <Progress value={data.disk_used_pct} className="h-1.5 mt-2" />
                <p className="text-xs text-muted-foreground mt-1">{data.disk_used_pct}% used</p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Users className="h-4 w-4" /> Members Capacity
                </div>
                <p className="text-2xl font-bold">
                  {data.total_members.toLocaleString()}
                  <span className="text-base text-muted-foreground font-normal"> / {data.max_members.toLocaleString()}</span>
                </p>
                <Progress value={memberPct} className="h-1.5 mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {memberPct}% used across {data.total_gyms} {data.total_gyms === 1 ? "gym" : "gyms"}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Database className="h-4 w-4" /> WAL Size
                </div>
                <p className="text-2xl font-bold">{data.wal_size_pretty}</p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Activity className="h-4 w-4" /> Connections
                </div>
                <p className="text-2xl font-bold">
                  {data.connections}<span className="text-base text-muted-foreground">/{data.max_connections}</span>
                </p>
                <Progress value={connPct} className="h-1.5 mt-2" />
              </div>
            </div>

            <div className="rounded-lg border p-4 bg-muted/30">
              <h4 className="text-sm font-semibold mb-1">Per-Member Storage Footprint</h4>
              <p className="text-xs text-muted-foreground mb-2">
                Average size of one member row (incl. indexes) in the <code>members</code> table.
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{data.avg_per_member_pretty}</span>
                <span className="text-xs text-muted-foreground">per member</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Cloud disk capacity: <strong>{data.disk_capacity_pretty}</strong> · Theoretical max members at this size:{" "}
                <strong>
                  {data.avg_bytes_per_member > 0
                    ? Math.floor(data.disk_capacity_bytes / data.avg_bytes_per_member).toLocaleString()
                    : "—"}
                </strong>
              </p>
            </div>

            {data.plan_limits.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Plan Tier Capacity</h4>
                <div className="space-y-2">
                  {data.plan_limits.map((p) => {
                    const cap = p.gym_count * p.member_limit;
                    const pct = cap > 0 ? Math.min(100, Math.round((p.member_count / cap) * 100)) : 0;
                    const limitLabel = p.member_limit >= 999999 ? "Unlimited" : p.member_limit.toLocaleString();
                    return (
                      <div key={p.plan} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold capitalize">{p.plan}</span>
                            <span className="text-xs text-muted-foreground">
                              {p.gym_count} {p.gym_count === 1 ? "gym" : "gyms"} · {limitLabel} members/gym
                            </span>
                          </div>
                          <span className="text-sm font-mono">
                            {p.member_count.toLocaleString()}
                            {cap > 0 && p.member_limit < 999999 && (
                              <span className="text-muted-foreground"> / {cap.toLocaleString()}</span>
                            )}
                          </span>
                        </div>
                        {cap > 0 && p.member_limit < 999999 && <Progress value={pct} className="h-1.5" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}



            {data.largest_tables.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Largest Tables</h4>
                <div className="space-y-1">
                  {data.largest_tables.map((t) => {
                    const pct = Math.min(100, Math.round((t.size_bytes / data.database_size_bytes) * 100));
                    return (
                      <div key={t.table_name} className="flex items-center gap-3 text-sm">
                        <span className="w-56 truncate font-mono text-xs">{t.table_name}</span>
                        <Progress value={pct} className="h-2 flex-1" />
                        <span className="w-20 text-right text-muted-foreground">{t.size}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
