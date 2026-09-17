import fetch from "node-fetch";

const userRequests = {};

export default {
    name: ["play", "play2", "play3", "play4", "musica", "audio", "video", "playdoc", "playdoc2"],
    help: ["play", "play2", "play3", "play4"],
    desc: "Descargar música o video de YouTube",
    tags: ["downloader"],
    limitPrem: true,

    run: async ({ conn, m, text, prefijo, cmd }) => {
        if (!text)
            return m.reply(`🤔 ¿Qué estás buscando?\n\n${m.e.warn} *Usa:*\n${prefijo + cmd} <canción o link>\n*Ej:* ${prefijo + cmd} diles`);

        if (userRequests[m.sender])
            return m.reply(`⏳ Hey @${m.sender.split("@")[0]} espera, ya tienes una descarga en proceso...`);

        userRequests[m.sender] = true;

        await m.react("⏳");

        try {
            const isAudio = ["play", "musica", "audio", "play3", "playdoc"].includes(cmd);
            const isVideo = ["play2", "video", "play4", "playdoc2"].includes(cmd);

            const isDocument = ["play3", "playdoc", "play4", "playdoc2"].includes(cmd);

            const tipoDescarga = isAudio
                ? isDocument ? "audio (documento)" : "audio"
                : isDocument ? "video (documento)" : "video";

            const type = isAudio ? "mp3" : "mp4";

            const apiUrl = `https://api.alyacore.xyz/dl/youtubeplayv2?query=${encodeURIComponent(text)}&type=${type}&key=oboe`;

            const response = await fetch(apiUrl);
            const data = await response.json();

            console.log("Respuesta AlyaCore:", data);

            if (!data?.status) {
                await m.react("❌");
                return m.reply(
                    `${m.e.warn} No se pudo obtener el ${tipoDescarga}.\n\n> ${data?.message || "La API no devolvió un resultado válido."}`
                );
            }

            /*
             * La API puede devolver distintos nombres para el enlace.
             * Buscamos automáticamente una URL válida.
             */
            const downloadUrl =
                data?.result?.download ||
                data?.result?.url ||
                data?.result?.dl_url ||
                data?.result?.link ||
                data?.download ||
                data?.url ||
                data?.dl_url ||
                data?.link;

            if (!downloadUrl || typeof downloadUrl !== "string") {
                console.log("Respuesta completa:", JSON.stringify(data, null, 2));
                await m.react("❌");
                return m.reply(`${m.e.warn} La API respondió correctamente, pero no encontré el enlace de descarga.`);
            }

            const title =
                data?.result?.title ||
                data?.title ||
                "YouTube";

            const fileName = sanitizeFileName(title);

            if (isAudio) {
                if (isDocument) {
                    await conn.sendMessage(
                        m.chat,
                        {
                            document: { url: downloadUrl },
                            mimetype: "audio/mpeg",
                            fileName: `${fileName}.mp3`
                        },
                        { quoted: m }
                    );
                } else {
                    await conn.sendMessage(
                        m.chat,
                        {
                            audio: { url: downloadUrl },
                            mimetype: "audio/mpeg",
                            fileName: `${fileName}.mp3`,
                            ptt: false
                        },
                        { quoted: m }
                    );
                }
            }

            if (isVideo) {
                if (isDocument) {
                    await conn.sendMessage(
                        m.chat,
                        {
                            document: { url: downloadUrl },
                            mimetype: "video/mp4",
                            fileName: `${fileName}.mp4`
                        },
                        { quoted: m }
                    );
                } else {
                    await conn.sendMessage(
                        m.chat,
                        {
                            video: { url: downloadUrl },
                            mimetype: "video/mp4",
                            caption: `🔰 *${title}*`
                        },
                        { quoted: m }
                    );
                }
            }

            await m.react("✅️");

        } catch (err) {
            console.error("❌ Error en /play:", err);
            await m.react("❌");
            return m.reply(`${m.e.warn} No se pudo procesar la descarga. Intenta nuevamente.`);
        } finally {
            delete userRequests[m.sender];
        }
    }
};

function sanitizeFileName(name) {
    return String(name)
        .replace(/[\\/:*?"<>|]/g, "")
        .trim()
        .slice(0, 200) || "YouTube";
}
