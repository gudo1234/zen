import { prepareWAMessageMedia, generateWAMessageFromContent } from "@whiskeysockets/baileys"

export default {
    name: ["noti2"],
    help: ["noti2 <link del grupo> | <texto> | <imagen> | <botón> | <número> | <texto WhatsApp>"],
    desc: "Envía una notificación con foto, botón y menciona a todos.",
    tags: ["g"],
    //group: true,
    //admin: true,
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
                `${m.e.warn} Usa:\n${prefijo + cmd} <link grupo> | <texto> | <imagen> | <botón> | <número> | <texto WhatsApp>`
            )

        const partes =
            text.split("|").map(x => x.trim())

        const link =
            partes[0]

        const texto =
            partes[1]

        const imagen =
            partes[2]

        const displayText =
            partes[3]

        const numero =
            partes[4]

        const textoWhatsApp =
            partes[5]

        if (!texto)
            return m.reply(
                `${m.e.warn} Debes colocar el texto de la notificación.`
            )

        if (!imagen)
            return m.reply(
                `${m.e.warn} Debes colocar el link de la imagen.`
            )

        if (!displayText)
            return m.reply(
                `${m.e.warn} Debes colocar el texto que aparecerá en el botón.`
            )

        if (!numero)
            return m.reply(
                `${m.e.warn} Debes colocar el número de WhatsApp.`
            )

        if (!textoWhatsApp)
            return m.reply(
                `${m.e.warn} Debes colocar el texto que abrirá WhatsApp.`
            )

        const match =
            link.match(
                /(?:https?:\/\/)?chat\.whatsapp\.com\/([0-9A-Za-z]+)/
            )

        if (!match)
            return m.reply(
                "❌ Debes colocar un enlace de grupo válido."
            )

        const groupCode =
            match[1]

        const numeroLimpio =
            numero.replace(/\D/g, "")

        if (!numeroLimpio)
            return m.reply(
                "❌ El número de WhatsApp no es válido."
            )

        const textoUrl =
            encodeURIComponent(textoWhatsApp)
                .replace(/%20/g, "+")

        const urlBoton =
            `https://wa.me/${numeroLimpio}?text=${textoUrl}`

        let targetChat = null

        try {

            const info =
                await conn.groupGetInviteInfo(
                    groupCode
                )

            if (info?.id)
                targetChat =
                    info.id

        } catch {}

        if (!targetChat) {

            try {

                const joined =
                    await conn.groupAcceptInvite(
                        groupCode
                    )

                if (
                    typeof joined === "string" &&
                    joined.includes("@g.us")
                ) {
                    targetChat =
                        joined
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

            const imageBuffer =
                Buffer.from(
                    await (
                        await fetch(
                            imagen
                        )
                    ).arrayBuffer()
                )

            const media =
                await prepareWAMessageMedia(
                    {
                        image: imageBuffer
                    },
                    {
                        upload:
                            conn.waUploadToServer
                    }
                )

            const mensaje =
                generateWAMessageFromContent(
                    targetChat,
                    {
                        interactiveMessage: {

                            header: {
                                title: "",
                                hasMediaAttachment: true,
                                imageMessage:
                                    media.imageMessage
                            },

                            body: {
                                text: ""
                            },

                            footer: {
                                text: texto
                            },

                            nativeFlowMessage: {

                                buttons: [
                                    {
                                        name: "cta_url",

                                        buttonParamsJson:
                                            JSON.stringify({
                                                display_text:
                                                    displayText,
                                                url:
                                                    urlBoton
                                            })
                                    }
                                ]
                            },

                            contextInfo: {
                                mentionedJid:
                                    users
                            }
                        }
                    },
                    {
                        userJid:
                            conn.user.id,
                        quoted: null
                    }
                )

            await conn.relayMessage(
                targetChat,
                mensaje.message,
                {
                    messageId:
                        mensaje.key.id
                }
            )

            await m.react("✅")

        } catch (error) {

            console.error(
                "❌ Error en noti2:",
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
