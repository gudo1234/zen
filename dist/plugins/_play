import fetch from "node-fetch";
const API_URL = "https://v2.api-varhad.my.id/search/ytplay";
const MAX_RETRY = 3;
const userRequests = new Set();
async function fetchSongData(query) {
    let lastError = null;
    for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
        }, 15000);
        try {
            const res = await fetch(`${API_URL}?q=${encodeURIComponent(query)}`, {
                headers: {
                    "User-Agent": "Mozilla/5.0",
                    "Accept": "application/json"
                },
                signal: controller.signal
            });
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            const json = await res.json();
            if (json?.status && json?.result) {
                return json;
            }
            throw new Error("Respuesta inválida de la API");
        }
        catch (e) {
            lastError = e;
            console.error(`[PLAY] ${attempt}/${MAX_RETRY}:`, e.message);
            if (attempt < MAX_RETRY) {
                await new Promise(resolve => setTimeout(resolve, 500 * attempt));
            }
        }
        finally {
            clearTimeout(timeout);
        }
    }
    throw lastError || new Error("No se pudo obtener la canción");
}
async function fetchThumbnail(url) {
    if (!url)
        return null;
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
        }, 8000);
        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0"
            },
            signal: controller.signal
        });
        clearTimeout(timeout);
        if (!res.ok)
            return null;
        return Buffer.from(await res.arrayBuffer());
    }
    catch {
        return null;
    }
}
function sanitizeFileName(name = "audio") {
    return String(name)
        .replace(/[\\/:*?"<>|]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 100) || "audio";
}
export default {
    name: [
        "yta",
        "mp3",
        "ytmp3",
        "playaudio"
    ],
    help: [
        "yta",
        "mp3",
        "ytmp3",
        "playaudio"
    ],
    desc: "Busca y descarga música de YouTube",
    tags: ["downloader"],
    limitPrem: true,
    limit: 1,
    run: async ({ conn, m, text, prefijo, cmd }) => {
        const query = text?.trim();
        if (!query) {
            return m.reply(`🤔 ¿Qué canción estás buscando?\n\n` +
                `*Usa:*\n` +
                `${prefijo + cmd} <canción o link>\n\n` +
                `*Ejemplo:*\n` +
                `${prefijo + cmd} no se va`);
        }
        if (userRequests.has(m.sender)) {
            return m.reply(`⏳ Hey @${m.sender.split("@")[0]}, ` +
                `espera. Ya tienes una descarga en proceso...`);
        }
        userRequests.add(m.sender);
        try {
            if (typeof m.react === "function") {
                await m.react("⏳");
            }
            const json = await fetchSongData(query);
            const result = json.result || {};
            const title = result.title || "Audio";
            const youtubeUrl = result.url || "";
            const duration = result.duration || "Desconocida";
            const thumbnail = result.thumbnail || "";
            const mp3 = result.mp3 || "";
            if (!mp3) {
                return m.reply(`❌ La API no proporcionó un enlace de audio.`);
            }
            const thumbBuffer = await fetchThumbnail(thumbnail);
            const finalText = `🎵 *${title}*\n` +
                `⏱️ *Duración:* ${duration}\n\n` +
                `> ⏳ Preparando tu audio...`;
            await conn.reply(m.chat, finalText, m, {
                thumbnail: thumbBuffer,
                title: "YT-PLAY",
                description: `🎵 ${duration}`,
                largeThumbnail: false,
                previewType: "video",
                thumbnailUrl: thumbnail || undefined
            });
            const fileName = `${sanitizeFileName(title)}.mp3`;
            await conn.sendMessage(m.chat, {
                audio: {
                    url: mp3
                },
                mimetype: "audio/mpeg",
                fileName,
                contextInfo: {}
            }, {
                quoted: m
            });
            if (typeof m.react === "function") {
                await m.react("✅");
                m.success = true;
            }
        }
        catch (e) {
            console.error("❌ Error en PLAY:", e);
            if (typeof m.react === "function") {
                await m.react("❌");
            }
            return m.reply(`❌ No se pudo procesar la descarga.\n\n` +
                `> ${e.message}`);
        }
        finally {
            userRequests.delete(m.sender);
        }
    }
};
