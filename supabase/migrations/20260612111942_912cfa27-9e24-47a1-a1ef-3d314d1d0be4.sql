CREATE OR REPLACE FUNCTION public.get_db_storage_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  _db_size bigint;
  _wal_size bigint := 0;
  _largest jsonb;
  _connections int;
  _max_connections int;
  _disk_capacity bigint := 1610612736; -- ~1.5 GB Lovable Cloud default data disk
  _total_members bigint;
  _max_members bigint;
  _total_gyms bigint;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT pg_database_size(current_database()) INTO _db_size;

  BEGIN
    SELECT COALESCE(SUM(size), 0)::bigint INTO _wal_size FROM pg_ls_waldir();
  EXCEPTION WHEN insufficient_privilege OR undefined_function THEN
    _wal_size := NULL;
  END;

  SELECT jsonb_agg(t) INTO _largest FROM (
    SELECT
      n.nspname || '.' || c.relname AS table_name,
      pg_size_pretty(pg_total_relation_size(c.oid)) AS size,
      pg_total_relation_size(c.oid) AS size_bytes
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' AND n.nspname = 'public'
    ORDER BY pg_total_relation_size(c.oid) DESC
    LIMIT 10
  ) t;

  SELECT count(*) INTO _connections FROM pg_stat_activity;
  SELECT setting::int INTO _max_connections FROM pg_settings WHERE name = 'max_connections';

  SELECT COUNT(*) INTO _total_members FROM public.members WHERE deleted_at IS NULL;
  SELECT COUNT(*) INTO _total_gyms FROM public.gyms WHERE deleted_at IS NULL;
  SELECT COALESCE(SUM(pl.member_limit), 0) INTO _max_members
    FROM public.gyms g JOIN public.plan_limits pl ON pl.plan = g.plan
    WHERE g.deleted_at IS NULL;

  RETURN jsonb_build_object(
    'database_size_bytes', _db_size,
    'database_size_pretty', pg_size_pretty(_db_size),
    'disk_capacity_bytes', _disk_capacity,
    'disk_capacity_pretty', pg_size_pretty(_disk_capacity),
    'disk_used_pct', ROUND((_db_size::numeric / _disk_capacity) * 100, 1),
    'wal_size_bytes', _wal_size,
    'wal_size_pretty', CASE WHEN _wal_size IS NULL THEN 'n/a' ELSE pg_size_pretty(_wal_size) END,
    'connections', _connections,
    'max_connections', _max_connections,
    'total_members', _total_members,
    'max_members', _max_members,
    'total_gyms', _total_gyms,
    'largest_tables', COALESCE(_largest, '[]'::jsonb),
    'measured_at', now()
  );
END;
$function$;