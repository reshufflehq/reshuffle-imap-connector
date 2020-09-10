import { Reshuffle, BaseConnector, EventConfiguration } from 'reshuffle-base-connector'
import ImapClient from 'imap'
import { simpleParser } from 'mailparser'

export interface IMAPConnectorConfigOptions extends ImapClient.Config {
  mailbox?: string
  markSeen: boolean
}

export interface IMAPConnectorEventOptions {
  name: string
}

export default class IMAPConnector extends BaseConnector<
  IMAPConnectorConfigOptions,
  IMAPConnectorEventOptions
> {
  private imap: ImapClient
  private readonly mailbox: string

  constructor(app: Reshuffle, options: IMAPConnectorConfigOptions, id?: string) {
    super(app, options, id)
    this.mailbox = options.mailbox || 'INBOX'
    this.imap = new ImapClient({
      ...options,
    })
  }

  onStart(): void {
    this.imap.once('ready', () => {
      this.imap.openBox(this.mailbox, false, (error: Error) => {
        if (error) throw error

        this.imap.on('mail', () => {
          this.handleNewMessages()
        })
      })
    })

    this.imap.on('error', (err: Error) => {
      console.error('IMAP error', err)
    })

    this.imap.once('end', () => {
      console.info('IMAP Connection ended')
    })
    this.imap.connect()
  }

  onStop(): void {
    this.imap.destroy()
  }

  on(options: IMAPConnectorEventOptions, handler: any, eventId: string): EventConfiguration {
    if (!eventId) {
      eventId = `IMAP/${options.name}/${this.id}`
    }
    const event = new EventConfiguration(eventId, this, options)
    this.eventConfigurations[event.id] = event

    this.app.when(event, handler)
    return event
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
          msg.on('body', async (stream) => {
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
            await this.app.handleEvent('email', event)
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
