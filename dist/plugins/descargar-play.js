import fetch from "node-fetch";

const userRequests = {};

export default {
    name: [
        "play", "play2", "play3", "play4",
        "musica", "audio", "video",
        "playdoc", "playdoc2",
        "yta", "mp3", "ytmp3", "playaudio",
        "ytadoc", "mp3doc", "ytmp3doc",
        "ytv", "mp4", "ytmp4", "playvid",
        "ytvdoc", "mp4doc", "ytmp4doc"
    ],

    help: [
        "play", "play2", "play3", "play4",
        "yta", "mp3", "ytmp3", "playaudio",
        "ytadoc", "mp3doc", "ytmp3doc",
        "ytv", "mp4", "ytmp4", "playvid",
        "ytvdoc", "mp4doc", "ytmp4doc"
    ],

    desc: "Descargar música o video de YouTube",
    tags: ["downloader"],
    limitPrem: true,

    run: async ({ conn, m, text, prefijo, cmd }) => {

        if (!text)
            return m.reply(
                `🤔 ¿Qué estás buscando?\n\n${m.e.warn} *Usa:*\n${prefijo + cmd} <canción o link>\n*Ej:* ${prefijo + cmd} diles`
            );

        if (userRequests[m.sender])
            return m.reply(
                `⏳ Hey @${m.sender.split("@")[0]} espera, ya tienes una descarga en proceso...`
            );

        userRequests[m.sender] = true;

        await m.react("⏳");

        try {

            const normalAudio = [
                "play",
                "musica",
                "audio",
                "yta",
                "mp3",
                "ytmp3",
                "playaudio"
            ];

            const docAudio = [
                "play3",
                "playdoc",
                "ytadoc",
                "mp3doc",
                "ytmp3doc"
            ];

            const normalVideo = [
                "play2",
                "video",
                "ytv",
                "mp4",
                "ytmp4",
                "playvid"
            ];

            const docVideo = [
                "play4",
                "playdoc2",
                "ytvdoc",
                "mp4doc",
                "ytmp4doc"
            ];

            const isAudio = [
                ...normalAudio,
                ...docAudio
            ].includes(cmd);

            const isVideo = [
                ...normalVideo,
                ...docVideo
            ].includes(cmd);

            const isUserDocument = [
                ...docAudio,
                ...docVideo
            ].includes(cmd);

            if (!isAudio && !isVideo)
                return m.reply(`${m.e.warn} Comando de descarga no válido.`);

            const type = isAudio ? "mp3" : "mp4";

            const apiUrl =
                `https://api.alyacore.xyz/dl/youtubeplayv2?query=${encodeURIComponent(text)}&type=${type}&key=oboe`;

            const response = await fetch(apiUrl);

            if (!response.ok)
                throw new Error(`HTTP ${response.status}`);

            const data = await response.json();

            console.log("🔎 AlyaCore:", data);

            if (!data?.status || !data?.data?.dl) {
                await m.react("❌");

                return m.reply(
                    `${m.e.warn} No se pudo obtener el ${isAudio ? "audio" : "video"}.\n\n> ${data?.message || "La API no devolvió un enlace de descarga."}`
                );
            }

            const info = data.data;

            const title = info.title || "YouTube";
            const author = info.author || "Desconocido";
            const duration = info.duration || "Desconocida";
            const thumbnailUrl = info.thumbnail || "";
            const downloadUrl = info.dl;

            const fileName =
                info.fileName ||
                `${sanitizeFileName(title)}.${type}`;

            /*
             * Calcular duración
             */
            const durationSeconds = parseDuration(duration);

            /*
             * Si el usuario pidió un documento,
             * siempre se mantiene como documento.
             *
             * Si pidió audio/video normal y supera
             * los 20 minutos, se convierte automáticamente
             * en documento.
             */
            const over20Minutes = durationSeconds > 1200;

            const sendDocument =
                isUserDocument ||
                (!isUserDocument && over20Minutes);

            /*
             * El aviso SOLO aparece cuando:
             * - No pidió documento
             * - La duración supera 20 minutos
             */
            const aviso =
                !isUserDocument && over20Minutes
                    ? `\n\n> ‣ Se enviará como documento por superar 20 minutos.`
                    : "";

            const tipoDescarga = isAudio
                ? sendDocument
                    ? "audio en documento"
                    : "audio"
                : sendDocument
                    ? "video en documento"
                    : "video";

            /*
             * Información para la vista previa
             */
            const finalText = `╭───〔 🎵 YOUTUBE 〕───╮
│
│ ✦ *Título:* ${title}
│ ✦ *Autor:* ${author}
│ ✦ *Duración:* ${duration}
│ ✦ *Formato:* ${(info.format || type).toUpperCase()}
│ ✦ *Calidad:* ${info.quality || "Desconocida"}
│
│ ⏳ *Preparando ${tipoDescarga}...*
${aviso}
│
╰──────────╯`;

            let thumbnail = null;

            if (thumbnailUrl) {
                try {
                    const thumbRes = await fetch(thumbnailUrl);

                    if (thumbRes.ok) {
                        thumbnail = Buffer.from(
                            await thumbRes.arrayBuffer()
                        );
                    }
                } catch {}
            }

            const previewType = isAudio ? 1 : 2;

            await conn.reply(m.chat, finalText, m, {
                thumbnail,
                title: "DL-YOUTUBE",
                description: "ᴢᴇɴᴛʀɪx-ʙᴏᴛ",
                largeThumbnail: false,
                previewType,
                thumbnailUrl: "https://www.instagram.com/edi504_"
            });

            /*
             * Enviar archivo
             */
            if (isAudio) {

                if (sendDocument) {

                    await conn.sendMessage(
                        m.chat,
                        {
                            document: {
                                url: downloadUrl
                            },
                            mimetype: "audio/mpeg",
                            fileName
                        },
                        { quoted: m }
                    );

                } else {

                    await conn.sendMessage(
                        m.chat,
                        {
                            audio: {
                                url: downloadUrl
                            },
                            mimetype: "audio/mpeg",
                            fileName,
                            ptt: false
                        },
                        { quoted: m }
                    );
                }

            } else {

                if (sendDocument) {

                    await conn.sendMessage(
                        m.chat,
                        {
                            document: {
                                url: downloadUrl
                            },
                            mimetype: "video/mp4",
                            fileName
                        },
                        { quoted: m }
                    );

                } else {

                    await conn.sendMessage(
                        m.chat,
                        {
                            video: {
                                url: downloadUrl
                            },
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

            return m.reply(
                `${m.e.warn} No se pudo procesar la descarga. Intenta nuevamente.`
            );

        } finally {
            delete userRequests[m.sender];
        }
    }
};

function parseDuration(duration) {

    if (!duration || typeof duration !== "string")
        return 0;

    const parts = duration
        .split(":")
        .map(Number);

    if (parts.some(Number.isNaN))
        return 0;

    if (parts.length === 3) {
        const [hours, minutes, seconds] = parts;
        return hours * 3600 + minutes * 60 + seconds;
    }

    if (parts.length === 2) {
        const [minutes, seconds] = parts;
        return minutes * 60 + seconds;
    }

    if (parts.length === 1)
        return parts[0];

    return 0;
}

function sanitizeFileName(name) {

    return String(name)
        .replace(/[\\/:*?"<>|]/g, "")
        .trim()
        .slice(0, 200) || "YouTube";
}
