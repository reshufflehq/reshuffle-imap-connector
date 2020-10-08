import { Reshuffle, BaseConnector, EventConfiguration } from 'reshuffle-base-connector'
import ImapClient from 'imap'
import { simpleParser } from 'mailparser'

export interface IMAPConnectorConfigOptions extends ImapClient.Config {
  markSeen: boolean
}

export interface IMAPConnectorEventOptions {
  mailbox?: string
}

export default class IMAPConnector extends BaseConnector<
  IMAPConnectorConfigOptions,
  IMAPConnectorEventOptions
> {
  private imap: ImapClient

  constructor(app: Reshuffle, options: IMAPConnectorConfigOptions, id?: string) {
    super(app, options, id)
    this.imap = new ImapClient({
      ...options,
    })
  }

  onStart(): void {
    this.imap.once('ready', () => {
      Object.values(this.eventConfigurations).forEach((event) => {
        this.imap.openBox(event.options.mailbox, false, (error: Error) => {
          if (error) throw error

          this.imap.on('mail', () => {
            this.handleNewMessages(event)
          })
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
    options.mailbox = options.mailbox || 'INBOX'
    if (!eventId) {
      eventId = `IMAP/${options.mailbox}/${this.id}`
    }
    const event = new EventConfiguration(eventId, this, options)
    this.eventConfigurations[event.id] = event

    this.app.when(event, handler)
    return event
  }

  private handleNewMessages(event: any) {
    this.imap.search(['UNSEEN'], (error, results) => {
      if (error) throw error
      if (results.length === 0) return
      try {
        const fetched = this.imap.fetch(results, {
          markSeen: this.configOptions ? this.configOptions.markSeen : true,
          bodies: '',
        })
        fetched.on('message', (msg, seqno) => {
          msg.on('body', async (stream) => {
            const parsed = await simpleParser(stream)

            await this.app.handleEvent(event.id, {
              ...event,
              mailbox: event.options.mailbox,
              mail: {
                headers: parsed.headers,
                body: {
                  html: parsed.html,
                  text: parsed.text,
                  textAsHtml: parsed.textAsHtml,
                },
                seqno,
              },
            })
          })
          msg.once('attributes', (attrs) => {
            event.date = attrs.date
            event.flags = attrs.flags
          })
          msg.once('end', () => {
            this.app.getLogger().info(`IMAP connector ${this.id} parsed message`)
          })
        })
        fetched.on('error', (fetchErr) => {
          this.app.getLogger().error('IMAP Connector Fetch error', fetchErr)
        })
        fetched.once('end', () => {
          this.app.getLogger().info('IMAP Connector completed fetching new messages')
        })
      } catch (fetchErr) {
        this.app.getLogger().error(fetchErr, 'IMAP Connector Fetch call error')
      }
    })
  }
}

export { IMAPConnector }
