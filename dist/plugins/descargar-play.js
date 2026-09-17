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

        if (!text) {
            return m.reply(
                `🤔 ¿Qué estás buscando?\n\n${m.e.warn} *Usa:*\n${prefijo + cmd} <canción o link>\n*Ej:* ${prefijo + cmd} diles`
            );
        }

        if (userRequests[m.sender]) {
            return m.reply(
                `⏳ Hey @${m.sender.split("@")[0]} espera, ya tienes una descarga en proceso...`
            );
        }

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

            if (!isAudio && !isVideo) {
                await m.react("❌");
                return m.reply(`${m.e.warn} Comando de descarga no válido.`);
            }

            const type = isAudio ? "mp3" : "mp4";

            const apiUrl =
                `https://api.alyacore.xyz/dl/youtubeplayv2?query=${encodeURIComponent(text)}&type=${type}&key=oboe`;

            console.log("🔎 Consultando AlyaCore:", apiUrl);

            const response = await fetch(apiUrl, {
                headers: {
                    "User-Agent": "Mozilla/5.0"
                }
            });

            if (!response.ok) {
                throw new Error(`AlyaCore respondió HTTP ${response.status}`);
            }

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

            const durationSeconds = parseDuration(duration);
            const over20Minutes = durationSeconds > 1200;

            const sendDocument =
                isUserDocument ||
                (!isUserDocument && over20Minutes);

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

            const finalText = `╭──── • ────╮
✦ *Título:* ${title}
✦ *Autor:* ${author}
✦ *Duración:* ${duration}
✦ *Formato:* ${(info.format || type).toUpperCase()}
✦ *Calidad:* ${info.quality || "Desconocida"}
⏳ *Preparando ${tipoDescarga}...*
${aviso}
╰──── • ────╯`;

            let thumbnail = null;

            if (thumbnailUrl) {
                try {

                    const thumbRes = await fetch(thumbnailUrl, {
                        headers: {
                            "User-Agent": "Mozilla/5.0"
                        }
                    });

                    if (thumbRes.ok) {
                        thumbnail = Buffer.from(
                            await thumbRes.arrayBuffer()
                        );
                    }

                } catch (err) {
                    console.log(
                        "⚠️ No se pudo obtener la miniatura:",
                        err.message
                    );
                }
            }

            const previewType = isAudio ? 1 : 2;

            await conn.reply(
                m.chat,
                finalText,
                m,
                {
                    thumbnail,
                    title: "DL-YOUTUBE",
                    description: "ᴢᴇɴᴛʀɪx-ʙᴏᴛ",
                    largeThumbnail: false,
                    previewType,
                    thumbnailUrl: "https://www.instagram.com/edi504_"
                }
            );

            console.log("⬇️ Descargando desde CDN:", downloadUrl);

            const mediaBuffer = await downloadMedia(
                downloadUrl,
                3
            );

            if (!mediaBuffer || !mediaBuffer.length) {
                throw new Error(
                    "El CDN no devolvió ningún archivo."
                );
            }

            console.log(
                `✅ Archivo descargado: ${(mediaBuffer.length / 1024 / 1024).toFixed(2)} MB`
            );
            if (info.size) {
                const diferencia =
                    Math.abs(mediaBuffer.length - Number(info.size));

                console.log(
                    `📦 Tamaño API: ${Number(info.size)} bytes | ` +
                    `Recibido: ${mediaBuffer.length} bytes | ` +
                    `Diferencia: ${diferencia} bytes`
                );
            }

            if (isAudio) {

                if (sendDocument) {

                    await conn.sendMessage(
                        m.chat,
                        {
                            document: mediaBuffer,
                            mimetype: "audio/mpeg",
                            fileName
                        },
                        { quoted: m }
                    );

                } else {

                    await conn.sendMessage(
                        m.chat,
                        {
                            audio: mediaBuffer,
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
                            document: mediaBuffer,
                            mimetype: "video/mp4",
                            fileName
                        },
                        { quoted: m }
                    );

                } else {

                    await conn.sendMessage(
                        m.chat,
                        {
                            video: mediaBuffer,
                            mimetype: "video/mp4",
                            caption: `🔰 *${title}*`
                        },
                        { quoted: m }
                    );
                }
            }

            await m.react("✅");

        } catch (err) {

            console.error("❌ Error en /play:", err);

            await m.react("❌");
            if (
                err.message?.includes("Timeout") ||
                err.message?.includes("socket") ||
                err.message?.includes("aborted")
            ) {
                return m.reply(
                    `${m.e.warn} No se pudo descargar el archivo desde el servidor.\n\n` +
                    `> El servidor tardó demasiado en responder. Se realizaron varios intentos automáticamente.`
                );
            }

            return m.reply(
                `${m.e.warn} No se pudo procesar la descarga.\n\n` +
                `> ${err.message || "Error desconocido."}`
            );

        } finally {
            delete userRequests[m.sender];
        }
    }
};

async function downloadMedia(url, retries = 3) {

    let lastError = null;

    for (let attempt = 1; attempt <= retries; attempt++) {

        const controller = new AbortController();

        const timeout = setTimeout(() => {
            controller.abort();
        }, 180000);

        try {

            console.log(
                `⬇️ Intento ${attempt}/${retries}: ${url}`
            );

            const response = await fetch(url, {
                method: "GET",

                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",

                    "Accept":
                        "audio/mpeg,video/mp4,application/octet-stream,*/*"
                },

                redirect: "follow",

                signal: controller.signal
            });

            if (!response.ok) {
                throw new Error(
                    `CDN respondió HTTP ${response.status}`
                );
            }

            const contentLength =
                response.headers.get("content-length");

            if (contentLength) {
                console.log(
                    `📦 Content-Length: ${contentLength} bytes`
                );
            }
            const arrayBuffer =
                await response.arrayBuffer();

            const buffer =
                Buffer.from(arrayBuffer);

            if (!buffer.length) {
                throw new Error(
                    "El CDN devolvió un archivo vacío."
                );
            }
            const firstBytes =
                buffer
                    .subarray(0, 100)
                    .toString("utf8")
                    .toLowerCase();

            if (
                firstBytes.includes("<html") ||
                firstBytes.includes("<!doctype") ||
                firstBytes.includes("access denied")
            ) {
                throw new Error(
                    "El CDN devolvió una página HTML en lugar del archivo."
                );
            }

            return buffer;

        } catch (error) {

            lastError = error;

            console.error(
                `⚠️ Falló intento ${attempt}/${retries}:`,
                error.message
            );
            if (attempt < retries) {

                const wait =
                    attempt * 3000;

                console.log(
                    `🔄 Reintentando en ${wait / 1000}s...`
                );

                await sleep(wait);
            }

        } finally {

            clearTimeout(timeout);
        }
    }

    throw lastError ||
        new Error("No se pudo descargar el archivo.");
}

function sleep(ms) {
    return new Promise(resolve =>
        setTimeout(resolve, ms)
    );
}

function parseDuration(duration) {

    if (!duration || typeof duration !== "string")
        return 0;

    const parts = duration
        .split(":")
        .map(Number);

    if (parts.some(Number.isNaN))
        return 0;

    if (parts.length === 3) {

        const [
            hours,
            minutes,
            seconds
        ] = parts;

        return (
            hours * 3600 +
            minutes * 60 +
            seconds
        );
    }

    if (parts.length === 2) {

        const [
            minutes,
            seconds
        ] = parts;

        return (
            minutes * 60 +
            seconds
        );
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
