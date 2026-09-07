import { proto, WASocket } from "@whiskeysockets/baileys"

declare module "@whiskeysockets/baileys" {
  interface WASocket {
    isMainBot?: boolean
    Subconnection?: boolean
    userId?: string
  }
}

declare module "@whiskeysockets/baileys/lib/Types" {
  interface IWebMessageInfo {
    chat?: string
    db?: any
    quoted?: any
    mentionedJid?: string[]
    mimetype?: string
    lid?: string
    sender?: string
    isGroup?: boolean
    id?: string
    react?: (emoji: string) => Promise<any>
    download?: () => Promise<Buffer | null>
  }
}
