import { spawn } from "child_process"

function convertirAVozWhatsApp(buffer) {
    return new Promise((resolve, reject) => {

        const ffmpeg = spawn("ffmpeg", [
            "-hide_banner",
            "-loglevel", "error",
            "-i", "pipe:0",
            "-vn",
            "-c:a", "libopus",
            "-b:a", "64k",
            "-ar", "48000",
            "-ac", "1",
            "-application", "voip",
            "-f", "ogg",
            "pipe:1"
        ])

        const chunks = []
        const errors = []

        ffmpeg.stdout.on("data", chunk => {
            chunks.push(chunk)
        })

        ffmpeg.stderr.on("data", chunk => {
            errors.push(chunk)
        })

        ffmpeg.on("error", err => {
            reject(err)
        })

        ffmpeg.on("close", code => {

            if (code !== 0) {
                const error = Buffer.concat(errors).toString()

                return reject(
                    new Error(
                        error || `FFmpeg terminó con código ${code}`
                    )
                )
            }

            const output = Buffer.concat(chunks)

            if (!output.length)
                return reject(
                    new Error("FFmpeg no generó ningún audio.")
                )

            resolve(output)
        })

        ffmpeg.stdin.on("error", () => {})

        ffmpeg.stdin.end(buffer)
    })
}

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

        let targetChat = null

        try {
            const inviteInfo = await conn.groupGetInviteInfo(groupCode)

            if (inviteInfo?.id)
                targetChat = inviteInfo.id

        } catch (err) {
            console.log(
                "⚠️ No se pudo obtener la información de la invitación."
            )
        }

        try {
            const joined = await conn.groupAcceptInvite(groupCode)

            if (
                typeof joined === "string" &&
                joined.includes("@g.us")
            ) {
                targetChat = joined
            }

        } catch (err) {
            console.log(
                "⚠️ El bot posiblemente ya está en el grupo."
            )
        }

        if (!targetChat)
            return m.reply(
                "❌ No pude identificar el grupo. El enlace puede estar vencido, ser inválido o el bot no puede acceder al grupo."
            )

        const metadata = await conn.groupMetadata(targetChat)
            .catch(() => null)

        if (!metadata)
            return m.reply(
                "❌ No pude obtener la información del grupo. Verifica que el bot pueda acceder al grupo."
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

            if (!media)
                throw new Error(
                    "No se pudo descargar el multimedia."
                )

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

                case "audioMessage": {

                    await m.react("🕒")

                    console.log(
                        "🎙️ Convirtiendo audio a OGG/Opus para nota de voz..."
                    )

                    const voice = await convertirAVozWhatsApp(media)

                    msg.audio = voice
                    msg.ptt = true
                    msg.mimetype = "audio/ogg; codecs=opus"

                    const audioInfo =
                        mediaMsg.audioMessage || {}

                    if (audioInfo.seconds)
                        msg.seconds = audioInfo.seconds

                    break
                }

                case "
