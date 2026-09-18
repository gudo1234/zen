import fetch from "node-fetch";
import axios from "axios";
export default {
    name: ["tiktok", "tt"],
    tags: ["downloader"],
    help: ["tiktok <url>"],
    desc: "Descargar video de TikTok",
    limitPrem: true,
    limit: 1,
    run: async ({ conn, m, args, prefijo, cmd }) => {
        const url = args?.[0] || "";
        if (!url)
            return m.reply(null, `${m.e?.warn || "⚠️"} *¿Qué TikTok quieres descargar?*\n\nEjemplo:\n${prefijo + cmd} https://vm.tiktok.com/ZM6T4X1RY/`);
        const isTikTok = /^(https?:\/\/)?((www|vm|vt|m|t)\.)?tiktok\.com\/\S+/i.test(url);
        if (!isTikTok)
            return m.reply("❌ Enlace inválido.");
        await m.react?.("⌛");
        try {
            const apiKey = process.env.API_KEY || "";
            const downloadAttempts = [
                async () => {
                    const res = await fetch(`https://api.evogb.org/dl/tiktok?key=gata-2026-ofc&url=${encodeURIComponent(url)}`);
                    const data = await res.json();
                    return data?.data?.dl || null;
                },
                async () => {
                    if (!apiKey)
                        return null;
                    const res = await fetch(`https://api.mitzuki.xyz/download/tiktok?url=${encodeURIComponent(url)}&apikey=${encodeURIComponent(apiKey)}`);
                    const data = await res.json();
                    return data?.data?.media?.video || null;
                },
                async () => {
                    const { data } = await axios.get(`https://api.delirius.store/download/tiktok?url=${encodeURIComponent(url)}`);
                    const video = data?.data?.meta?.media?.[0];
                    return video?.org || video?.hd || video?.wm || null;
                },
                async () => {
                    const { data } = await axios.get(`https://api.dorratz.com/v2/tiktok-dl?url=${encodeURIComponent(url)}`);
                    const media = data?.data?.media;
                    return media?.org || media?.hd || media?.wm || null;
                }
            ];
            let videoUrl = null;
            for (const attempt of downloadAttempts) {
                try {
                    videoUrl = await attempt();
                    if (videoUrl)
                        break;
                }
                catch (err) {
                    console.error("❌ Error intento TikTok:", err?.message || err);
                }
            }
            if (!videoUrl) {
                await m.react?.("❌");
                return m.reply("❌ No se pudo obtener el video desde ninguna API.");
            }
            await conn.sendMessage(m.chat, { video: { url: videoUrl }, caption: "*🔰 Aquí está tu video de TikTok*" }, { quoted: m });
            await m.react?.("✅");
            m.success = true;
        }
        catch (e) {
            console.error("❌ Error TikTok:", e);
            await m.react?.("❌");
        }
    }
};
