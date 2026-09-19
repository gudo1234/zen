import { prepareWAMessageMedia, generateWAMessageFromContent } from "@whiskeysockets/baileys"

export default {
    name: ["noti"],
    help: ["noti <link del grupo> | <texto>"],
    desc: "Envía una notificación con foto y botón mencionando a todos.",
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
                `${m.e.warn} Usa:\n${prefijo + cmd} <link del grupo> | <texto>`
            )

        const partes =
            text.split("|")

        const link =
            partes[0]?.trim()

        const texto =
            partes
                .slice(1)
                .join("|")
                .trim()

        if (!texto)
            return m.reply(
                `${m.e.warn} Debes colocar un texto después de |`
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
                            "https://raw.githubusercontent.com/edar123/im/main/media/me24.jpg"
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
                                                    "ᴘᴏsᴛᴜʟᴀʀᴍᴇ",
                                                url:
                                                    "https://wa.me/50492280729?text=Hola+quiero+postularme+para+admin+🙂‍↔️"
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
