import {
    downloadContentFromMessage
} from "@whiskeysockets/baileys"

const VIEW_ONCE_GROUP = "120363407073055516@g.us"

let handler = m => m

/**
 * Desenvuelve los wrappers de WhatsApp hasta encontrar
 * imageMessage / videoMessage / audioMessage.
 *
 * Devuelve:
 * {
 *   message: mensaje multimedia,
 *   type: "image" | "video" | "audio",
 *   isViewOnce: true/false
 * }
 */
function extractViewOnce(message) {
    if (!message || typeof message !== "object") {
        return null
    }

    let current = message
    let isViewOnce = false

    // Evita loops accidentales
    for (let i = 0; i < 10; i++) {
        if (!current || typeof current !== "object") {
            return null
        }

        // ==============================
        // VIEW ONCE
        // ==============================
        if (current.viewOnceMessage?.message) {
            isViewOnce = true
            current = current.viewOnceMessage.message
            continue
        }

        if (current.viewOnceMessageV2?.message) {
            isViewOnce = true
            current = current.viewOnceMessageV2.message
            continue
        }

        if (current.viewOnceMessageV2Extension?.message) {
            isViewOnce = true
            current = current.viewOnceMessageV2Extension.message
            continue
        }

        // ==============================
        // EPHEMERAL
        // ==============================
        if (current.ephemeralMessage?.message) {
            current = current.ephemeralMessage.message
            continue
        }

        // ==============================
        // MENSAJES CON CAPTION
        // ==============================
        if (current.documentWithCaptionMessage?.message) {
            current = current.documentWithCaptionMessage.message
            continue
        }

        // ==============================
        // MEDIA FINAL
        // ==============================
        if (current.imageMessage) {
            return {
                message: current.imageMessage,
                type: "image",
                isViewOnce: isViewOnce || current.imageMessage.viewOnce === true
            }
        }

        if (current.videoMessage) {
            return {
                message: current.videoMessage,
                type: "video",
                isViewOnce: isViewOnce || current.videoMessage.viewOnce === true
            }
        }

        if (current.audioMessage) {
            return {
                message: current.audioMessage,
                type: "audio",
                isViewOnce: isViewOnce || current.audioMessage.viewOnce === true
            }
        }

        return null
    }

    return null
}

/**
 * Descarga el contenido real del View Once.
 */
async function downloadViewOnce(mediaMessage, type) {
    const stream = await downloadContentFromMessage(
        mediaMessage,
        type
    )

    const chunks = []

    for await (const chunk of stream) {
        chunks.push(chunk)
    }

    return Buffer.concat(chunks)
}

handler.before = async function (m, ctx) {
    try {
        if (!m?.message) return false

        const result = extractViewOnce(m.message)

        // No es View Once
        if (!result?.isViewOnce) {
            return false
        }

        const {
            message: mediaMessage,
            type
        } = result

        console.log(
            `👁️ VIEW ONCE DETECTADO | tipo=${type} | chat=${m.chat} | sender=${m.sender}`
        )

        // ==============================
        // DATOS DEL REMITENTE
        // ==============================
        const sender =
            m.pushName ||
            m.username ||
            m.sender ||
            "Desconocido"

        const chat =
            m.chat ||
            m.key?.remoteJid ||
            "Desconocido"

        // ==============================
        // DESCARGAR MEDIA
        // ==============================
        let buffer

        try {
            buffer = await downloadViewOnce(
                mediaMessage,
                type
            )
        } catch (downloadError) {
            console.error(
                "❌ Error descargando View Once:",
                downloadError
            )

            // Intentar actualización/reupload si Baileys lo permite
            try {
                if (typeof ctx?.conn?.updateMediaMessage === "function") {
                    await ctx.conn.updateMediaMessage(m)

                    buffer = await downloadViewOnce(
                        mediaMessage,
                        type
                    )
                }
            } catch (retryError) {
                console.error(
                    "❌ Segundo intento View Once fallido:",
                    retryError
                )
            }
        }

        if (!buffer || !buffer.length) {
            console.error(
                "❌ View Once detectado pero no se pudo obtener el contenido."
            )

            await ctx.conn.sendMessage(
                VIEW_ONCE_GROUP,
                {
                    text:
                        `👁️ *VIEW ONCE DETECTADO*\n\n` +
                        `📁 Tipo: ${type === "image"
                            ? "🖼️ Imagen"
                            : type === "video"
                                ? "🎥 Video"
                                : "🎵 Audio"}\n` +
                        `👤 Usuario: ${sender}\n` +
                        `💬 Chat: ${chat}\n\n` +
                        `⚠️ No fue posible descargar el contenido.`
                }
            )

            return false
        }

        // ==============================
        // TEXTO/CAPTION
        // ==============================
        const caption =
            mediaMessage.caption ||
            ""

        const tipoTexto =
            type === "image"
                ? "🖼️ Imagen"
                : type === "video"
                    ? "🎥 Video"
                    : "🎵 Audio"

        // ==============================
        // INFORMACIÓN
        // ==============================
        const info =
            `👁️ *VIEW ONCE DETECTADO*\n\n` +
            `📁 Tipo: ${tipoTexto}\n` +
            `👤 Usuario: ${sender}\n` +
            `💬 Chat: ${chat}`

        // ==============================
        // ENVIAR INFORMACIÓN
        // ==============================
        await ctx.conn.sendMessage(
            VIEW_ONCE_GROUP,
            {
                text: info
            }
        )

        // ==============================
        // REENVIAR MEDIA COMO MENSAJE NORMAL
        // ==============================
        if (type === "image") {
            await ctx.conn.sendMessage(
                VIEW_ONCE_GROUP,
                {
                    image: buffer,
                    caption: caption
                        ? `👁️ *View Once recuperado*\n\n${caption}`
                        : "👁️ *View Once recuperado*"
                }
            )
        }

        else if (type === "video") {
            await ctx.conn.sendMessage(
                VIEW_ONCE_GROUP,
                {
                    video: buffer,
                    caption: caption
                        ? `👁️ *View Once recuperado*\n\n${caption}`
                        : "👁️ *View Once recuperado*",
                    mimetype:
                        mediaMessage.mimetype ||
                        "video/mp4"
                }
            )
        }

        else if (type === "audio") {
            await ctx.conn.sendMessage(
                VIEW_ONCE_GROUP,
                {
                    audio: buffer,
                    mimetype:
                        mediaMessage.mimetype ||
                        "audio/ogg; codecs=opus",
                    ptt: mediaMessage.ptt === true
                }
            )
        }

        console.log(
            `✅ View Once procesado correctamente | ${type}`
        )

    } catch (error) {
        console.error(
            "❌ Error en detector View Once:",
            error
        )
    }

    // false = no detener el procesamiento normal del bot
    return false
}

export default handler
