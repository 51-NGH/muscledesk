import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Database, HardDrive, Activity, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface LargestTable {
  table_name: string;
  size: string;
  size_bytes: number;
}

interface StorageStats {
  database_size_bytes: number;
  database_size_pretty: string;
  wal_size_bytes: number;
  wal_size_pretty: string;
  connections: number;
  max_connections: number;
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Storage
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
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <HardDrive className="h-4 w-4" /> Database Size
                </div>
                <p className="text-2xl font-bold">{data.database_size_pretty}</p>
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
