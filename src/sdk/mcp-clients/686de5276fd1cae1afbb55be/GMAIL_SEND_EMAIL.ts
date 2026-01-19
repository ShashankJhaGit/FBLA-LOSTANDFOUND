import { callMCPTool } from '@/sdk/core/mcp-client';

/**
 * MCP Response wrapper interface - MANDATORY
 * All MCP tools return responses in this wrapped format
 */
interface MCPToolResponse {
  content: Array<{
    type: "text";
    text: string; // JSON string containing actual tool data
  }>;
}

/**
 * Input parameters for sending an email via Gmail
 */
export interface SendEmailParams {
  /**
   * File to attach; ensure `s3key`, `mimetype`, and `name` are set if provided. 
   * Omit or set to null for no attachment.
   */
  attachment?: string | null;
  
  /**
   * Blind Carbon Copy (BCC) recipients' email addresses. 
   * At least one of cc, bcc, or recipient_email must be provided.
   * @example ["auditor@example.com"]
   */
  bcc?: string[];
  
  /**
   * Email content (plain text or HTML). 
   * Either subject or body must be provided for the email to be sent. 
   * If HTML, `is_html` must be `true`.
   * @example "Hello team, let's discuss the project updates tomorrow."
   * @example "<h1>Welcome!</h1><p>Thank you for signing up.</p>"
   */
  body?: string | null;
  
  /**
   * Carbon Copy (CC) recipients' email addresses. 
   * At least one of cc, bcc, or recipient_email must be provided.
   * @example ["manager@example.com", "teamlead@example.com"]
   */
  cc?: string[];
  
  /**
   * Additional 'To' recipients' email addresses (not Cc or Bcc). 
   * Should only be used if recipient_email is also provided.
   * @example ["jane.doe@example.com", "support@example.com"]
   */
  extra_recipients?: string[];
  
  /**
   * Set to `true` if the email body contains HTML tags.
   * @default false
   */
  is_html?: boolean;
  
  /**
   * Primary recipient's email address. 
   * Required if cc and bcc is not provided, else can be optional. 
   * Use extra_recipients if you want to send to multiple recipients.
   * @example "john@doe.com"
   */
  recipient_email?: string | null;
  
  /**
   * Subject line of the email. 
   * Either subject or body must be provided for the email to be sent.
   * @example "Project Update Meeting"
   * @example "Your Weekly Newsletter"
   */
  subject?: string | null;
  
  /**
   * User's email address; the literal 'me' refers to the authenticated user.
   * @default "me"
   * @example "user@example.com"
   * @example "me"
   */
  user_id?: string;
}

/**
 * Data returned after successfully sending an email via Gmail
 */
export interface SendEmailData {
  /**
   * The ID of the last history record that modified this message.
   */
  historyId?: string | null;
  
  /**
   * The immutable ID of the sent message.
   */
  id?: string | null;
  
  /**
   * The internal timestamp of the message in milliseconds since epoch.
   */
  internalDate?: string | null;
  
  /**
   * List of IDs of labels applied to this message.
   */
  labelIds?: string[] | null;
  
  /**
   * The parsed email structure, including headers and body parts.
   */
  payload?: Record<string, any> | null;
  
  /**
   * The entire email message in RFC 2822 format, base64url-encoded.
   */
  raw?: string | null;
  
  /**
   * Estimated size of the message in bytes.
   */
  sizeEstimate?: number | null;
  
  /**
   * A short extract of the message text.
   */
  snippet?: string | null;
  
  /**
   * The ID of the thread the message belongs to.
   */
  threadId?: string | null;
}

/**
 * Internal response wrapper interface from outputSchema
 */
interface SendEmailResponse {
  /**
   * Whether or not the action execution was successful or not
   */
  successful: boolean;
  
  /**
   * Data from the action execution
   */
  data?: SendEmailData;
  
  /**
   * Error if any occurred during the execution of the action
   */
  error?: string | null;
}

/**
 * Sends an email via Gmail with support for attachments, CC, BCC, and HTML content.
 * 
 * At least one recipient must be specified (recipient_email, cc, or bcc).
 * Either subject or body must be provided for the email to be sent.
 *
 * @param params - The input parameters for sending the email
 * @returns Promise resolving to the sent email data including message ID and thread ID
 * @throws Error if required parameters are missing or if the tool execution fails
 *
 * @example
 * const result = await request({
 *   recipient_email: 'john@doe.com',
 *   subject: 'Project Update',
 *   body: 'Hello team, let\'s discuss the project updates tomorrow.',
 *   user_id: 'me'
 * });
 */
export async function request(params: SendEmailParams): Promise<SendEmailData> {
  // Validate that at least one recipient is provided
  const hasRecipient = params.recipient_email || 
                       (params.cc && params.cc.length > 0) || 
                       (params.bcc && params.bcc.length > 0);
  
  if (!hasRecipient) {
    throw new Error('At least one recipient must be provided (recipient_email, cc, or bcc)');
  }
  
  // Validate that either subject or body is provided
  if (!params.subject && !params.body) {
    throw new Error('Either subject or body must be provided for the email to be sent');
  }
  
  // CRITICAL: Use MCPToolResponse and parse JSON response
  const mcpResponse = await callMCPTool<MCPToolResponse, SendEmailParams>(
    '686de5276fd1cae1afbb55be',
    'GMAIL_SEND_EMAIL',
    params
  );
  
  if (!mcpResponse.content?.[0]?.text) {
    throw new Error('Invalid MCP response format: missing content[0].text');
  }
  
  let toolData: SendEmailResponse;
  try {
    toolData = JSON.parse(mcpResponse.content[0].text);
  } catch (parseError) {
    throw new Error(
      `Failed to parse MCP response JSON: ${
        parseError instanceof Error ? parseError.message : 'Unknown error'
      }`
    );
  }
  
  if (!toolData.successful) {
    throw new Error(toolData.error || 'MCP tool execution failed');
  }
  
  if (!toolData.data) {
    throw new Error('MCP tool returned successful response but no data');
  }
  
  return toolData.data;
}