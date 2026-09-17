import fetch from "node-fetch";

const userRequests = {};

const API_TIMEOUT = 15000;
const API_ATTEMPTS = 3;
const CDN_TIMEOUT = 90000;
const CDN_RETRIES = 2;

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

                return m.reply(
                    `${m.e.warn} Comando de descarga no válido.`
                );
            }

            const type = isAudio
                ? "mp3"
                : "mp4";

            const apiUrl =
                `https://api.alyacore.xyz/dl/youtubeplayv2?query=${encodeURIComponent(text)}&type=${type}&key=oboe`;

            const data =
                await getAlyaResult(apiUrl);

            if (
                !data?.status ||
                !data?.data?.dl
            ) {
                await m.react("❌");

                return m.reply(
                    `${m.e.warn} No se pudo obtener el ${isAudio ? "audio" : "video"}.\n\n` +
                    `> La API no devolvió un enlace de descarga.`
                );
            }

            const info = data.data;

            const title =
                info.title ||
                "YouTube";

            const author =
                info.author ||
                "Desconocido";

            const duration =
                info.duration ||
                "Desconocida";

            const thumbnailUrl =
                info.thumbnail ||
                "";

            const downloadUrl =
                info.dl;

            const fileName =
                info.fileName ||
                `${sanitizeFileName(title)}.${type}`;

            const durationSeconds =
                parseDuration(duration);

            const over20Minutes =
                durationSeconds > 1200;

            const sendDocument =
                isUserDocument ||
                (!isUserDocument && over20Minutes);

            const aviso =
                !isUserDocument && over20Minutes
                    ? `\n\n> ‣ Se enviará como documento por superar 20 minutos.`
                    : "";

            const tipoDescarga =
                isAudio
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

            const previewType =
                isAudio ? 1 : 2;

            const thumbnailPromise =
                thumbnailUrl
                    ? fetchThumbnail(thumbnailUrl)
                    : Promise.resolve(null);

            const thumbnail =
                await Promise.race([
                    thumbnailPromise,
                    sleep(2500).then(() => null)
                ]);

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
                            {
                                quoted: m
                            }
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
                        {
                            quoted: m
                        }
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
                        {
                            quoted: m
                        }
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
                    {
                        quoted: m
                    }
                );
            };

            try {

                console.log(
                    "🚀 Enviando directamente:",
                    downloadUrl
                );

                await sendDirect();

                console.log(
                    "✅ Enviado correctamente mediante URL"
                );

                await m.react("✅");

                return;

            } catch (directError) {

                console.log(
                    "⚠️ Falló el envío directo:",
                    directError?.message || directError
                );
            }

            console.log(
                "⬇️ Activando descarga alternativa..."
            );

            const mediaBuffer =
                await downloadMedia(
                    downloadUrl,
                    CDN_RETRIES
                );

            if (
                !mediaBuffer ||
                !mediaBuffer.length
            ) {
                throw new Error(
                    "El servidor no entregó el archivo."
                );
            }

            console.log(
                `📦 Archivo recibido: ${(mediaBuffer.length / 1024 / 1024).toFixed(2)} MB`
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
                        {
                            quoted: m
                        }
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
                        {
                            quoted: m
                        }
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
                        {
                            quoted: m
                        }
                    );

                } else {

                    await conn.sendMessage(
                        m.chat,
                        {
                            video: mediaBuffer,
                            mimetype: "video/mp4",
                            caption: `🔰 *${title}*`
                        },
                        {
                            quoted: m
                        }
                    );
                }
            }

            await m.react("✅");

        } catch (err) {

            console.error(
                "❌ Error final en /play:",
                err
            );

            await m.react("❌");

            return m.reply(
                `${m.e.warn} No se pudo completar la descarga.\n\n` +
                `> El servidor no pudo entregar el archivo. Intenta nuevamente.`
            );

        } finally {

            delete userRequests[m.sender];
        }
    }
};

async function getAlyaResult(url) {

    const controllers = [];
    const requests = [];

    for (
        let i = 0;
        i < API_ATTEMPTS;
        i++
    ) {

        const controller =
            new AbortController();

        controllers.push(controller);

        const delay =
            i === 0
                ? 0
                : i === 1
                    ? 900
                    : 1800;

        const request =
            (async () => {

                if (delay) {
                    await sleep(delay);
                }

                if (controller.signal.aborted) {
                    throw new Error("cancelled");
                }

                console.log(
                    `🔎 AlyaCore solicitud ${i + 1}/${API_ATTEMPTS}`
                );

                const timer =
                    setTimeout(() => {
                        controller.abort();
                    }, API_TIMEOUT);

                try {

                    const response =
                        await fetch(url, {
                            method: "GET",
                            redirect: "follow",
                            signal: controller.signal,
                            headers: {
                                "User-Agent":
                                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
                                "Accept":
                                    "application/json,text/plain,*/*",
                                "Connection":
                                    "keep-alive"
                            }
                        });

                    if (!response.ok) {
                        throw new Error(
                            `HTTP ${response.status}`
                        );
                    }

                    const data =
                        await response.json();

                    if (
                        data?.status === true &&
                        data?.data?.dl
                    ) {

                        console.log(
                            `✅ AlyaCore respondió en solicitud ${i + 1}`
                        );

                        return data;
                    }

                    throw new Error(
                        "Respuesta de AlyaCore sin enlace"
                    );

                } finally {

                    clearTimeout(timer);
                }
            })();

        requests.push(request);
    }

    try {

        const result =
            await Promise.any(requests);

        for (const controller of controllers) {
            try {
                controller.abort();
            } catch {}
        }

        return result;

    } catch {

        for (const controller of controllers) {
            try {
                controller.abort();
            } catch {}
        }

        throw new Error(
            "AlyaCore no pudo entregar un resultado válido."
        );
    }
}

async function fetchThumbnail(url) {

    const controller =
        new AbortController();

    const timer =
        setTimeout(() => {
            controller.abort();
        }, 5000);

    try {

        const response =
            await fetch(url, {
                method: "GET",
                signal: controller.signal,
                headers: {
                    "User-Agent":
                        "Mozilla/5.0",
                    "Accept":
                        "image/avif,image/webp,image/apng,image/*,*/*;q=0.8"
                }
            });

        if (!response.ok) {
            return null;
        }

        const buffer =
            Buffer.from(
                await response.arrayBuffer()
            );

        return buffer.length
            ? buffer
            : null;

    } catch {

        return null;

    } finally {

        clearTimeout(timer);
    }
}

async function downloadMedia(
    url,
    retries = 2
) {

    let lastError = null;

    for (
        let attempt = 1;
        attempt <= retries;
        attempt++
    ) {

        const controller =
            new AbortController();

        const timer =
            setTimeout(() => {
                controller.abort();
            }, CDN_TIMEOUT);

        try {

            console.log(
                `⬇️ CDN ${attempt}/${retries}: ${url}`
            );

            const response =
                await fetch(url, {
                    method: "GET",
                    redirect: "follow",
                    signal: controller.signal,
                    headers: {
                        "User-Agent":
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
                        "Accept":
                            "audio/mpeg,video/mp4,application/octet-stream,*/*",
                        "Connection":
                            "keep-alive"
                    }
                });

            if (!response.ok) {
                throw new Error(
                    `CDN HTTP ${response.status}`
                );
            }

            const buffer =
                Buffer.from(
                    await response.arrayBuffer()
                );

            if (!buffer.length) {
                throw new Error(
                    "Archivo vacío"
                );
            }

            const beginning =
                buffer
                    .subarray(0, 512)
                    .toString("utf8")
                    .toLowerCase();

            if (
                beginning.includes("<html") ||
                beginning.includes("<!doctype") ||
                beginning.includes("access denied") ||
                beginning.includes("error 403") ||
                beginning.includes("error 404")
            ) {
                throw new Error(
                    "Respuesta inválida del CDN"
                );
            }

            return buffer;

        } catch (error) {

            lastError = error;

            console.log(
                `⚠️ CDN ${attempt}/${retries}:`,
                error?.message || error
            );

            if (attempt < retries) {
                await sleep(700);
            }

        } finally {

            clearTimeout(timer);
        }
    }

    throw lastError ||
        new Error(
            "No se pudo descargar el archivo."
        );
}

function parseDuration(duration) {

    if (
        !duration ||
        typeof duration !== "string"
    ) {
        return 0;
    }

    const parts =
        duration
            .split(":")
            .map(Number);

    if (
        parts.some(
            Number.isNaN
        )
    ) {
        return 0;
    }

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

    if (parts.length === 1) {
        return parts[0];
    }

    return 0;
}

function sanitizeFileName(name) {

    return String(name)
        .replace(
            /[\\/:*?"<>|]/g,
            ""
        )
        .trim()
        .slice(0, 200) ||
        "YouTube";
}

function sleep(ms) {

    return new Promise(
        resolve => setTimeout(resolve, ms)
    );
}
