# VIS42 — Claude Desktop Extension

Connect Claude to your VIS42 account. Manage counterparts, products, invoices, payables, and query your business data — all through natural language in Claude Desktop.

## Features

- **GraphQL Queries** — Ask Claude to retrieve any data from your VIS42 account using natural language
- **Counterpart Management** — Create, update, and delete clients and suppliers (organizations and individuals), including their addresses, contacts, bank accounts, and VAT IDs
- **Product Catalog** — Manage products, services, pricing, and measure units
- **Invoice & Payables** — Query and work with your receivables and payables

## Requirements

- [Claude Desktop](https://claude.ai/download) (macOS or Windows)
- A VIS42 account with an API token

## Installation

1. Download the latest `vis42.mcpb` file from the [Releases](https://github.com/vis42/vis42-mcpb/releases) page
2. Open **Claude Desktop**
3. Go to **Settings > Extensions**
4. Click **"Install from file"** and select the `vis42.mcpb` file
5. When prompted, enter your **VIS42 API Token**
6. The extension is now ready to use in any conversation

## Configuration

The extension requires a single configuration value:

| Setting       | Description                              |
|---------------|------------------------------------------|
| **API Token** | Your VIS42 API bearer token for authentication. You can generate one from your VIS42 account settings. |

Your API token is stored securely and never displayed in plain text.

## Usage Examples

Once installed, just ask Claude in natural language:

**Query your data**
> "Show me all my clients"
> "What invoices are due this month?"
> "List all products with their prices"

**Manage counterparts**
> "Create a new client: Acme Corp, based in Zurich, Switzerland, with tax ID CHE-123.456.789"
> "Update the email address for Rossi Mario to mario@example.com"
> "Add a bank account to Acme Corp"

**Manage products**
> "Create a new service called 'Consulting' priced at 150 CHF per hour"
> "Add a EUR price of 140 to the Consulting service"
> "Delete the 'Old Product' from the catalog"

## Available Tools

| Tool | Description |
|------|-------------|
| `get-schema` | Retrieve the GraphQL schema |
| `query` | Execute a GraphQL query |
| `store-product` | Create a new product or service |
| `update-product` | Update a product or service |
| `destroy-product` | Delete a product or service |
| `store-product-price` | Create a product price |
| `update-product-price` | Update a product price |
| `destroy-product-price` | Delete a product price |
| `store-measure-unit` | Create a measure unit |
| `update-measure-unit` | Update a measure unit |
| `destroy-measure-unit` | Delete a measure unit |
| `store-counterpart-organization` | Create an organization counterpart |
| `store-counterpart-individual` | Create an individual counterpart |
| `update-counterpart-organization` | Update an organization counterpart |
| `update-counterpart-individual` | Update an individual counterpart |
| `destroy-counterpart` | Delete a counterpart |
| `store-counterpart-bank-account` | Add a bank account to a counterpart |
| `update-counterpart-bank-account` | Update a counterpart bank account |
| `destroy-counterpart-bank-account` | Delete a counterpart bank account |
| `store-counterpart-contact` | Add a contact to a counterpart |
| `update-counterpart-contact` | Update a counterpart contact |
| `destroy-counterpart-contact` | Delete a counterpart contact |
| `store-counterpart-vat-id` | Add a VAT ID to a counterpart |
| `update-counterpart-vat-id` | Update a counterpart VAT ID |
| `destroy-counterpart-vat-id` | Delete a counterpart VAT ID |
| `store-counterpart-address` | Add an address to a counterpart |
| `update-counterpart-address` | Update a counterpart address |
| `destroy-counterpart-address` | Delete a counterpart address |

## How It Works

This extension runs a lightweight local proxy on your machine. When you interact with Claude, it translates your requests into MCP (Model Context Protocol) messages and forwards them to the VIS42 server over HTTPS. All communication is authenticated with your API token.

## Building from Source

```bash
git clone https://github.com/vis42/vis42-mcpb.git
cd vis42-mcpb
cd server && npm install --production && cd ..
npx @anthropic-ai/mcpb pack
```

This produces a `vis42.mcpb` file in the project root.

## Support

If you encounter any issues, please [open an issue](https://github.com/vis42/vis42-mcpb/issues) on GitHub.

## License

MIT
