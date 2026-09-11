export default {
    name: ["siu"],
    help: ["siu <link del grupo> <texto>"],
    desc: "Envía un mensaje multimedia citado a otro grupo mencionando a todos.",
    tags: ["rupo"],
    group: true,
    admin: true,
    owner: true,
    run: async ({ conn, m, text, args, prefijo, cmd }) => {

        if (!text?.trim())
            return m.reply(
                `${m.e.warn} Usa:\n${prefijo + cmd} <link del grupo> <texto>`
            )

        if (!m.quoted || !m.quoted.message)
            return m.reply(
                `${m.e.warn} Debes responder a un mensaje multimedia.`
            )

        const link = text.match(
            /(?:https?:\/\/)?chat\.whatsapp\.com\/([0-9A-Za-z]+)/
        )

        if (!link)
            return m.reply("❌ Debes colocar un enlace de grupo válido.")

        const groupCode = link[1]

        let caption = text
            .replace(link[0], "")
            .trim()

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

        const quotedMsg = m.quoted.message || {}

        const quotedType = Object.keys(quotedMsg).find(key =>
            [
                "imageMessage",
                "videoMessage",
                "audioMessage",
                "stickerMessage",
                "documentMessage"
            ].includes(key)
        )

        if (!quotedType)
            return m.reply(
                "❌ El mensaje citado no contiene multimedia compatible."
            )

        try {
            const media = await m.quoted.download()

            const msg = {
                contextInfo: {
                    mentionedJid: users
                }
            }

            switch (quotedType) {

                case "imageMessage":
                    msg.image = media

                    if (caption)
                        msg.caption = caption

                    break

                case "videoMessage":
                    msg.video = media

                    if (caption)
                        msg.caption = caption

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

                    if (caption)
                        msg.caption = caption

                    break
            }

            await conn.sendMessage(
                targetChat,
                msg,
                { quoted: null }
            )

            if (
                quotedType === "stickerMessage" &&
                caption
            ) {
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
