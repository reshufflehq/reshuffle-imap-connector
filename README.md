# reshuffle-imap-connector

### Reshuffle IMAP Connector

This connector provides the Reshuffle framework with IMAP email fetching capabilities.

#### Configuration Options:
```typescript
interface IMAPConnectorConfigOptions {
  host: string // The imap host
  port: number // The imap port
  user: string // User to the host. This is normally an email address
  password: // User password
  tls: boolean // Whether to use TLS to the server
  tlsOptions: Record<string, any> // Any TLS options required by the server
  mailbox: string // Name of inbox to fetch. Defaults to `INBOX` if omitted. 
  markSeen: boolean // Whether the connector should mark the messages as seen after fetched
}
```

#### Connector events
##### Email Received (default)
The connector fires this event when an email arrives.
###### Email Received Event configuration 
No configuration required.
