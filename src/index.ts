import { Reshuffle, BaseConnector, EventConfiguration } from 'reshuffle-base-connector'
import ImapClient from 'imap'
import { simpleParser } from 'mailparser'

export interface IMAPConnectorConfigOptions {
  host: string
  port: number
  user: string
  password: string
  tls: boolean
  tlsOptions: Record<string, any>
  mailbox: string
  markSeen: boolean
}

export interface IMAPConnectorEventOptions {
  name: string
}

class IMAPConnector extends BaseConnector<IMAPConnectorConfigOptions, IMAPConnectorEventOptions> {
  private imap: ImapClient
  private parser = simpleParser
  private readonly mailbox: string

  constructor(options: IMAPConnectorConfigOptions, id: string) {
    super(options, id)
    this.mailbox = options.mailbox || 'INBOX'
    this.imap = new ImapClient({
      ...options,
    })
  }

  onStart(app: Reshuffle) {
    this.imap.once('ready', () => {
      this.imap.openBox(this.mailbox, false, (error, mailbox) => {
        if (error) throw error

        this.imap.on('mail', (newMessageNumber: any) => {
          this.handleNewMessages()
        })
      })
    })

    this.imap.on('error', (err: any) => {
      console.error('IMAP error', err)
    })

    this.imap.once('end', () => {
      console.info('IMAP Connection ended')
    })
    this.imap.connect()
  }

  onStop() {
    this.imap.destroy()
  }

  on(options: IMAPConnectorEventOptions, eventId: string): EventConfiguration {
    if (!eventId) {
      eventId = `IMAP/${options.name}/${this.id}`
    }
    const event = new EventConfiguration(eventId, this, options)
    this.eventConfigurations[event.id] = event
    return event
  }

  onRemoveEvent(event: EventConfiguration) {
    delete this.eventConfigurations[event.id]
  }

  private imapReady() {
    this.imap.openBox(this.mailbox, false, (error, mailbox) => {
      if (error) throw error

      this.imap.on('mail', (newMessageNumber: any) => {
        this.handleNewMessages()
      })
    })
  }

  private handleNewMessages() {
    this.imap.search(['UNSEEN'], (error, results) => {
      if (error) throw error
      if (results.length === 0) return
      try {
        const fetched = this.imap.fetch(results, {
          markSeen: true,
          bodies: '',
        })
        fetched.on('message', (msg, _seqno) => {
          const event: any = {}
          msg.on('body', async (stream, _info) => {
            const parsed = await simpleParser(stream)
            event.mail = {
              headers: parsed.headers,
              body: {
                html: parsed.html,
                text: parsed.text,
                textAsHtml: parsed.textAsHtml,
              },
              seqno: _seqno,
            }
            this.app!.handleEvent('email', event)
          })
          msg.once('attributes', (attrs) => {
            event.date = attrs.date
            event.flags = attrs.flags
          })
          msg.once('end', () => {
            console.log(`IMAP connector ${this.id} parsed message`)
          })
        })
        fetched.on('error', (fetchErr) => {
          console.error(fetchErr, 'IMAP Connector Fetch error')
        })
        fetched.once('end', () => {
          console.info({}, 'IMAP Connector completed fetching new messages')
        })
      } catch (fetchErr) {
        console.error(fetchErr, 'IMAP Connector Fetch call error')
      }
    })
  }
}

export { IMAPConnector }
