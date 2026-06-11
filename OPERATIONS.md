# Operations Guide

This document covers health monitoring, incident recovery, backup & restore, production checklist, and maintenance procedures.

---

## 1. Health Monitoring

### Health Endpoint

```
GET /api/health
```

Returns `{ status: "ok", timestamp: "..." }` with HTTP 200. Suitable for load-balancer health checks.

### Key Metrics to Monitor

| Metric | Warning Threshold | Critical Threshold |
|--------|------------------|-------------------|
| API response time (p95) | > 500 ms | > 2 s |
| API error rate (5xx) | > 1% | > 5% |
| Database connection pool | > 70% used | > 90% used |
| Disk usage | > 70% | > 85% |
| Memory usage | > 75% | > 90% |
| Active refresh tokens (stale) | > 10,000 | > 50,000 |

### Recommended Monitoring Stack

- **Uptime**: Better Uptime, UptimeRobot, or Pingdom — alert on `/api/health` returning non-200.
- **APM**: Sentry (errors) + Datadog or New Relic (performance).
- **Logs**: Ship pino JSON logs to Logtail, Papertrail, or AWS CloudWatch.
- **Database**: pg_stat_statements for slow query identification.

### Log Levels

The API server uses structured JSON logging (pino). Filter by level:

```bash
# Production — errors only
LOG_LEVEL=error

# Staging — info and above
LOG_LEVEL=info

# Debug (never in production)
LOG_LEVEL=debug
```

---

## 2. Incident Recovery Guide

### Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| P0 | Complete outage / data loss risk | Immediate |
| P1 | Major feature broken (payments, orders) | < 1 hour |
| P2 | Minor feature degraded | < 4 hours |
| P3 | Cosmetic / non-blocking | Next business day |

### P0 — API Server Down

1. Check workflow logs for crash reason.
2. Check `DATABASE_URL` and `SESSION_SECRET` env vars are set.
3. Restart the API workflow.
4. If crash loops: roll back to last known-good checkpoint.

### P1 — Payment Failures

1. Check `PAYMOB_API_KEY` env var is set and valid.
2. Verify Paymob integration IDs in Admin → Settings.
3. Check Paymob dashboard for service status: https://status.paymob.com
4. If HMAC errors: verify `PAYMOB_HMAC_SECRET` matches the Paymob dashboard setting.

### P1 — Database Connection Failures

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Check active connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Kill idle connections if at limit
psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND query_start < NOW() - INTERVAL '10 minutes';"
```

### P2 — Email Not Sending

Email is gracefully degraded — failures are logged but never crash requests.

1. Check `RESEND_API_KEY` env var.
2. Verify `RESEND_FROM_EMAIL` domain is verified in Resend dashboard.
3. Check Resend logs for bounce/block reasons.

### Session / Token Issues

If all users are getting logged out unexpectedly:
- `SESSION_SECRET` may have changed — all JWTs become invalid.
- Never rotate `SESSION_SECRET` without a planned maintenance window.
- Refresh tokens are stored in DB and survive server restarts.

---

## 3. Backup & Restore Guide

### Database Backup

#### Manual Backup

```bash
# Full backup
pg_dump $DATABASE_URL --format=custom --file=backup_$(date +%Y%m%d_%H%M%S).pgdump

# Schema only
pg_dump $DATABASE_URL --schema-only --file=schema_$(date +%Y%m%d).sql

# Data only
pg_dump $DATABASE_URL --data-only --file=data_$(date +%Y%m%d).sql
```

#### Automated Backup Strategy

| Frequency | Retention | Storage |
|-----------|-----------|---------|
| Every 6 hours | 7 days | Object storage (S3/R2) |
| Daily | 30 days | Object storage |
| Weekly | 6 months | Cold storage (Glacier) |
| Monthly | 2 years | Cold storage |

#### Replit Database Backup

Replit Postgres has automatic daily backups. Use the Replit dashboard → Database → Backups to restore.

### Database Restore

```bash
# Full restore (WARNING: drops and recreates the database)
pg_restore --clean --if-exists --dbname=$DATABASE_URL backup.pgdump

# Restore to a new database for verification before promotion
createdb restore_test
pg_restore --dbname=postgres://user:pass@host/restore_test backup.pgdump

# Point-in-time (requires WAL archiving)
pg_restore --target-time="2024-01-15 14:30:00" ...
```

### Restore Verification Checklist

- [ ] User count matches pre-backup count
- [ ] Admin accounts intact
- [ ] Recent orders present
- [ ] Product catalog intact
- [ ] Settings preserved (store_settings table)
- [ ] API health endpoint returns 200

### Audit Log Retention

Audit logs grow over time. Apply this retention policy:

```sql
-- Delete audit logs older than 2 years (run monthly)
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '2 years';

-- Verify remaining count
SELECT COUNT(*), MIN(created_at), MAX(created_at) FROM audit_logs;
```

For compliance requirements, export before deletion:

```bash
psql $DATABASE_URL -c "\COPY (SELECT * FROM audit_logs WHERE created_at < NOW() - INTERVAL '2 years') TO 'audit_archive_$(date +%Y%m).csv' CSV HEADER"
```

### Refresh Token Cleanup

Expired and revoked tokens accumulate. Run weekly:

```sql
-- Delete expired or revoked tokens older than 90 days
DELETE FROM refresh_tokens
WHERE (expires_at < NOW() OR revoked_at IS NOT NULL)
  AND created_at < NOW() - INTERVAL '90 days';
```

### Password Reset Token Cleanup

```sql
-- Delete used or expired password reset tokens older than 7 days
DELETE FROM password_reset_tokens
WHERE (used_at IS NOT NULL OR expires_at < NOW())
  AND created_at < NOW() - INTERVAL '7 days';
```

---

## 4. Production Checklist

### Pre-Launch

- [ ] `SESSION_SECRET` is set to a cryptographically random 64-char string
- [ ] `DATABASE_URL` points to a production database, not dev
- [ ] `NODE_ENV=production` is set
- [ ] `PUBLIC_URL` matches your production domain (for sitemap)
- [ ] `ALLOWED_ORIGINS` lists your production frontend domain
- [ ] `PAYMOB_API_KEY` is the live (not sandbox) key
- [ ] `PAYMOB_HMAC_SECRET` matches the Paymob live dashboard
- [ ] Paymob integration IDs are configured in Admin → Settings
- [ ] `RESEND_API_KEY` is set and from-domain is verified
- [ ] `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` are set
- [ ] First admin account is created (Option A or B from ADMIN_BOOTSTRAP.md)
- [ ] Default store settings are seeded (`POST /api/settings/seed`)
- [ ] Database migrations are applied
- [ ] HTTPS is enforced (Replit handles this automatically)
- [ ] Rate limiting is active (verify at `/api/auth/login` with 21 rapid requests)
- [ ] Robots.txt is accessible and correct
- [ ] Sitemap returns valid XML (`GET /api/sitemap.xml`)

### Post-Launch Verification

- [ ] Health check returns 200 (`GET /api/health`)
- [ ] Customer registration flow works end-to-end
- [ ] Login / logout / token refresh works
- [ ] Product listing and search returns results
- [ ] Add to cart and checkout flow completes
- [ ] Order confirmation email is received
- [ ] Admin panel is accessible at `/admin-panel`
- [ ] Admin panel is NOT indexed by Google (verify via Search Console)
- [ ] Audit logs are being written (`GET /api/admin/audit-logs`)

---

## 5. Maintenance Checklist

### Weekly

- [ ] Review error logs for new patterns
- [ ] Check pending orders in Admin dashboard
- [ ] Run refresh token cleanup SQL
- [ ] Verify backup completed successfully

### Monthly

- [ ] Review audit logs for suspicious activity
- [ ] Run password reset token cleanup SQL
- [ ] Check low-stock products (Admin → Analytics)
- [ ] Review and rotate API keys if near expiry
- [ ] Run `VACUUM ANALYZE` on the database:

```sql
VACUUM ANALYZE users;
VACUUM ANALYZE products;
VACUUM ANALYZE orders;
VACUUM ANALYZE order_items;
VACUUM ANALYZE audit_logs;
```

### Quarterly

- [ ] Security dependency audit: `pnpm audit`
- [ ] Review and update CORS `ALLOWED_ORIGINS`
- [ ] Rotate `SESSION_SECRET` (planned maintenance window — all sessions will be invalidated)
- [ ] Archive old audit logs (see retention policy above)
- [ ] Load test with current traffic levels
- [ ] Review database index usage:

```sql
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
```

Indexes with `idx_scan = 0` after months of traffic can be dropped.

---

## 6. Scaling Roadmap

### Tier 1: 0 – 1,000 users (current)
- Single API server, single Postgres instance
- No caching layer needed
- Bottleneck: None at this scale

### Tier 2: 1,000 – 10,000 users
- Add Redis for session/token caching
- Add connection pooling (PgBouncer)
- Enable CDN for static assets and product images
- Consider read replica for analytics queries

### Tier 3: 10,000 – 100,000 users
- Horizontal API scaling (multiple instances behind load balancer)
- Implement Redis distributed caching for product catalog
- Separate analytics queries to read replica
- Add database partitioning on `orders` and `audit_logs` by date
- Implement pagination cursor-based (keyset) instead of OFFSET for large tables
- Move image uploads to edge CDN (Cloudinary already handles this)

### Tier 4: 100,000 – 1,000,000 users
- Microservices: split payments, notifications, analytics into separate services
- Message queue (RabbitMQ/SQS) for order processing and email
- Distributed tracing (OpenTelemetry)
- Database sharding or multi-region read replicas
- Full-text search service (Elasticsearch/Meilisearch) for product search
- GraphQL or tRPC API for frontend efficiency

### Performance Bottlenecks Identified (Current)

| Query | Current Approach | Risk at Scale | Mitigation |
|-------|-----------------|---------------|------------|
| Product listing with enrichment | N+1 → now batched | Medium at 50k products | Caching layer |
| Analytics BI queries | Full table scans | High at 100k orders | Read replica + pre-aggregation |
| Order enrichment | Batch JOINs | Medium | Cache product/vendor names |
| Notification read-all | Full user scan | Low | Already indexed |
| Sitemap generation | 500 product limit | Low | Already limited |
