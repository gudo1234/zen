import fetch from "node-fetch";
import ytSearch from "yt-search";

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
            const audio = [
                "play", "musica", "audio", "yta",
                "mp3", "ytmp3", "playaudio",
                "play3", "playdoc", "ytadoc",
                "mp3doc", "ytmp3doc"
            ];

            const video = [
                "play2", "video", "ytv", "mp4",
                "ytmp4", "playvid",
                "play4", "playdoc2", "ytvdoc",
                "mp4doc", "ytmp4doc"
            ];

            const documents = [
                "play3", "playdoc", "ytadoc",
                "mp3doc", "ytmp3doc",
                "play4", "playdoc2", "ytvdoc",
                "mp4doc", "ytmp4doc"
            ];

            const isAudio = audio.includes(cmd);
            const isVideo = video.includes(cmd);
            const isDocument = documents.includes(cmd);
            const type = isAudio ? "mp3" : "mp4";

            if (!isAudio && !isVideo)
                throw new Error("Comando de descarga no válido.");

            let url = text.trim();
            let result;

            if (!/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(url)) {
                result = (await ytSearch(text)).videos?.[0];

                if (!result)
                    throw new Error(`No encontré resultados para: ${text}`);

                url = result.url;
            }

            const api =
                `https://api.alyacore.xyz/dl/youtubeplayv2?query=${encodeURIComponent(url)}&type=${type}&key=oboe`;

            const res = await fetch(api, {
                headers: { "User-Agent": "Mozilla/5.0" }
            });

            if (!res.ok)
                throw new Error(`AlyaCore HTTP ${res.status}`);

            const json = await res.json();

            if (!json?.status || !json?.data?.dl)
                throw new Error(
                    json?.message || "La API no devolvió el enlace de descarga."
                );

            const d = json.data;
            const seconds = parseDuration(d.duration);
            const over20 = seconds > 1200;
            const sendDocument = isDocument || over20;

            const aviso =
                !isDocument && over20
                    ? "\n\n> ‣ Se enviará como documento por superar 20 minutos."
                    : "";

            const tipo =
                isAudio
                    ? sendDocument ? "audio en documento" : "audio"
                    : sendDocument ? "video en documento" : "video";

            const info = `╭──── • ────╮
✦ *Título:* ${d.title}
✦ *Autor:* ${d.author}
✦ *Duración:* ${d.duration}
✦ *Formato:* ${d.format.toUpperCase()}
✦ *Calidad:* ${d.quality}
⏳ *Preparando ${tipo}...*${aviso}
╰──── • ────╯`;

            let thumbnail = null;

            try {
                const thumb = await fetch(d.thumbnail);
                if (thumb.ok)
                    thumbnail = Buffer.from(await thumb.arrayBuffer());
            } catch {}

            await conn.reply(m.chat, info, m, {
                thumbnail,
                title: "DL-YOUTUBE",
                description: "ᴢᴇɴᴛʀɪx-ʙᴏᴛ",
                largeThumbnail: false,
                previewType: isAudio ? 1 : 2,
                thumbnailUrl: "https://www.instagram.com/edi504_"
            });

            const buffer = await downloadMedia(d.dl);

            if (isAudio) {
                await conn.sendMessage(
                    m.chat,
                    sendDocument
                        ? {
                            document: buffer,
                            mimetype: "audio/mpeg",
                            fileName: d.fileName
                        }
                        : {
                            audio: buffer,
                            mimetype: "audio/mpeg",
                            fileName: d.fileName,
                            ptt: false
                        },
                    { quoted: m }
                );
            } else {
                await conn.sendMessage(
                    m.chat,
                    sendDocument
                        ? {
                            document: buffer,
                            mimetype: "video/mp4",
                            fileName: d.fileName
                        }
                        : {
                            video: buffer,
                            mimetype: "video/mp4",
                            caption: `🔰 *${d.title}*`
                        },
                    { quoted: m }
                );
            }

            await m.react("✅");

        } catch (e) {
            console.error("❌ Error en /play:", e);
            await m.react("❌");

            return m.reply(
                `${m.e.warn} No se pudo procesar la descarga.\n\n> ${e.message || "Error desconocido."}`
            );

        } finally {
            delete userRequests[m.sender];
        }
    }
};

async function downloadMedia(url) {
    let error;

    for (let i = 1; i <= 3; i++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 180000);

        try {
            const res = await fetch(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0",
                    "Accept": "audio/mpeg,video/mp4,application/octet-stream,*/*"
                },
                redirect: "follow",
                signal: controller.signal
            });

            if (!res.ok)
                throw new Error(`CDN HTTP ${res.status}`);

            const buffer = Buffer.from(await res.arrayBuffer());

            if (!buffer.length)
                throw new Error("El CDN devolvió un archivo vacío.");

            const start = buffer.subarray(0, 100).toString().toLowerCase();

            if (
                start.includes("<html") ||
                start.includes("<!doctype") ||
                start.includes("access denied")
            )
                throw new Error("El CDN devolvió una página en lugar del archivo.");

            return buffer;

        } catch (e) {
            error = e;

            if (i < 3)
                await new Promise(r => setTimeout(r, i * 3000));

        } finally {
            clearTimeout(timeout);
        }
    }

    throw error || new Error("No se pudo descargar el archivo.");
}

function parseDuration(duration) {
    const p = String(duration || "").split(":").map(Number);

    if (p.some(Number.isNaN))
        return 0;

    if (p.length === 3)
        return p[0] * 3600 + p[1] * 60 + p[2];

    if (p.length === 2)
        return p[0] * 60 + p[1];

    return p[0] || 0;
}
