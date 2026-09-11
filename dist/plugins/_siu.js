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

        const quotedMsg = m.quoted?.message || {}

        const quotedType = Object.keys(quotedMsg).find(key =>
            [
                "imageMessage",
                "videoMessage",
                "audioMessage",
                "stickerMessage",
                "documentMessage"
            ].includes(key)
        )

        if (!quotedType) {

            if (!caption)
                return m.reply(
                    `${m.e.warn} Debes escribir un texto después de |`
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

            const media = await m.quoted.download()

            const msg = {
                contextInfo: {
                    mentionedJid: users
                }
            }

            let quotedCaption = ""

            if (quotedType === "imageMessage")
                quotedCaption = quotedMsg.imageMessage?.caption || ""

            else if (quotedType === "videoMessage")
                quotedCaption = quotedMsg.videoMessage?.caption || ""

            else if (quotedType === "documentMessage")
                quotedCaption = quotedMsg.documentMessage?.caption || ""

            const finalCaption =
                caption ||
                quotedCaption

            switch (quotedType) {

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
                        m.quoted.fileName || "archivo"
                    msg.mimetype =
                        m.quoted.mimetype ||
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
                quotedType === "stickerMessage" &&
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
