import fetch from "node-fetch";
const userRequests = {};
const fetchWithTimeout = async (url, timeoutMs = 60000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const r = await fetch(url, { signal: controller.signal });
        return r;
    }
    finally {
        clearTimeout(timer);
    }
};
function safeName(str = "x_media") {
    return String(str).replace(/[^\w.\-]/g, "_").slice(0, 100);
}
export default {
    name: ["xdl", "twitterdl", "xdld", "xdown"],
    help: ["xdl <url>"],
    desc: "Descarga videos de X (Twitter).",
    tags: ["downloader"],
    register: true,
    limitPrem: true,
    limit: 1,
    run: async ({ conn, m, args, prefijo, cmd }) => {
        if (!args[0]) {
            return m.reply(`${m.e.warn} *Debes ingresar el link del tweet.*\n\n` +
                `📌 Ejemplo:\n${prefijo + cmd} https://x.com/godmitzu/status/1818617471579934928`);
        }
        if (userRequests[m.sender]) {
            return conn.reply(m.chat, `⏳ Hey @${m.sender.split("@")[0]}, ya hay una descarga en proceso. Espera a que termine antes de iniciar otra.`, userRequests[m.sender].message || m);
        }
        const { key } = await conn.sendMessage(m.chat, { text: `⌛ *Preparando descarga...*\n▰▱▱▱▱▱▱▱▱` }, { quoted: m });
        userRequests[m.sender] = {
            active: true,
            message: { key, chat: m.chat, fromMe: true }
        };
        const delay = (t) => new Promise(res => setTimeout(res, t));
        await delay(700);
        await conn.sendMessage(m.chat, {
            text: `⌛ *Obteniendo datos del tweet...*\n▰▰▰▱▱▱▱▱▱`,
            edit: key
        });
        await delay(700);
        await conn.sendMessage(m.chat, {
            text: `⌛ *Procesando video...*\n▰▰▰▰▰▰▱▱▱`,
            edit: key
        });
        await m.react("⌛");
        try {
            const tweetUrl = String(args[0]).trim();
            // Validar URL de Twitter/X
            if (!/(?:x\.com|twitter\.com)\/.+\/status\/\d+/i.test(tweetUrl)) {
                throw new Error("URL inválida. Debe ser un link de X/Twitter.");
            }
            // ============================================================
            // 🔥 ESTRATEGIA 1: TU API (api.mitzuki.xyz)
            // ============================================================
            let result = null;
            try {
                console.log(`[xdl] Probando API Mitzuki...`);
                const apiKey = process.env.API_KEY;
                if (!apiKey)
                    throw new Error("API_KEY no configurada");
                const apiUrl = `https://api.mitzuki.xyz/download/twitter?url=${encodeURIComponent(tweetUrl)}&apikey=${apiKey}`;
                const res = await fetchWithTimeout(apiUrl, 90000);
                const json = (await res.json());
                console.log(`[xdl] Mitzuki status:`, json.status);
                if (json.status && json.data) {
                    const d = json.data;
                    const videoUrl = d.media?.dl_download || d.media?.video?.[0];
                    if (videoUrl) {
                        const caption = `🐦 *Descargador de X (Twitter)*

🧍‍♂️ *Usuario:* ${d.author?.name || "Desconocido"} (@${d.author?.username || "?"})
📅 *Fecha:* ${d.upload_date || "Desconocida"}
👁️‍🗨️ *Vistas:* ${d.view_count || "Desconocido"}
❤️ *Likes:* ${d.like_count || "0"}
🔁 *Retweets:* ${d.repost_count || "0"}

💬 *Descripción:*
${d.text || "Sin descripción"}

🎞️ *Duración:* ${d.duration_string || "Desconocida"}
📦 *Tamaño:* ${d.media?.size ? (d.media.size / 1024 / 1024).toFixed(2) + " MB" : "Desconocido"}
🔗 *Enlace original:* ${tweetUrl}
`.trim();
                        result = {
                            videoUrl,
                            caption,
                            thumbnail: d.thumbnail || d.thumbnails?.[0]?.url,
                            source: "mitzuki"
                        };
                        console.log(`[xdl] ✅ Mitzuki OK`);
                    }
                    else {
                        console.log(`[xdl] Mitzuki sin media, probando fallback...`);
                    }
                }
                else {
                    console.log(`[xdl] Mitzuki error:`, json.error);
                }
            }
            catch (err) {
                console.error(`[xdl] Mitzuki falló:`, err.message);
            }
            // ============================================================
            // 🔥 ESTRATEGIA 2: FALLBACK DELIRIUS
            // ============================================================
            if (!result) {
                try {
                    console.log(`[xdl] Probando fallback Delirius...`);
                    const res = await fetchWithTimeout(`https://api.delirius.store/download/twitterv2?url=${encodeURIComponent(tweetUrl)}`, 60000);
                    const data = await res.json();
                    if (!data?.status || !data.data) {
                        throw new Error("Delirius no encontró el tweet");
                    }
                    const info = data.data;
                    const media = info.media?.[0];
                    if (!media || media.type !== "video" || !media.videos?.length) {
                        throw new Error("Este tweet no contiene videos descargables");
                    }
                    const best = media.videos.sort((a, b) => b.bitrate - a.bitrate)[0];
                    const caption = `🐦 *Descargador de X (Twitter)*

🧍‍♂️ *Usuario:* @${info.author?.username || "?"}
${info.author?.verified ? "✅ Verificado" : ""}
📅 *Fecha:* ${info.createdAt || "Desconocida"}
👁️‍🗨️ *Vistas:* ${info.view || "Desconocido"}
❤️ *Likes:* ${info.favorite || "0"}

💬 *Descripción:*
${info.description || "Sin descripción"}

🎞️ *Calidad:* ${best.quality}
🔗 *Enlace original:* ${tweetUrl}
`.trim();
                    result = {
                        videoUrl: best.url,
                        caption,
                        thumbnail: media.cover || info.author?.profile_banner,
                        source: "delirius"
                    };
                    console.log(`[xdl] ✅ Delirius OK`);
                }
                catch (err) {
                    console.error(`[xdl] Delirius falló:`, err.message);
                }
            }
            // ============================================================
            // 🔥 SI NINGUNA FUNCIONÓ
            // ============================================================
            if (!result) {
                throw new Error("No se pudo descargar el video (ambas APIs fallaron)");
            }
            // Enviar el video
            await conn.sendMessage(m.chat, { video: { url: result.videoUrl }, caption: result.caption }, { quoted: m });
            await conn.sendMessage(m.chat, {
                text: `✅ *Descarga finalizada con éxito.*\n▰▰▰▰▰▰▰▰▰\n_🔧 Fuente: ${result.source}_`,
                edit: key
            });
            await m.react("✅");
            m.success = true;
        }
        catch (err) {
            console.error("❌ Error en Twitter Downloader:", err);
            await m.react("❌");
            await conn.sendMessage(m.chat, {
                text: `${m.e.error + m.msg.error}\n\n >>> ${err.message || err} <<<< `,
                edit: key
            });
        }
        finally {
            delete userRequests[m.sender];
        }
    }
};
