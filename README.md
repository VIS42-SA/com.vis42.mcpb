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

1. Download the latest `vis42.mcpb` file from the [Releases](https://github.com/VIS42-SA/com.vis42.mcpb/releases) page
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
| `get-schema` | Return the complete GraphQL schema in JSON format of the VIS42 app. |
| `query` | Executes a GraphQL query. |
| `store-product` | Create a new product or service. |
| `update-product` | Update an existing product or service. |
| `destroy-product` | Delete an existing product or service. |
| `store-product-price` | Create a new price for a product or service. |
| `update-product-price` | Update an existing price for a product or service. |
| `destroy-product-price` | Delete an existing price for a product or service. |
| `store-measure-unit` | Create a new measure unit. |
| `update-measure-unit` | Update an existing measure unit. |
| `destroy-measure-unit` | Delete an existing measure unit. |
| `store-counterpart-organization` | Create a new counterpart (supplier or client). |
| `store-counterpart-individual` | Create a new counterpart (supplier or client). |
| `update-counterpart-organization` | Update an existing organization counterpart (business). |
| `destroy-counterpart` | Delete an existing counterpart (supplier or client). |
| `store-counterpart-bank-account` | Create a new bank account for a counterpart. |
| `update-counterpart-bank-account` | Update an existing bank account for a counterpart. |
| `update-counterpart-individual` | Update an existing individual counterpart (person). |
| `destroy-counterpart-bank-account` | Delete an existing bank account for a counterpart. |
| `store-counterpart-contact` | Create a new contact for a counterpart. |
| `update-counterpart-contact` | Update an existing contact for a counterpart. |
| `destroy-counterpart-contact` | Delete an existing contact for a counterpart. |
| `store-counterpart-vat-id` | Create a new VAT ID for a counterpart. |
| `update-counterpart-vat-id` | Update an existing VAT ID for a counterpart. |
| `destroy-counterpart-vat-id` | Delete an existing VAT ID for a counterpart. |
| `store-counterpart-address` | Create a new address for a counterpart. |
| `update-counterpart-address` | Update an existing address for a counterpart. |
| `destroy-counterpart-address` | Delete an existing address for a counterpart. |
| `store-payable` | Create a new payable. Payable are created with the status DRAFT. |
| `update-payable` | Update an existing payable. Only DRAFT payables can be updated. |
| `destroy-payable` | Delete an existing payable. |
| `mark-as-new-payable` | Set the status of an existing payable to **New**. |
| `approval-payable` | Set the status of an existing payable to **Approval Pending**. |
| `approve-payable` | Set the status of an existing payable to **Approved**. |
| `refuse-payable` | Set the status of an existing payable to **Refused**. |
| `cancel-payable` | Set the status of an existing payable to **Cancelled**. |
| `mark-as-paid-payable` | Set the status of an existing payable to **Paid**. |
| `store-receivable-invoice` | Create a new receivable invoice. Receivables are created with the status DRAFT. |
| `store-receivable-quote` | Create a new receivable quote. Receivables are created with the status DRAFT. |
| `update-receivable-invoice` | Update an existing receivable invoice. Invoices can only be updated when they are in DRAFT status. |
| `update-receivable-quote` | Update an existing receivable quote. Quotes can only be updated when they are in DRAFT status. |
| `destroy-receivable` | Delete an existing receivable. |
| `issue-receivable-invoice` | Set the status of an existing receivable invoice to **Issued**. |
| `issue-receivable-quote` | Set the status of an existing receivable quote to **Issued**. |
| `cancel-receivable-invoice` | Set the status of an existing receivable to **Cancelled**. |
| `mark-as-paid-receivable-invoice` | Set the status of an existing receivable invoice to **Paid**. |
| `mark-as-partially-paid-receivable-invoice` | Set the status of an existing receivable invoice to **Partially Paid**. |
| `mark-as-uncollectible-receivable-invoice` | Set the status of an existing receivable invoice to **Uncollectible**. |


## How It Works

This extension runs a lightweight local proxy on your machine. When you interact with Claude, it translates your requests into MCP (Model Context Protocol) messages and forwards them to the VIS42 server over HTTPS. All communication is authenticated with your API token.

## Building from Source

```bash
git clone https://github.com/VIS42-SA/com.vis42.mcpb.git
cd vis42-mcpb
cd server && npm install --production && cd ..
npx @anthropic-ai/mcpb pack
```

This produces a `vis42.mcpb` file in the project root.

## Privacy Policy

This extension connects to the VIS42 remote server to process your requests. Please review our [Privacy Policy](https://vis42.com/privacy-policy) for details on data collection, usage, and retention.

## Support

- Email: [support@vis42.com](mailto:support@vis42.com)
- Issues: [GitHub Issues](https://github.com/VIS42-SA/com.vis42.mcpb/issues)

## License

[MIT](LICENSE)
