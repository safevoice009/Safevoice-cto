# SafeVoice Self-Hosting Guide

This guide describes how to deploy the SafeVoice stack (Frontend + P2P Bootstrap Sidecar) using Docker Compose.

## Prerequisites

- [Docker Engine](https://docs.docker.com/engine/install/) (v20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2.0+)

## Architecture

The self-hosted stack consists of two services:
1.  **safevoice-app**: Nginx serving the static React application. It also acts as a reverse proxy for the bootstrap API.
2.  **p2p-bootstrap**: A lightweight Node.js sidecar that handles:
    - Peer discovery and presence (signalling).
    - CRDT snapshot storage (for bootstrapping new clients).
    - Metrics (Prometheus format).

## Configuration

Configuration is managed via environment variables in the `.env` file or passed to Docker Compose.

### Environment Variable Matrix

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Public port for the application | `8080` |
| `COLLEGE_NAME` | Name of your organization/college | `SafeVoice University` |
| `BRAND_ACCENT` | Primary brand color (Hex) | `#3b82f6` |
| `P2P_BOOTSTRAP` | URL for bootstrap server. Use `/api` for internal sidecar. | `/api` |
| `PEER_TTL` | Time-to-live for peer presence (ms) | `45000` |
| `VITE_WALLETCONNECT_PROJECT_ID` | Project ID for WalletConnect | *(Required)* |

## Deployment Steps

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd safevoice
    ```

2.  **Configure environment:**
    Copy `.env.example` to `.env` and edit it:
    ```bash
    cp .env.example .env
    nano .env
    ```
    Ensure you set `VITE_WALLETCONNECT_PROJECT_ID`.

3.  **Start the stack:**
    ```bash
    docker compose up -d --build
    ```
    The `--build` flag is important to ensure the React app is rebuilt with your environment variables (branding, etc.).

4.  **Verify deployment:**
    Access the application at `http://localhost:8080` (or your configured `PORT`).

    Check the health endpoints:
    - App Health: `http://localhost:8080/health`
    - Bootstrap Sidecar Health: `http://localhost:8080/api/health`
    - Metrics: `http://localhost:8080/api/metrics`

## Data Persistence

The stack uses named Docker volumes for persistence:
- `crdt-snapshots`: Stores CRDT snapshots for bootstrapping.
- `bootstrap-metadata`: Stores additional metadata.

### Seeding CRDT Snapshots

To seed the bootstrap server with an initial CRDT snapshot:

1.  Place your snapshot file (e.g., `initial_snapshot.bin`) in a temporary location.
2.  Copy it into the `crdt-snapshots` volume via the sidecar container:
    ```bash
    docker cp initial_snapshot.bin p2p-bootstrap:/data/snapshots/latest
    ```
    *Note: The filename can be anything, but clients must know which ID to request.*

Alternatively, you can mount a local directory to populate the volume:
```yaml
volumes:
  - ./my-snapshots:/data/snapshots
```

## Branding & Customization

To customize the branding, update the following variables in `.env` before building:
- `COLLEGE_NAME`: Displayed in the header/footer.
- `BRAND_ACCENT`: Used for buttons and highlights.

Example:
```bash
COLLEGE_NAME="Crypto University"
BRAND_ACCENT="#7c3aed"
```

## Troubleshooting

- **Sidecar not reachable:** Check if `safevoice-app` logs show Nginx errors. Ensure `p2p-bootstrap` container is healthy (`docker compose ps`).
- **Peers not discovering:** Ensure `P2P_BOOTSTRAP` is set to `/api` (or the correct full URL if external). Check `PEER_TTL`.
