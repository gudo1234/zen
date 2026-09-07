import fetch from "node-fetch";
export default {
    name: ["yts", "playlist", "playlista", "playvid2", "ytsearch"],
    help: ["yts <canción o tema>"],
    desc: "Busca canciones o videos en YouTube.",
    tags: ["downloader"],
    register: true,
    run: async ({ conn, m, text, prefijo, cmd }) => {
        if (!text) {
            return m.reply(`${m.e?.warn || "⚠️"} *¿Qué estás buscando?*\n\n` +
                `📌 Ejemplo:\n${prefijo + cmd} bad bunny`);
        }
        await m.react?.("📀");
        try {
            const apiKey = process.env.API_KEY || "";
            if (!apiKey) {
                throw new Error("Falta process.env.API_KEY");
            }
            const url = `https://api.mitzuki.xyz/search/youtube?q=${encodeURIComponent(text)}` +
                `&apikey=${encodeURIComponent(apiKey)}`;
            const res = await fetch(url);
            const json = await res.json();
            const videos = Array.isArray(json?.data?.items)
                ? json.data.items
                : [];
            if (!videos.length) {
                await m.react?.("❌");
                return m.reply("❌ No se encontraron resultados.");
            }
            let caption = `🎧 *Resultados de:* ${text}\n\n`;
            for (let i = 0; i < Math.min(15, videos.length); i++) {
                const v = videos[i];
                caption +=
                    `🎵 *Título:* ${v?.title || "Sin título"}\n` +
                        `👀 *Vistas:* ${Number(v?.views || 0).toLocaleString()}\n` +
                        `⌛ *Duración:* ${v?.duration || "Desconocida"}\n` +
                        `🔗 *Enlace:* ${v?.url || "Sin enlace"}\n\n` +
                        `━━━━━━━━━━━━━━━\n\n`;
            }
            const thumb = videos[0]?.thumbnail ||
                "https://i.imgur.com/ZZhWb9Y.png";
            await conn.sendFile(m.chat, thumb, "yts.jpg", caption.trim(), m);
            await m.react?.("✅");
        }
        catch (err) {
            console.error("❌ Error en YTSearch (Mitzuki):", err);
            await m.react?.("❌");
            await m.reply(`❌ Error buscando videos.\n${err?.message || err}`);
        }
    }
};
