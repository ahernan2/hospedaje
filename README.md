# Hospedaje Poly — Agent Tools

Two components that power Ana Cecilia's Claude Desktop setup for managing the hotel:

1. **MCP server** — gives Claude Desktop access to PolyOS (reservations, cabins, pricing, etc.)
2. **Cron script** — sends proactive WhatsApp notifications (morning briefing, payment reminders, etc.)

The personality and decision rules live in the `soul/` directory and are loaded as the Claude Desktop Project system prompt.

---

## Architecture

```
Claude Desktop (Ana Cecilia's laptop)
    └── Project "Poly" (system prompt = soul/SOUL.md + KNOWLEDGE.md + RULES.md)
         └── MCP Server: poly-hotel
              └── PolyOS API (hospedajepoly.com)

Cron Script (same laptop or any server)
    └── Scheduled jobs → WhatsApp → Ana Cecilia's phone
         └── PolyOS API (hospedajepoly.com)
```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with real POLYOS_BASE_URL, POLYOS_API_KEY, WHATSAPP_OWNER_JID
```

### 3. Build

```bash
npm run build
```

---

## MCP Server (Claude Desktop integration)

### Configure Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "poly-hotel": {
      "command": "node",
      "args": ["/absolute/path/to/poly-agent/dist/mcp/index.js"],
      "env": {
        "POLYOS_BASE_URL": "https://hospedajepoly.com",
        "POLYOS_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

On Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Restart Claude Desktop after editing. The `poly-hotel` tools will appear in the tool picker.

### Test the MCP server

```bash
npm run dev:mcp
# Should print nothing and wait (stdio transport, reads from stdin)
```

### Available tools

| Tool | Description |
|---|---|
| `check_availability` | Available cabins for date range |
| `calculate_price` | Price breakdown with discounts |
| `list_reservations` | All reservations (filter by status) |
| `get_reservation` | Details for one reservation |
| `create_reservation` | New booking (ask Ana first) |
| `update_reservation_status` | Change reservation state |
| `update_payment_status` | Mark paid/deposit/unpaid |
| `cancel_reservation` | Cancel (never without permission) |
| `list_cabins` | All cabins + status |
| `create_maintenance_block` | Block cabin for maintenance |
| `query_activity_log` | System activity history |
| `list_customers` | Guest history |
| `validate_discount_code` | Check promo code |
| `get_weather` | Golfito weather forecast |
| `get_exchange_rate` | USD → CRC rate |
| `get_current_datetime` | Current CR time |

---

## Cron Script (WhatsApp notifications)

### First run — pair WhatsApp

```bash
npm run dev:cron
```

A QR code will appear in the terminal. Scan it with WhatsApp on Ana Cecilia's phone (or the hotel phone):
- Open WhatsApp → ⋮ menu → Linked devices → Link a device → scan QR

Once paired, credentials are saved to `data/wa-auth/` and won't need re-pairing.

### Run in production

```bash
npm run start:cron
```

Keep this process running (use `pm2`, `systemd`, or `screen`).

### Schedule (Costa Rica time)

| Time | Job |
|---|---|
| 06:00 daily | Check-out reminders |
| 07:00 daily | Morning briefing (check-ins, check-outs, cabin status, weather) |
| 09:00 daily | Payment reminders (unpaid > 24h) |
| Every 30 min | iCal sync check (alerts if no sync in 30 min) |
| Monday 08:00 | 14-day occupancy forecast |

---

## Claude Desktop Project setup

Create a new Project in Claude Desktop named **"Poly — Hospedaje"** and paste the following as the system prompt (combine all three files):

1. Contents of `soul/SOUL.md`
2. Contents of `soul/KNOWLEDGE.md`
3. Contents of `soul/RULES.md`

Ana Cecilia should always start conversations from this Project to ensure Poly's personality and rules are active.

---

## Folder structure

```
poly-agent/
├── soul/                   # System prompt source files (read-only)
│   ├── SOUL.md             # Identity, personality, decision framework
│   ├── KNOWLEDGE.md        # Hotel facts: cabins, hours, payment, location
│   └── RULES.md            # Operational policies
├── src/
│   ├── shared/
│   │   └── api-client.ts   # PolyOS HTTP client (used by both MCP + cron)
│   ├── mcp/
│   │   └── index.ts        # MCP server (16 tools, stdio transport)
│   └── cron/
│       ├── index.ts        # Cron entry point
│       ├── whatsapp.ts     # Baileys WhatsApp sender
│       └── jobs/
│           ├── morning-briefing.ts
│           ├── payment-reminders.ts
│           ├── checkout-reminders.ts
│           ├── ical-sync-check.ts
│           └── occupancy-forecast.ts
├── data/
│   └── wa-auth/            # WhatsApp auth (gitignored)
├── dist/                   # Compiled output (gitignored)
├── .env                    # Secrets (gitignored)
├── .env.example
├── package.json
└── tsconfig.json
```

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `POLYOS_BASE_URL` | Yes | PolyOS API base URL |
| `POLYOS_API_KEY` | Yes | PolyOS API key |
| `WHATSAPP_OWNER_JID` | Yes (cron only) | Owner's WhatsApp JID (`phone@s.whatsapp.net`) |
| `TZ` | No | Timezone (default: `America/Costa_Rica`) |
