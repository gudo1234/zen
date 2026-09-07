import axios from "axios";
function isPinterestUrl(text = "") {
    return /pinterest\.|pin\.it/i.test(text);
}
export default {
    name: ["pinterest"],
    help: ["pinterest <texto | link>"],
    desc: "Busca o descarga imágenes/videos de Pinterest",
    tags: ["descargas"],
    register: true,
    limit: 1,
    run: async ({ conn, m, text, prefijo, cmd }) => {
        if (!text)
            return m.reply(`${m.e.warn} Usa texto o link de Pinterest\nEj:\n${prefijo + cmd} nayeon\n${prefijo + cmd} https://www.pinterest.com/pin/123/`);
        await m.react("⌛");
        try {
            if (isPinterestUrl(text)) {
                const res = await axios.get(`https://api.mitzuki.xyz/download/pinterest?url=${encodeURIComponent(text)}&apikey=${process.env.API_KEY}`);
                const d = res.data;
                if (!d?.status || !d?.data?.media?.length)
                    throw new Error("No se pudo descargar el pin");
                const pin = d.data;
                const medias = pin.media.filter(m => m.quality === "original" || !m.quality).slice(0, 3).map(m => ({ type: m.type === "video" ? "video" : "image", data: { url: m.url } }));
                const caption = `✅ Resultados para: ${text}

> 🔎 Por: ${pin.uploader?.username || "-"}
> 👤 Autor: ${pin.uploader?.full_name || "-"}
> 🔗 ${pin.uploader?.profile || ""}`;
                await conn.sendAlbumMessage(m.chat, medias, caption, m);
                await m.react("✅");
                return;
            }
            let results = [];
            try {
                const res = await axios.get(`https://api.mitzuki.xyz/search/pinterest?q=${encodeURIComponent(text)}&apikey=${process.env.API_KEY}`);
                results = res.data?.data?.results?.slice(0, 6).map(r => ({
                    url: r.media.image,
                    author: r.uploader?.full_name || "-",
                    username: r.uploader?.username || "-"
                })) || [];
            }
            catch { }
            if (!results.length) {
                const attempts = [
                    async () => {
                        const r = await axios.get(`https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(text)}`);
                        return (r.data?.data?.slice(0, 6).map(v => ({
                            url: v.images_url,
                            author: "-"
                        })) || []);
                    },
                    async () => {
                        const r = await axios.get(`https://api.dorratz.com/v2/pinterest?q=${encodeURIComponent(text)}`);
                        return (r.data?.slice(0, 6).map(v => ({
                            url: v.image,
                            author: v.upload_by || "-"
                        })) || []);
                    }
                ];
                for (const fn of attempts) {
                    try {
                        results = await fn();
                        if (results.length)
                            break;
                    }
                    catch { }
                }
            }
            if (!results.length)
                throw new Error("Sin resultados");
            const medias = results.map(r => ({
                type: "image",
                data: { url: r.url }
            }));
            const first = results[0];
            const caption = `✅ Resultados para: ${text}

🔎 Por: ${first.username || "-"}
👤 Autor: ${first.author || "-"}
> Power by: api.mitzuki.xyz`;
            await conn.sendAlbumMessage(m.chat, medias, caption, m);
            await m.react("✅");
            m.success = true;
        }
        catch (e) {
            console.error("Pinterest error:", e);
            await m.react("❌");
            throw e;
        }
    }
};
