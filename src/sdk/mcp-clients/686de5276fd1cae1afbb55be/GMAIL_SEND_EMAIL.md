# Gmail Send Email - MCP Tool

Send emails via Gmail with support for attachments, CC, BCC, and HTML content.

## Import

```typescript
import { request as sendGmailEmail } from '@/sdk/mcp-clients/686de5276fd1cae1afbb55be/GMAIL_SEND_EMAIL';
import type { SendEmailParams, SendEmailData } from '@/sdk/mcp-clients/686de5276fd1cae1afbb55be/GMAIL_SEND_EMAIL';
```

## Function Signature

```typescript
async function sendGmailEmail(params: SendEmailParams): Promise<SendEmailData>
```

## Parameters

### `SendEmailParams`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `recipient_email` | `string \| null` | Conditional* | Primary recipient's email address |
| `subject` | `string \| null` | Conditional** | Subject line of the email |
| `body` | `string \| null` | Conditional** | Email content (plain text or HTML) |
| `cc` | `string[]` | No | Carbon Copy recipients |
| `bcc` | `string[]` | No | Blind Carbon Copy recipients |
| `extra_recipients` | `string[]` | No | Additional 'To' recipients |
| `is_html` | `boolean` | No | Set to `true` if body contains HTML (default: `false`) |
| `attachment` | `string \| null` | No | File path to attach |
| `user_id` | `string` | No | User's email or 'me' for authenticated user (default: `"me"`) |

**Conditional Requirements:**
- *At least one of `recipient_email`, `cc`, or `bcc` must be provided
- **Either `subject` or `body` must be provided

## Return Value

### `SendEmailData`

```typescript
{
  id?: string | null;              // Immutable ID of the sent message
  threadId?: string | null;        // Thread ID the message belongs to
  historyId?: string | null;       // Last history record ID
  internalDate?: string | null;    // Internal timestamp (ms since epoch)
  labelIds?: string[] | null;      // Applied label IDs
  snippet?: string | null;         // Short extract of message text
  sizeEstimate?: number | null;    // Estimated size in bytes
  raw?: string | null;             // RFC 2822 format, base64url-encoded
  payload?: Record<string, any> | null; // Parsed email structure
}
```

## Usage Examples

### Basic Email

```typescript
const result = await sendGmailEmail({
  recipient_email: 'john@example.com',
  subject: 'Project Update',
  body: 'Hello team, let\'s discuss the project updates tomorrow.',
  user_id: 'me'
});

console.log('Email sent with ID:', result.id);
console.log('Thread ID:', result.threadId);
```

### HTML Email with CC and BCC

```typescript
const result = await sendGmailEmail({
  recipient_email: 'john@example.com',
  cc: ['manager@example.com', 'teamlead@example.com'],
  bcc: ['auditor@example.com'],
  subject: 'Weekly Newsletter',
  body: '<h1>Welcome!</h1><p>Thank you for signing up.</p>',
  is_html: true,
  user_id: 'me'
});
```

### Multiple Recipients

```typescript
const result = await sendGmailEmail({
  recipient_email: 'primary@example.com',
  extra_recipients: ['jane.doe@example.com', 'support@example.com'],
  subject: 'Team Announcement',
  body: 'Important update for everyone.',
  user_id: 'me'
});
```

### Email with Attachment

```typescript
const result = await sendGmailEmail({
  recipient_email: 'client@example.com',
  subject: 'Invoice',
  body: 'Please find the invoice attached.',
  attachment: '/path/to/invoice.pdf',
  user_id: 'me'
});
```

### CC/BCC Only (No Primary Recipient)

```typescript
const result = await sendGmailEmail({
  cc: ['team@example.com'],
  subject: 'FYI: Project Status',
  body: 'Just keeping everyone in the loop.',
  user_id: 'me'
});
```

## Error Handling

The function throws errors in the following cases:

- **Missing Recipients**: No recipient_email, cc, or bcc provided
- **Missing Content**: Neither subject nor body provided
- **MCP Response Error**: Invalid response format from MCP tool
- **JSON Parse Error**: Failed to parse MCP response
- **Tool Execution Error**: MCP tool returned unsuccessful status
- **Missing Data**: Tool succeeded but returned no data

```typescript
try {
  const result = await sendGmailEmail({
    recipient_email: 'john@example.com',
    subject: 'Test Email',
    body: 'This is a test.'
  });
  console.log('Email sent successfully:', result.id);
} catch (error) {
  console.error('Failed to send email:', error.message);
}
```

## Notes

- The `user_id` parameter defaults to `"me"` which refers to the authenticated user
- When using HTML content, always set `is_html: true`
- The `extra_recipients` field should only be used when `recipient_email` is also provided
- File attachments require proper `s3key`, `mimetype`, and `name` properties to be set
- The returned `snippet` provides a short preview of the email content
- The `threadId` can be used to track email conversations