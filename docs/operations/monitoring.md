# Monitoring and Alerts

This document describes the monitoring setup for suzumina.click.

## Overview

We use Google Cloud Monitoring for observability, with alerts configured for critical issues.

## Monitoring Stack

- **Metrics**: Cloud Monitoring
- **Logs**: Cloud Logging
- **Traces**: Cloud Trace
- **Error Tracking**: Sentry (planned)
- **Uptime Checks**: Cloud Monitoring Uptime Checks

## Key Metrics

### Application Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Response Time (p95) | < 200ms | > 500ms |
| Error Rate | < 0.1% | > 1% |
| Availability | > 99.9% | < 99.5% |
| Memory Usage | < 80% | > 90% |

### Cloud Functions Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Execution Time | < 30s | > 60s |
| Error Rate | < 1% | > 5% |
| Cold Start Rate | < 10% | > 20% |

### Firestore Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Read Latency | < 50ms | > 100ms |
| Write Latency | < 100ms | > 200ms |
| Daily Reads | < 50M | > 45M |
| Daily Writes | < 20M | > 18M |

## Alert Configuration

### Critical Alerts (Page immediately)

1. **Site Down**
   - Uptime check fails for 2 consecutive checks
   - Response: Check Cloud Run logs, verify deployment

2. **High Error Rate**
   - Error rate > 5% for 5 minutes
   - Response: Check recent deployments, rollback if needed

3. **Database Issues**
   - Firestore unavailable or high latency
   - Response: Check GCP status, contact support

### Warning Alerts (Notify via Discord)

1. **High Memory Usage**
   - Memory > 80% for 10 minutes
   - Response: Investigate memory leaks, scale up if needed

2. **Slow Response Times**
   - p95 latency > 500ms for 10 minutes
   - Response: Check slow queries, optimize code

3. **High Cold Start Rate**
   - Cold starts > 20% for functions
   - Response: Consider minimum instances

## Dashboard Access

### Cloud Console Dashboards

1. **Main Dashboard**: [Cloud Console](https://console.cloud.google.com/monitoring)
2. **Custom Dashboards**:
   - Application Performance
   - Function Performance
   - Database Metrics
   - Cost Analysis

### Key Graphs to Monitor

1. **Traffic Patterns**
   - Requests per second
   - Geographic distribution
   - Device types

2. **Performance Metrics**
   - Response time distribution
   - Memory usage trends
   - CPU utilization

3. **Business Metrics**
   - Active users
   - Audio button plays
   - Search queries

## Log Analysis

### Useful Log Queries

```sql
-- High latency requests
resource.type="cloud_run_revision"
severity>=WARNING
httpRequest.latency>1s

-- Failed audio button plays
resource.type="cloud_run_revision"
jsonPayload.action="play_audio_button"
jsonPayload.success=false

-- Authentication errors
resource.type="cloud_run_revision"
jsonPayload.error=~".*auth.*"
```

### Log Retention

- **Application logs**: 30 days
- **Audit logs**: 400 days
- **Access logs**: 30 days

## Incident Response

### Severity Levels

1. **SEV1 (Critical)**: Site completely down
2. **SEV2 (Major)**: Core functionality broken
3. **SEV3 (Minor)**: Non-critical features affected
4. **SEV4 (Low)**: Cosmetic issues

### Response Procedures

1. **Acknowledge alert** within 5 minutes
2. **Assess impact** and assign severity
3. **Communicate status** (if user-facing)
4. **Investigate and fix**
5. **Post-mortem** for SEV1/SEV2

### Runbooks

Common issues and solutions:

1. **High Memory Usage**
   ```bash
   # Check memory usage
   gcloud run services describe web --region asia-northeast1
   
   # Scale up if needed
   gcloud run services update web --memory 1Gi
   ```

2. **Function Timeouts**
   ```bash
   # Check function logs
   gcloud functions logs read dlsite-collector
   
   # Increase timeout
   gcloud functions deploy dlsite-collector --timeout 540s
   ```

## Performance Optimization

### Regular Reviews

Weekly:
- Review p95/p99 latencies
- Check error rates
- Monitor cost trends

Monthly:
- Analyze traffic patterns
- Review cold start rates
- Optimize slow queries

### Optimization Checklist

- [ ] Enable Cloud CDN for static assets
- [ ] Implement request coalescing
- [ ] Optimize Firestore queries
- [ ] Review function memory allocation
- [ ] Enable response compression

## Cost Monitoring

### Budget Alerts

- **Monthly budget**: $150
- **Alert at**: 50%, 90%, 100%
- **Hard limit**: 120% (then disable billing)

### Cost Optimization

1. **Use Firestore efficiently**
   - Batch reads/writes
   - Use proper indexes
   - Cache frequently accessed data

2. **Optimize Cloud Run**
   - Set appropriate concurrency
   - Use minimum instances wisely
   - Enable CPU throttling

3. **Manage Storage**
   - Set lifecycle policies
   - Compress large files
   - Clean up old data

---

**Last Updated**: 2025-07-28  
**Review Schedule**: Monthly