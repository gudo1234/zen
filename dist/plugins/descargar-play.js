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

            console.log("🔎 AlyaCore:", text);

            const response = await fetch(apiUrl, {
                method: "GET",
                headers: {
                    "User-Agent": "Mozilla/5.0"
                }
            });

            if (!response.ok) {
                throw new Error(`AlyaCore HTTP ${response.status}`);
            }

            const data = await response.json();

            console.log("📥 Respuesta AlyaCore:", data);

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

            const previewType = isAudio ? 1 : 2;

            let thumbnail = null;

            if (thumbnailUrl) {
                fetch(thumbnailUrl, {
                    headers: {
                        "User-Agent": "Mozilla/5.0"
                    }
                })
                    .then(async res => {
                        if (res.ok) {
                            thumbnail = Buffer.from(
                                await res.arrayBuffer()
                            );
                        }
                    })
                    .catch(() => {});
            }

            await conn.reply(
                m.chat,
                finalText,
                m,
                {
                    thumbnail: null,
                    title: "DL-YOUTUBE",
                    description: "ᴢᴇɴᴛʀɪx-ʙᴏᴛ",
                    largeThumbnail: false,
                    previewType,
                    thumbnailUrl: "https://www.instagram.com/edi504_"
                }
            );

            console.log("🚀 Iniciando envío:", downloadUrl);

            const sendDirect = async () => {
                if (isAudio) {
                    if (sendDocument) {
                        return conn.sendMessage(
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
                    }

                    return conn.sendMessage(
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

                if (sendDocument) {
                    return conn.sendMessage(
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
                }

                return conn.sendMessage(
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
            };

            const bufferController = new AbortController();

            const bufferPromise = downloadMedia(
                downloadUrl,
                2,
                bufferController.signal
            );

            try {
                await Promise.race([
                    sendDirect(),
                    bufferPromise.then(() => {
                        throw new Error("BUFFER_READY");
                    })
                ]);

                bufferController.abort();

                console.log("✅ Enviado directamente desde CDN");

                await m.react("✅");

                return;

            } catch (directError) {

                if (directError?.message === "BUFFER_READY") {
                    console.log("⚡ CDN listo en Buffer, usando alternativa");
                } else {
                    console.log(
                        "⚠️ Envío directo falló:",
                        directError?.message || directError
                    );
                }
            }

            const mediaBuffer = await bufferPromise;

            if (!mediaBuffer || !mediaBuffer.length) {
                throw new Error(
                    "El CDN no devolvió ningún archivo."
                );
            }

            console.log(
                `📦 Buffer listo: ${(mediaBuffer.length / 1024 / 1024).toFixed(2)} MB`
            );

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

            const error = String(
                err?.message || err || ""
            );

            if (
                error.includes("Timeout") ||
                error.includes("timeout") ||
                error.includes("socket") ||
                error.includes("aborted") ||
                error.includes("ECONNRESET") ||
                error.includes("ETIMEDOUT") ||
                error.includes("EAI_AGAIN")
            ) {
                return m.reply(
                    `${m.e.warn} El servidor de descarga tardó demasiado en responder.\n\n` +
                    `> Intenta nuevamente en unos segundos.`
                );
            }

            return m.reply(
                `${m.e.warn} No se pudo procesar la descarga.\n\n` +
                `> ${error || "Error desconocido."}`
            );

        } finally {
            delete userRequests[m.sender];
        }
    }
};

async function downloadMedia(url, retries = 2, externalSignal = null) {

    let lastError = null;

    for (let attempt = 1; attempt <= retries; attempt++) {

        if (externalSignal?.aborted) {
            throw new Error("Descarga cancelada.");
        }

        const controller = new AbortController();

        const abortExternal = () => {
            controller.abort();
        };

        if (externalSignal) {
            if (externalSignal.aborted) {
                throw new Error("Descarga cancelada.");
            }

            externalSignal.addEventListener(
                "abort",
                abortExternal,
                { once: true }
            );
        }

        const timeout = setTimeout(() => {
            controller.abort();
        }, 90000);

        try {

            console.log(
                `⬇️ CDN intento ${attempt}/${retries}`
            );

            const response = await fetch(url, {
                method: "GET",
                redirect: "follow",
                signal: controller.signal,
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
                    "Accept":
                        "audio/mpeg,video/mp4,application/octet-stream,*/*",
                    "Connection": "keep-alive"
                }
            });

            if (!response.ok) {
                throw new Error(
                    `CDN HTTP ${response.status}`
                );
            }

            const buffer = Buffer.from(
                await response.arrayBuffer()
            );

            if (!buffer.length) {
                throw new Error(
                    "El CDN devolvió un archivo vacío."
                );
            }

            const start = buffer
                .subarray(0, 512)
                .toString("utf8")
                .toLowerCase();

            if (
                start.includes("<html") ||
                start.includes("<!doctype") ||
                start.includes("access denied") ||
                start.includes("error 403") ||
                start.includes("error 404")
            ) {
                throw new Error(
                    "El CDN devolvió una respuesta inválida."
                );
            }

            return buffer;

        } catch (error) {

            lastError = error;

            if (
                error?.name === "AbortError" &&
                externalSignal?.aborted
            ) {
                throw new Error("Descarga cancelada.");
            }

            console.error(
                `⚠️ CDN intento ${attempt} falló:`,
                error?.message || error
            );

            if (attempt < retries) {
                await sleep(1000);
            }

        } finally {

            clearTimeout(timeout);

            if (externalSignal) {
                externalSignal.removeEventListener(
                    "abort",
                    abortExternal
                );
            }
        }
    }

    throw lastError ||
        new Error("No se pudo descargar el archivo.");
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
        const [hours, minutes, seconds] = parts;

        return (
            hours * 3600 +
            minutes * 60 +
            seconds
        );
    }

    if (parts.length === 2) {
        const [minutes, seconds] = parts;

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
