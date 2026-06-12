
CREATE OR REPLACE FUNCTION public.get_db_storage_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  _db_size bigint;
  _db_size_pretty text;
  _wal_size bigint;
  _largest jsonb;
  _connections int;
  _max_connections int;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT pg_database_size(current_database()) INTO _db_size;
  SELECT pg_size_pretty(_db_size) INTO _db_size_pretty;

  SELECT COALESCE(SUM((pg_stat_file('pg_wal/' || name)).size), 0)::bigint
  INTO _wal_size
  FROM pg_ls_waldir();

  SELECT jsonb_agg(t) INTO _largest FROM (
    SELECT
      schemaname || '.' || relname AS table_name,
      pg_size_pretty(pg_total_relation_size(c.oid)) AS size,
      pg_total_relation_size(c.oid) AS size_bytes
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_stat_user_tables s ON s.relid = c.oid
    WHERE c.relkind = 'r' AND n.nspname = 'public'
    ORDER BY pg_total_relation_size(c.oid) DESC
    LIMIT 10
  ) t;

  SELECT count(*) INTO _connections FROM pg_stat_activity;
  SELECT setting::int INTO _max_connections FROM pg_settings WHERE name = 'max_connections';

  RETURN jsonb_build_object(
    'database_size_bytes', _db_size,
    'database_size_pretty', _db_size_pretty,
    'wal_size_bytes', _wal_size,
    'wal_size_pretty', pg_size_pretty(_wal_size),
    'connections', _connections,
    'max_connections', _max_connections,
    'largest_tables', COALESCE(_largest, '[]'::jsonb),
    'measured_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_db_storage_stats() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_db_storage_stats() TO authenticated, service_role;
