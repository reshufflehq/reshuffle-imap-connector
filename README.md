# reshuffle-imap-connector

[Code](https://github.com/reshufflehq/reshuffle-imap-connector) |  [npm](https://www.npmjs.com/package/reshuffle-imap-connector)

`npm install reshuffle-imap-connector`

### Reshuffle IMAP Connector


This is a [Reshuffle](https://dev.reshuffle.com) connector that lets you use IMAP email fetching capabilities.

The following example listens to an incoming email:

```js
const { Reshuffle } = require('reshuffle')
const { IMAPConnector } = require('reshuffle-imap-connector')

// Can easily be tested using https://ethereal.email/

const app = new Reshuffle()
const imap = new IMAPConnector(
  app,
  {
    host: '<imap host>',
    port: 993,
    user: '<inbox email address>',
    password: '<inbox password>',
    tls: true,
    // tlsOptions: Record<string, any>
    markSeen: false,
  },
  'connectors/IMAP',
)

imap.on({ name: 'email' }, 'email', (event) => {
  console.log(event.mail.body.text)
})

app.start()
```

#### Configuration Options:
```typescript
interface IMAPConnectorConfigOptions {
  host: string // The imap host
  port: number // The imap port
  user: string // User to the host. This is normally an email address
  password: string // User password
  tls: boolean // Whether to use TLS to the server
  tlsOptions: Record<string, any> // Any TLS options required by the server 
  markSeen: boolean // Whether the connector should mark the messages as seen after fetched
}
```

#### Connector events
##### Email Received (default)
The connector fires this event when an email arrives.

Usage:
```js
const options = { mailbox:'INBOX' }
const handler = (event) => {
                
// event is an object with
// {
//    mailbox
//    mail: {
//      headers
//      body: {
//        html
//        text
//        textAsHtml
//      }
//    }
//  }
}
myImapConnector.on(options, handler)
```

###### Email Received Event configuration 
The event configuration takes an attribute mailbox (which is usually a folder in your email client).
Default mailbox is 'INBOX'

Example on how to use this connector can be [found here](https://github.com/reshufflehq/reshuffle/blob/master/examples/email/IMAPReceiveEmailExample.js).