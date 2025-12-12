# Software Requirements Specification

## System Design

- Modular, multi-tenant backend system for tracking objects with location over time
- Extensible schema supporting tenant-specific custom fields
- RESTful API and optional GraphQL layer for frontend integration
- Frontend based on map-centric monitoring UI with real-time update capability
- Support for both web and mobile clients via responsive design
- Cloud-native deployment with autoscaling, observability, and fault tolerance

## Architecture Pattern

- **Backend:** Microservices architecture with modular services (Object, Location, Auth, Media, API Gateway)
- **Frontend:** SPA (Single Page Application) with BFF pattern where needed
- **Deployment:** Containerized services orchestrated via Kubernetes (or serverless where applicable)
- **Data Isolation:** Shared database with tenant ID-based row isolation (multi-tenant SaaS)

## State Management

- Frontend: Local state with React Query / TanStack for async state and caching
- Backend: Stateless services; user session and tenant scoped via JWT
- Real-time state: WebSocket or Firebase channels for pushing location updates

## Data Flow

1. User logs in via Auth Service → receives JWT scoped to tenant
2. API calls carry JWT → routed via API Gateway → forwarded to relevant service
3. Object and Location data are created/read/updated through Object & Location Services
4. Real-time updates emitted from services → WebSocket stream to client
5. Frontend UI updates map pins and panels based on stream or polling

## Technical Stack

- **Frontend:** React + TypeScript, Vite, Leaflet or Mapbox GL JS, TailwindCSS, TanStack Query
- **Backend:** Node.js (Express) or Fastify, TypeScript
- **Auth:** OAuth2 via Auth0 or custom JWT Auth Service
- **Database:** PostgreSQL + PostGIS for relational/spatial data; JSONB for flexible attributes
- **Alternative DB Option:** MongoDB if NoSQL structure is preferred
- **Storage:** AWS S3 for media files
- **Hosting:** AWS ECS / Lambda or GCP Cloud Run for microservices, Cloudflare or Vercel for frontend

## Authentication Process

- JWT-based authentication with tenant ID encoded
- OAuth2 (via Auth0 or custom) for user identity federation
- Role-based access control scoped per tenant (Admin, Editor, Viewer)
- Token passed in Authorization header for API and WebSocket sessions

## Route Design

- `/auth/login` – login and token issuance
- `/objects` – create/list/search tracked entities
- `/objects/:id` – retrieve/update/delete object
- `/objects/:id/locations` – add or list location records
- `/locations?near=lat,lng` – spatial search
- `/schema/fields` – get tenant-specific custom fields
- `/media/upload` – media upload endpoint
- `/events/subscribe` – real-time WebSocket channel

## API Design

- RESTful JSON APIs with consistent error handling and pagination
- GraphQL layer (optional) for flexible querying in UI builders
- OpenAPI/Swagger documentation with tenant-aware parameter descriptions
- Rate limiting per tenant, with API keys for programmatic access

## Database Design ERD

**Entities:**

- **Tenant**
  - id (PK), name, metadata

- **User**
  - id (PK), tenant_id (FK), email, password_hash, role

- **TrackedObject**
  - id (PK), tenant_id (FK), name, type, created_at, extra_data (JSONB)

- **LocationRecord**
  - id (PK), object_id (FK), tenant_id (FK), lat, lng, timestamp

- **FieldDefinition**
  - id (PK), tenant_id (FK), object_type, field_name, field_type, options (JSONB)

- **MediaAsset**
  - id (PK), tenant_id (FK), object_id (FK), file_url, file_type, uploaded_at

> All tables include `tenant_id` to enforce isolation.
> Geospatial fields indexed with GIST (PostGIS).
