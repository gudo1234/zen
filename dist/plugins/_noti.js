import { generateWAMessageFromContent } from "@whiskeysockets/baileys"
import fetch from "node-fetch"
import sharp from "sharp"

export default {
    name: ["noti"],
    help: ["noti <link del grupo> | <texto>"],
    desc: "Envía una notificación con ubicación, imagen y botón mencionando a todos.",
    tags: ["grupo"],
    admin: true,
    owner: true,

    run: async ({
        conn,
        m,
        text,
        prefijo,
        cmd
    }) => {

        if (!text?.trim())
            return m.reply(
                `${m.e.warn} Usa:\n${prefijo + cmd} <link del grupo> | <texto>`
            )

        const partes = text.split("|")

        const link = partes[0]?.trim()

        const texto = partes
            .slice(1)
            .join("|")
            .trim()

        if (!texto)
            return m.reply(
                `${m.e.warn} Debes colocar un texto después de |`
            )

        const match = link.match(
            /(?:https?:\/\/)?chat\.whatsapp\.com\/([0-9A-Za-z]+)/
        )

        if (!match)
            return m.reply(
                "❌ Debes colocar un enlace de grupo válido."
            )

        const groupCode = match[1]

        let targetChat = null

        try {
            const info =
                await conn.groupGetInviteInfo(groupCode)

            if (info?.id)
                targetChat = info.id

        } catch {}

        if (!targetChat) {
            try {
                const joined =
                    await conn.groupAcceptInvite(groupCode)

                if (
                    typeof joined === "string" &&
                    joined.includes("@g.us")
                ) {
                    targetChat = joined
                }

            } catch {}
        }

        if (!targetChat)
            return m.reply(
                "❌ No pude identificar el grupo. El enlace puede estar vencido, ser inválido o el bot no puede acceder al grupo."
            )

        const metadata =
            await conn
                .groupMetadata(targetChat)
                .catch(() => null)

        if (!metadata)
            return m.reply(
                "❌ No pude obtener la información del grupo."
            )

        const botJid =
            conn.user?.id ||
            conn.user?.jid

        const users =
            metadata.participants
                .map(u => u.id)
                .filter(
                    id =>
                        id &&
                        id !== botJid
                )

        if (!users.length)
            return m.reply(
                "❌ No encontré participantes para mencionar."
            )

        try {

            await m.react("🕒")

            const iconUrl =
                "https://raw.githubusercontent.com/CheirZ/Repo-img/main/zeus-jpeg/me.jpg"

            const response =
                await fetch(iconUrl)

            if (!response.ok)
                throw new Error(
                    `No se pudo descargar la imagen: ${response.status}`
                )

            const imageBuffer =
                Buffer.from(
                    await response.arrayBuffer()
                )

            const thumbnail =
                await sharp(imageBuffer)
                    .resize(300, 300, {
                        fit: "cover"
                    })
                    .jpeg({
                        quality: 80
                    })
                    .toBuffer()

            const rawContent = {
                buttonsMessage: {

                    locationMessage: {
                        degreesLatitude: 0,
                        degreesLongitude: 0,
                        jpegThumbnail: thumbnail
                    },

                    contentText: texto,

                    footerText: "Zentríx Bot",

                    buttons: [
                        {
                            buttonId: ".postularme",
                            buttonText: {
                                displayText: "ᴘᴏsᴛᴜʟᴀʀᴍᴇ"
                            },
                            type: 1
                        }
                    ],

                    headerType: 6
                }
            }

            const mensaje =
                generateWAMessageFromContent(
                    targetChat,
                    rawContent,
                    {
                        userJid: conn.user.id
                    }
                )

            await conn.relayMessage(
                targetChat,
                mensaje.message,
                {
                    messageId: mensaje.key.id
                }
            )

            await m.react("✅")

        } catch (error) {

            console.error(
                "❌ Error en noti:",
                error
            )

            await m.react("❌")
                .catch(() => {})

            return m.reply(
                `❌ No se pudo enviar la notificación.\n\n${error?.message || "Error desconocido."}`
            )
        }
    }
}
