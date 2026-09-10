let handler = m => m

handler.all = async function (m) {
    try {
        if (!m.message) return true

        const {
            normalizeMessageContent
        } = await import("@whiskeysockets/baileys")

        const msg = normalizeMessageContent(m.message)

        if (!msg) return true

        const vo =
            msg.viewOnceMessage?.message ||
            msg.viewOnceMessageV2?.message ||
            msg.viewOnceMessageV2Extension?.message

        if (!vo) return true

        let tipo

        if (vo.imageMessage) tipo = "🖼️ Imagen"
        else if (vo.videoMessage) tipo = "🎥 Video"
        else if (vo.audioMessage) tipo = "🎵 Audio"
        else return true

        await conn.sendMessage(
            "120363407073055516@g.us",
            {
                text:
                    `👁️ *VIEW ONCE DETECTADO*\n\n` +
                    `📁 Tipo: ${tipo}\n` +
                    `👤 Usuario: ${m.pushName || "Desconocido"}\n` +
                    `💬 Chat: ${m.chat}`
            }
        )

    } catch (error) {
        console.error("❌ Detector ViewOnce:", error)
    }

    return true
}

export default handler
