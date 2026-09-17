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
                `¿Qué estás buscando?\n\n${m.e.warn} *Usa:*\n${prefijo + cmd} <canción o link>\n*Ej:* ${prefijo + cmd} diles`
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
            let data;

            const isYoutube =
                /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(url);

            if (!isYoutube) {
                const result = (await ytSearch(text)).videos?.[0];

                if (!result)
                    throw new Error(`No encontré resultados para: ${text}`);

                url = result.url;

                data = {
                    title: result.title,
                    author: result.author?.name || "Desconocido",
                    duration: result.timestamp || "Desconocida",
                    thumbnail: result.thumbnail,
                    format: type,
                    quality: isAudio ? "256KBPS" : "720P"
                };
            }

            if (isYoutube || !data?.dl) {
                try {
                    data = await alyaCore(url, type);
                } catch {
                    data = await lempi(url, type);
                }
            }

            const seconds = parseDuration(data.duration);
            const over20 = seconds > 1200;
            const sendDocument = isDocument || over20;

            const tipo = isAudio
                ? sendDocument ? "audio en documento" : "audio"
                : sendDocument ? "video en documento" : "video";

            const aviso =
                !isDocument && over20
                    ? "\n\n> ‣ Se enviará como documento por superar 20 minutos."
                    : "";

            const info = `╭──── • ────╮
✦ *Título:* ${data.title}
✦ *Autor:* ${data.author}
✦ *Duración:* ${data.duration}
✦ *Formato:* ${data.format.toUpperCase()}
✦ *Calidad:* ${data.quality}
⏳ *Preparando ${tipo}...*${aviso}
╰──── • ────╯`;

            let thumbnail = null;

            try {
                const thumb = await fetch(data.thumbnail);
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

            if (!data.dl)
                throw new Error("La API no devolvió un enlace de descarga.");

            const buffer = await downloadMedia(data.dl);

            if (isAudio) {
                await conn.sendMessage(
                    m.chat,
                    sendDocument
                        ? {
                            document: buffer,
                            mimetype: "audio/mpeg",
                            fileName: data.fileName
                        }
                        : {
                            audio: buffer,
                            mimetype: "audio/mpeg",
                            fileName: data.fileName,
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
                            fileName: data.fileName
                        }
                        : {
                            video: buffer,
                            mimetype: "video/mp4",
                            caption: `🔰 *${data.title}*`
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

async function alyaCore(url, type) {
    const api =
        `https://api.alyacore.xyz/dl/youtubeplayv2?query=${encodeURIComponent(url)}&type=${type}&key=oboe`;

    const json = await fetchJson(api);

    if (!json?.status || !json?.data?.dl)
        throw new Error("AlyaCore no devolvió una descarga válida.");

    const d = json.data;

    return {
        title: d.title,
        author: d.author,
        duration: d.duration,
        thumbnail: d.thumbnail,
        format: d.format,
        quality: d.quality,
        fileName: d.fileName,
        dl: d.dl
    };
}

async function lempi(url, type) {
    const api =
        `https://api.lempi.lat/dl/${type === "mp3" ? "yta" : "ytv"}?url=${encodeURIComponent(url)}&apikey=lem_653af68318d77de0ef137af194cf241880ce58a3`;

    const json = await fetchJson(api);

    if (!json?.status || !json?.datos?.url)
        throw new Error("Lempi no devolvió una descarga válida.");

    const d = json.datos;

    return {
        title: json.titulo,
        author: json.canal,
        duration: json.duracion,
        thumbnail: json.miniatura,
        format: d.extension.replace(".", ""),
        quality: d.calidad,
        fileName: d.archivo,
        dl: d.url
    };
}

async function fetchJson(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
        const res = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0" },
            signal: controller.signal
        });

        if (!res.ok)
            throw new Error(`HTTP ${res.status}`);

        return await res.json();
    } finally {
        clearTimeout(timeout);
    }
}

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
    const match = String(duration || "").match(
        /(\d+)\s*\(\s*(\d+):(\d+)(?::(\d+))?\s*\)/
    );

    if (match) {
        return match[4]
            ? Number(match[2]) * 3600 + Number(match[3]) * 60 + Number(match[4])
            : Number(match[2]) * 60 + Number(match[3]);
    }

    const p = String(duration || "").split(":").map(Number);

    if (p.some(Number.isNaN))
        return 0;

    if (p.length === 3)
        return p[0] * 3600 + p[1] * 60 + p[2];

    if (p.length === 2)
        return p[0] * 60 + p[1];

    return p[0] || 0;
}
