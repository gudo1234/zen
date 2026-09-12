import ffmpeg from "fluent-ffmpeg"
import fs from "fs/promises"
import os from "os"
import path from "path"
import crypto from "crypto"

function convertirNotaDeVoz(buffer, extension = "audio") {
    return new Promise(async (resolve, reject) => {

        const id = crypto.randomBytes(8).toString("hex")
        const dir = await fs.mkdtemp(
            path.join(os.tmpdir(), `siu-${id}-`)
        )

        const input = path.join(dir, `input.${extension}`)
        const output = path.join(dir, "voice.ogg")

        try {

            await fs.writeFile(input, buffer)

            ffmpeg(input)
                .noVideo()
                .audioCodec("libopus")
                .audioBitrate("64k")
                .audioChannels(1)
                .audioFrequency(48000)
                .outputOptions([
                    "-application", "voip",
                    "-compression_level", "10"
                ])
                .format("ogg")
                .on("error", async err => {

                    try {
                        await fs.rm(dir, {
                            recursive: true,
                            force: true
                        })
                    } catch {}

                    reject(err)
                })
                .on("end", async () => {

                    try {

                        const result =
                            await fs.readFile(output)

                        await fs.rm(dir, {
                            recursive: true,
                            force: true
                        })

                        if (!result?.length)
                            return reject(
                                new Error(
                                    "FFmpeg no produjo ningún audio."
                                )
                            )

                        resolve(result)

                    } catch (err) {
                        reject(err)
                    }
                })
                .save(output)

        } catch (err) {

            try {
                await fs.rm(dir, {
                    recursive: true,
                    force: true
                })
            } catch {}

            reject(err)
        }
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
            return m.reply(
                "❌ Debes colocar un enlace de grupo válido."
            )

        const groupCode = match[1]

        let targetChat = null

        try {

            const inviteInfo =
                await conn.groupGetInviteInfo(groupCode)

            if (inviteInfo?.id)
                targetChat = inviteInfo.id

        } catch (err) {

            console.log(
                "⚠️ No se pudo obtener la información de la invitación."
            )
        }

        try {

            const joined =
                await conn.groupAcceptInvite(groupCode)

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

        const metadata =
            await conn.groupMetadata(targetChat)
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
                {
                    quoted: null
                }
            )

            await m.react("✅")

            return
        }

        try {

            await m.react("🕒")

            const media =
                await mediaSource.download()

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

                case "imageMessage": {

                    msg.image = media

                    if (finalCaption)
                        msg.caption = finalCaption

                    break
                }

                case "videoMessage": {

                    msg.video = media

                    if (finalCaption)
                        msg.caption = finalCaption

                    break
                }

                case "audioMessage": {

                    const audioInfo =
                        mediaMsg.audioMessage || {}

                    let voice = media

                    const originalMime =
                        audioInfo.mimetype ||
                        mediaSource.mimetype ||
                        ""

                    const yaEsOpus =
                        originalMime.includes("ogg") &&
                        originalMime.includes("opus")

                    if (!yaEsOpus) {

                        console.log(
                            "🎙️ Convirtiendo audio a nota de voz..."
                        )

                        let extension = "audio"

                        if (
                            originalMime.includes("mpeg") ||
                            originalMime.includes("mp3")
                        ) {
                            extension = "mp3"
                        } else if (
                            originalMime.includes("mp4") ||
                            originalMime.includes("m4a")
                        ) {
                            extension = "m4a"
                        } else if (
                            originalMime.includes("wav")
                        ) {
                            extension = "wav"
                        } else if (
                            originalMime.includes("webm")
                        ) {
                            extension = "webm"
                        }

                        voice =
                            await convertirNotaDeVoz(
                                media,
                                extension
                            )
                    }

                    msg.audio = voice

                    msg.ptt = true

                    msg.mimetype =
                        "audio/ogg; codecs=opus"

                    if (audioInfo.seconds)
                        msg.seconds =
                            audioInfo.seconds

                    if (audioInfo.waveform)
                        msg.waveform =
                            audioInfo.waveform

                    break
                }

                case "stickerMessage": {

                    msg.sticker = media

                    break
                }

                case "documentMessage": {

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
            }

            await conn.sendMessage(
                targetChat,
                msg,
                {
                    quoted: null
                }
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
                    {
                        quoted: null
                    }
                )
            }

            await m.react("✅")

        } catch (err) {

            console.error(
                "❌ Error en siu:",
                err
            )

            await m.react("❌").catch(() => {})

            return m.reply(
                "❌ No pude convertir o enviar el multimedia."
            )
        }
    }
}
