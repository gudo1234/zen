export default {
    name: ["siu"],
    help: ["siu <link del grupo> | <texto>"],
    desc: "Envía texto o multimedia a otro grupo mencionando a todos.",
    tags: ["rupo"],
    group: true,
    admin: true,
    owner: true,
    run: async ({ conn, m, text, args, prefijo, cmd }) => {

        if (!text?.trim())
            return m.reply(
                `${m.e.warn} Usa:\n${prefijo + cmd} <link del grupo> | <texto>`
            )

        const partes = text.split("|")

        const link = partes[0]?.trim()
        const caption = partes.slice(1).join("|").trim()

        const match = link.match(
            /(?:https?:\/\/)?chat\.whatsapp\.com\/([0-9A-Za-z]+)/
        )

        if (!match)
            return m.reply("❌ Debes colocar un enlace de grupo válido.")

        const groupCode = match[1]

        const targetChat = await conn.groupAcceptInvite(groupCode)
            .catch(() => groupCode)

        if (!targetChat)
            return m.reply(
                "❌ No pude unirme al grupo. El enlace puede estar vencido o ser privado."
            )

        const metadata = await conn.groupMetadata(targetChat)
            .catch(() => null)

        if (!metadata)
            return m.reply(
                "❌ No pude obtener la información del grupo."
            )

        const users = metadata.participants
            .map(u => u.id)
            .filter(id => id !== conn.user.jid)

        let mediaSource = null
        let mediaMsg = null
        let mediaType = null

        const currentMsg = m.message || {}

        mediaType = Object.keys(currentMsg).find(key =>
            [
                "imageMessage",
                "videoMessage",
                "audioMessage",
                "stickerMessage",
                "documentMessage"
            ].includes(key)
        )

        if (mediaType) {
            mediaSource = m
            mediaMsg = currentMsg
        }

        if (!mediaType && m.quoted?.message) {

            const quotedMsg = m.quoted.message

            mediaType = Object.keys(quotedMsg).find(key =>
                [
                    "imageMessage",
                    "videoMessage",
                    "audioMessage",
                    "stickerMessage",
                    "documentMessage"
                ].includes(key)
            )

            if (mediaType) {
                mediaSource = m.quoted
                mediaMsg = quotedMsg
            }
        }

        if (!mediaType) {

            if (!caption)
                return m.reply(
                    `${m.e.warn} Debes escribir un texto después de | o responder a un multimedia.`
                )

            await conn.sendMessage(
                targetChat,
                {
                    text: caption,
                    contextInfo: {
                        mentionedJid: users
                    }
                },
                { quoted: null }
            )

            await m.react("✅")
            return
        }

        try {

            const media = await mediaSource.download()

            const msg = {
                contextInfo: {
                    mentionedJid: users
                }
            }

            let mediaCaption = ""

            if (mediaType === "imageMessage")
                mediaCaption =
                    mediaMsg.imageMessage?.caption || ""

            else if (mediaType === "videoMessage")
                mediaCaption =
                    mediaMsg.videoMessage?.caption || ""

            else if (mediaType === "documentMessage")
                mediaCaption =
                    mediaMsg.documentMessage?.caption || ""

            const finalCaption =
                caption ||
                mediaCaption ||
                ""

            switch (mediaType) {

                case "imageMessage":

                    msg.image = media

                    if (finalCaption)
                        msg.caption = finalCaption

                    break

                case "videoMessage":

                    msg.video = media

                    if (finalCaption)
                        msg.caption = finalCaption

                    break

                case "audioMessage":

                    msg.audio = media
                    msg.ptt = true
                    msg.fileName = "siu.mp3"
                    msg.mimetype = "audio/mp4"

                    break

                case "stickerMessage":

                    msg.sticker = media

                    break

                case "documentMessage":

                    msg.document = media

                    msg.fileName =
                        mediaMsg.documentMessage?.fileName ||
                        mediaSource.fileName ||
                        "archivo"

                    msg.mimetype =
                        mediaMsg.documentMessage?.mimetype ||
                        mediaSource.mimetype ||
                        "application/octet-stream"

                    if (finalCaption)
                        msg.caption = finalCaption

                    break
            }

            await conn.sendMessage(
                targetChat,
                msg,
                { quoted: null }
            )

            if (
                mediaType === "stickerMessage" &&
                finalCaption
            ) {
                await conn.sendMessage(
                    targetChat,
                    {
                        text: finalCaption,
                        contextInfo: {
                            mentionedJid: users
                        }
                    },
                    { quoted: null }
                )
            }

            await m.react("✅")

        } catch (err) {

            console.error("❌ Error en siu:", err)

            return m.reply(
                "❌ No pude descargar o enviar el multimedia."
            )
        }
    }
}
