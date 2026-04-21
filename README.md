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
| `get-schema` | Returns the GraphQL schema for the VIS42 app. |
| `search-schema` | Search the GraphQL schema for a specific type by name or business domain alias. |
| `query` | Executes a GraphQL query. |
| `action-store-business` | Create a new business. |
| `action-update-business` | Update the user's current business details. |
| `action-store-business-bank-account` | Create a new business bank account. |
| `action-update-business-bank-account` | Update an existing business bank account. |
| `action-store-business-vat-id` | Create a new business VAT ID. Required to complete business onboarding. |
| `action-update-business-vat-id` | Update an existing business VAT ID. |
| `action-store-business-payment-term` | Create a new business payment term. |
| `store-product` | Create a new product or service. |
| `update-product` | Update an existing product or service. |
| `destroy-product` | Delete an existing product or service. |
| `store-product-price` | Create a new price for a product or service. |
| `update-product-price` | Update an existing price for a product or service. |
| `destroy-product-price` | Delete an existing price for a product or service. |
| `store-product-barcode` | Create a new barcode for a product. |
| `update-product-barcode` | Update an existing barcode for a product. |
| `destroy-product-barcode` | Delete an existing barcode from a product. |
| `store-product-inventory` | Create inventory tracking for a product. |
| `update-product-inventory` | Update the inventory record for a product. |
| `destroy-product-inventory` | Delete the inventory record for a product. |
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
| `store-counterpart-vat-id` | Create a new VAT ID for a counterpart. A counterpart can have multiple VAT IDs. |
| `update-counterpart-vat-id` | Update an existing VAT ID for a counterpart. |
| `destroy-counterpart-vat-id` | Delete an existing VAT ID for a counterpart. This removes only the VAT ID record; the counterpart's primary tax_id field is not affected. |
| `store-counterpart-address` | Create a new address for a counterpart. |
| `update-counterpart-address` | Update an existing address for a counterpart. |
| `destroy-counterpart-address` | Delete an existing address for a counterpart. |
| `store-payable-invoice` | Create a new payable invoice. Payable invoices are created with the status DRAFT. |
| `update-payable-invoice` | Update an existing payable invoice. Only DRAFT payable invoices can be updated. |
| `mark-as-new-payable-invoice` | Set the status of an existing payable invoice to **New**. |
| `approval-payable-invoice` | Set the status of an existing payable invoice to **Approval Pending**. |
| `approve-payable-invoice` | Set the status of an existing payable invoice to **Approved**. |
| `refuse-payable-invoice` | Set the status of an existing payable invoice to **Refused**. |
| `cancel-payable-invoice` | Set the status of an existing payable invoice to **Cancelled**. |
| `mark-as-paid-payable-invoice` | Set the status of an existing payable invoice to **Paid**. |
| `store-payable-credit-note` | Create a new payable credit note. Payable credit notes are created with the status DRAFT. |
| `update-payable-credit-note` | Update an existing payable credit note. Only DRAFT payable credit notes can be updated. |
| `mark-as-new-payable-credit-note` | Set the status of an existing payable credit note to **New**. |
| `approval-payable-credit-note` | Set the status of an existing payable credit note to **Approval Pending**. |
| `approve-payable-credit-note` | Set the status of an existing payable credit note to **Approved**. |
| `reject-payable-credit-note` | Set the status of an existing payable credit note to **Refused**. |
| `cancel-payable-credit-note` | Set the status of an existing payable credit note to **Cancelled**. |
| `apply-payable-credit-note` | Apply an existing payable credit note. Applying a credit note transitions it to the **Applied** status. |
| `destroy-payable` | Delete an existing payable. |
| `store-payable-purchase-order` | Create a new payable purchase order (PO). Purchase orders are created with the status DRAFT. |
| `update-payable-purchase-order` | Update an existing payable purchase order. Only DRAFT purchase orders can be updated. |
| `issue-payable-purchase-order` | Set the status of an existing payable purchase order to **Issued**. |
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
| `store-expense-receipt` | Create a new expense receipt. Expense receipts are created with the status DRAFT. |
| `update-expense-receipt` | Update an existing expense receipt. Only DRAFT expense receipts can be updated. |
| `destroy-expense` | Delete an existing expense. An expense can only be deleted when it is in a DRAFT state. |
| `add-expense-line-item` | Add a single line item to an existing expense. |
| `store-cost-center` | Create a new cost center for the current business. |
| `list-cost-centers` | List all cost centers for the current business, paginated. |
| `update-cost-center` | Update an existing cost center. |
| `list-ledger-accounts` | List all business bank accounts that are connected to the Formance Ledger. |
| `get-ledger-account-balance` | Get the current balance for a specific business bank account from the Formance Ledger. |
| `get-ledger-account-volumes` | Get the detailed volume breakdown (input, output, balance) per asset for a specific business bank account. |
| `list-ledger-transactions` | List transactions for a specific business bank account from the Formance Ledger. |
| `get-ledger-aggregated-balances` | Get aggregated balances across all accounts in the business ledger. |
| `get-ledger-stats` | Get aggregate statistics for the business ledger. |
| `record-ledger-transaction` | Record a financial transaction in the Formance Ledger for a business bank account. |
| `revert-ledger-transaction` | Revert a previously recorded ledger transaction by its numeric ID. |
| `create-business-ledger` | Create a Formance Ledger for the current business. |
| `connect-account-to-ledger` | Connect a business bank account to the Formance Ledger for double-entry bookkeeping. |
| `link-payment` | Link a ledger transaction to a document (expense, payable, or receivable) as a payment. |
| `unlink-payment` | Remove a payment link from a document. This hard-deletes the payment link record. |
| `list-unreconciled` | List documents that are not fully reconciled against ledger transactions. |
| `suggest-matches` | Suggest ledger transactions that may match a given document. |
| `get-payment-status` | Get the payment reconciliation status for a document. |
| `auto-reconcile-batch` | Auto-reconcile all unmatched documents against ledger transactions. |
| `upload-document-file` | Uploads a document file to storage, and associates it with a document. |
| `get-document-url` | Allow to retrieves documents URL from storage. Documents can be either receivables or payables. |
| `document-to-json` | Converts a PDF document to JSON using Google Document AI. |
| `notification-email` | Sends a notification email to one or more recipients. |
| `notification-in-app` | Sends an in-app notification to one or more users. |
| `notification-push` | Sends a push notification to one or more users. |
| `notification-slack` | Sends a notification message to a Slack channel via an incoming webhook. |
| `notification-teams` | Sends a notification message to a Microsoft Teams channel via an incoming webhook. |
| `get-headers` | Returns the column headers and all sheet names from an uploaded spreadsheet file. |
| `read-sheet` | Reads cell data from an uploaded spreadsheet file (XLSX, XLS, CSV, ODS). |
| `map-columns` | Maps raw column headers from an uploaded spreadsheet to a set of semantic target field names. |
| `write-sheet` | Generate a spreadsheet file from structured data and return a pre-signed download URL. |
| `write-pdf` | Generate a PDF from a pdfmake docDefinition and return a pre-signed download URL. |


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
