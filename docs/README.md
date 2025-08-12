# suzumina.click Documentation

Welcome to the suzumina.click project documentation. This is the central hub for all project documentation.

## 🚀 Quick Start

- **For AI Development**: See [CLAUDE.md](../CLAUDE.md) for essential AI guidelines
- **For Development Setup**: See [Development Guide](guides/development.md)
- **For Architecture Overview**: See [Architecture Reference](reference/architecture.md)

## 📋 Project Overview

**suzumina.click** is a fan community web platform for voice actress "Suzuka Minase" (涼花みなせ).

- **Status**: Production Ready v0.3.8
- **URL**: https://suzumina.click
- **Tech Stack**: Next.js 15, TypeScript, Firestore, Cloud Functions
- **Repository**: Private GitHub repository

### Core Features
- Audio button system with YouTube timestamp references
- DLsite work information integration
- User authentication via Discord OAuth
- Work evaluation system (rankings, ratings, NG marks)
- Price history tracking for DLsite works
- Advanced search and filtering

## 📚 Documentation Structure

### Reference Documentation
Core technical references for the project:

- [Architecture Overview](reference/architecture.md) - Architecture documentation index
- [Infrastructure Architecture](reference/infrastructure-architecture.md) - GCP infrastructure and deployment
- [Application Architecture](reference/application-architecture.md) - Application design and patterns
- [Database Schema](reference/database-schema.md) - Firestore structure and data models
- [Domain Model](reference/domain-model.md) - Domain-driven design architecture
- [Domain Object Catalog](reference/domain-object-catalog.md) - Detailed entity and value object specifications
- [Ubiquitous Language](reference/ubiquitous-language.md) - Common terminology and concepts

### Architecture Decisions
Design decisions and implementation patterns:

- [Architecture Decision Records](decisions/README.md) - Important technical decisions
- [ADR-001: DDD Implementation Guidelines](decisions/architecture/ADR-001-ddd-implementation-guidelines.md) - When to apply DDD patterns
- [ADR-002: TypeScript Type Safety Enhancement](decisions/architecture/ADR-002-typescript-type-safety-enhancement.md) - Branded Types, Result patterns, and Zod integration

### Postmortems
Incident analysis and lessons learned:

- [2025-08-12: UI Component Deletion](postmortems/2025-08-12-ui-component-deletion.md) - Accidental deletion of used components

### External API Documentation
Integration specifications and analysis:

- [DLsite API](reference/external-apis/dlsite-api.md) - Individual Info API integration details
- [YouTube API](reference/external-apis/youtube-api.md) - YouTube Data API v3 usage

### Development Guides
How-to guides for common tasks:

- [Development Guide](guides/development.md) - Environment setup and development workflow
- [Testing Guide](guides/testing.md) - Testing strategies and best practices
- [Deployment Guide](guides/deployment.md) - Deployment procedures and infrastructure
- [TypeScript Type Safety Migration](guides/typescript-type-safety-migration.md) - Implementation guide for type safety enhancements
- [TypeScript Migration Checklist](guides/typescript-migration-checklist.md) - Step-by-step checklist for migration

### Code Examples
Practical implementation examples:

- [TypeScript Type Safety Examples](examples/typescript-type-safety-examples.md) - Before/after comparisons and sample implementations

### Operational Documentation
Day-to-day operational information:

- [Changelog](operations/changelog.md) - Version history and release notes
- [TODO](operations/todo.md) - Current tasks and priorities
- [Monitoring](operations/monitoring.md) - System monitoring and alerts

## 🛠️ Quick Commands

```bash
# Development
pnpm --filter @suzumina.click/web dev        # Start development server
pnpm --filter @suzumina.click/functions dev   # Start functions emulator

# Testing
pnpm test                                     # Run all tests
pnpm lint                                     # Run linter
pnpm typecheck                                # Run type checking

# Build
pnpm build                                    # Build all packages
```

## 🔍 Finding Information

### By Topic

**Architecture & Design**
- System design → [Architecture](reference/architecture.md)
- Database design → [Database Schema](reference/database-schema.md)
- Domain modeling → [Domain Model](reference/domain-model.md)

**Development**
- Getting started → [Development Guide](guides/development.md)
- Writing tests → [Testing Guide](guides/testing.md)
- Code standards → [CLAUDE.md](../CLAUDE.md)

**APIs & Integrations**
- DLsite integration → [DLsite API](reference/external-apis/dlsite-api.md)
- YouTube integration → [YouTube API](reference/external-apis/youtube-api.md)

**Operations**
- Recent changes → [Changelog](operations/changelog.md)
- Current work → [TODO](operations/todo.md)

### By Role

**For New Developers**
1. Read [Development Guide](guides/development.md)
2. Review [Architecture Overview](reference/architecture.md)
3. Check [Ubiquitous Language](reference/ubiquitous-language.md)

**For AI Assistants**
1. Read [CLAUDE.md](../CLAUDE.md) first
2. Reference this documentation index
3. Use specific documents as needed

**For Operations**
1. Monitor [Changelog](operations/changelog.md)
2. Track [TODO](operations/todo.md)
3. Check [Monitoring](operations/monitoring.md)

## 📁 Archive

Completed project documentation is archived in the [archive/](archive/) directory, organized by date and project name.

Recent archives:
- [2025-07 Server Component Optimization](archive/2025-07-server-component-optimization/)
- [2025-07 Entity System Migration](archive/2025-07-entity-system-migration/)
- [2025-07 Audio Button Optimization](archive/2025-07-audio-button-optimization/)

---

**Last Updated**: 2025-07-28  
**Maintained by**: suzumina.click development team