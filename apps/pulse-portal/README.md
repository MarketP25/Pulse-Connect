# PULSCO Portal - Unified Planetary Access

The **PULSCO Portal** is your single entry point for guests to explore and access all planetary subsystems across multiple monorepos. It provides unified authentication, navigation, and cross-subsystem integration while maintaining the independence of each subsystem.

## 🏗️ Architecture Overview

```
PULSCO Portal (apps/pulse-portal)
├── Unified UI Layer
├── Subsystem Registry
├── Cross-Subsystem Integrator
├── Real-Time Monitor
└── Planetary Dashboard

Individual Subsystems (Independent Monorepos)
├── pulse-connect-ui (Port 3001)
├── pulse-connect-admin-ui (Port 3002)
├── pulse-connect-core (Services)
├── pap_v1 (Marketing Package)
├── services/* (Backend Services)
└── packages/* (Shared Libraries)
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment
Create `.env.local`:
```env
# Portal Configuration
NEXT_PUBLIC_PORTAL_URL=http://localhost:3000

# Subsystem Endpoints
NEXT_PUBLIC_PLACES_UI_URL=http://localhost:3001
NEXT_PUBLIC_PAP_UI_URL=http://localhost:3002
NEXT_PUBLIC_MATCHMAKING_UI_URL=http://localhost:3003
NEXT_PUBLIC_ECOMMERCE_UI_URL=http://localhost:3004
NEXT_PUBLIC_LOCALIZATION_UI_URL=http://localhost:3005
NEXT_PUBLIC_COMMUNICATION_UI_URL=http://localhost:3006
NEXT_PUBLIC_INTELLIGENCE_UI_URL=http://localhost:3007
NEXT_PUBLIC_EDGE_UI_URL=http://localhost:3008
NEXT_PUBLIC_GOVERNANCE_UI_URL=http://localhost:3009

# API Endpoints
NEXT_PUBLIC_EDGE_GATEWAY_API=http://localhost:4008/api
NEXT_PUBLIC_REGISTRY_API=http://localhost:4008/api/registry
```

### 3. Start the Portal
```bash
pnpm dev
```

The portal will be available at `http://localhost:3000`

## 🎯 Key Features

### Unified Access
- **Single Sign-On**: Authenticate once, access all subsystems
- **Subsystem Launcher**: Visual cards for each planetary subsystem
- **Health Monitoring**: Real-time status of all services
- **Dependency Management**: Automatic handling of subsystem relationships

### Cross-Subsystem Integration
- **Data Flow Visualization**: See how subsystems communicate
- **Unified Search**: Search across all subsystems simultaneously
- **Shared Context**: Maintain state across subsystem boundaries
- **Event Bus**: Real-time communication between subsystems

### Developer Experience
- **Hot Module Replacement**: Instant updates during development
- **Type Safety**: Full TypeScript integration across monorepos
- **Workspace Management**: pnpm workspace for efficient development
- **Micro-frontend Architecture**: Independent deployment of subsystems

## 📋 Subsystem Registry

The portal maintains a registry of all available subsystems:

| Subsystem | Port | Description | Dependencies |
|-----------|------|-------------|--------------|
| Places & Venues | 3001 | Location intelligence | proximity-geocoding, localization |
| PAP Marketing | 3002 | AI-driven marketing | communication, localization |
| Matchmaking | 3003 | Gig economy platform | proximity-geocoding, communication |
| E-commerce | 3004 | Planetary commerce | payments, fraud, localization |
| Localization | 3005 | Translation services | - |
| Communication | 3006 | Real-time messaging | localization |
| Pulse Intelligence | 3007 | AI decisioning | edge-gateway |
| Edge Gateway | 3008 | Governance layer | - |
| MARP Governance | 3009 | Policy management | - |

## 🔧 Development Workflow

### Adding a New Subsystem

1. **Create Subsystem Package**:
```bash
mkdir apps/my-subsystem
cd apps/my-subsystem
pnpm init
```

2. **Register in Portal**:
Update `src/hooks/useSubsystemRegistry.ts` with your subsystem info.

3. **Add to Workspace**:
Update `pnpm-workspace.yaml` to include your new package.

4. **Configure Routing**:
Add routes in the portal for cross-subsystem navigation.

### Cross-Subsystem Communication

Use the event bus for inter-subsystem communication:

```typescript
import { useEventBus } from '@pulsco/portal'

const { emit, subscribe } = useEventBus()

// Send data to another subsystem
emit('user:updated', userData)

// Listen for events from other subsystems
subscribe('order:completed', handleOrderCompletion)
```

## 🔍 Monitoring & Debugging

### Health Checks
- Visit `/health` for overall system health
- Individual subsystem health at `/health/{subsystem-id}`
- Real-time monitoring dashboard at `/monitor`

### Logging
- Centralized logging across all subsystems
- Structured logs with correlation IDs
- Log aggregation and analysis tools

### Debugging
- Hot reload for all connected subsystems
- Source maps for production debugging
- Performance profiling tools

## 🚀 Deployment

### Development
```bash
# Start all subsystems
pnpm run dev:all

# Start portal only
pnpm dev
```

### Production
```bash
# Build all subsystems
pnpm run build:all

# Deploy portal
pnpm run deploy:portal
```

### Docker
```bash
# Build portal container
docker build -t pulsco-portal .

# Run with subsystem discovery
docker run -p 3000:3000 \
  -e SUBSYSTEM_DISCOVERY_URL=http://discovery:8080 \
  pulsco-portal
```

## 🔐 Security

- **Zero Trust Architecture**: Every request validated
- **End-to-End Encryption**: All inter-subsystem communication
- **Policy Enforcement**: MARP governance across all access
- **Audit Trails**: Complete activity logging

## 📊 Performance

- **Lazy Loading**: Subsystems loaded on demand
- **Code Splitting**: Optimized bundle sizes
- **Caching**: Intelligent caching strategies
- **CDN Integration**: Global content delivery

## 🤝 Contributing

1. Follow the monorepo structure
2. Use the shared TypeScript configurations
3. Implement proper error boundaries
4. Add comprehensive tests
5. Update documentation

## 📚 API Reference

- [Subsystem Registry API](./docs/registry-api.md)
- [Event Bus API](./docs/event-bus.md)
- [Authentication API](./docs/auth.md)
- [Monitoring API](./docs/monitoring.md)

## 🆘 Troubleshooting

### Common Issues

**Subsystem Not Loading**
- Check if the subsystem is running on the expected port
- Verify CORS configuration
- Check network connectivity

**Authentication Issues**
- Ensure SSO configuration is correct
- Check token expiration
- Verify user permissions

**Performance Problems**
- Enable lazy loading
- Check bundle sizes
- Optimize images and assets

## 📞 Support

- **Documentation**: [Portal Docs](./docs/)
- **Issues**: [GitHub Issues](https://github.com/MarketP25/Pulsco/issues)
- **Discussions**: [GitHub Discussions](https://github.com/MarketP25/Pulsco/discussions)

---

**PULSCO Portal** - Your gateway to the planetary nervous system 🌍
