import fetch from "node-fetch";
import uploadImage from "../lib/uploadImage.js";
export default {
    name: ["hd", "remini"],
    help: ["hd"],
    desc: "Mejora la calidad de una imagen en HD.",
    tags: ["tools"],
    register: true,
    run: async ({ conn, m }) => {
        try {
            const q = m.quoted ? m.quoted : m;
            const mime = (q.msg || q).mimetype || q.mediaType || "";
            if (!mime || !mime.startsWith("image")) {
                return m.reply(m.e.warn + " *Responde a una imagen para mejorarla en HD.*");
            }
            await m.react("⌛");
            const img = await q.download?.();
            if (!img)
                return m.reply(m.e.error + " No se pudo descargar la imagen.");
            const url = await uploadImage(img);
            const apiUrl = `https://api.mitzuki.xyz/tools/hd?url=${encodeURIComponent(url)}&apikey=${process.env.API_KEY}`;
            const res = await fetch(apiUrl);
            const json = (await res.json());
            if (!json.status || !json.data?.image_hd) {
                return m.reply(m.e.error + " No se pudo mejorar la imagen.");
            }
            await conn.sendMessage(m.chat, {
                image: { url: json.data.image_hd },
                caption: "✅ *Aquí está tu imagen en HD*"
            }, { quoted: m });
            await m.react("✅");
        }
        catch (e) {
            console.error("❌ Error en hd:", e);
            await m.react("❌");
            await m.reply(`${m.e.error + m.msg.error}\n\n >>> ${e} <<<< `);
        }
    },
};
