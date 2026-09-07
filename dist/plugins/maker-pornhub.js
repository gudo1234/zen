import fetch from "node-fetch";
export default {
    name: ["pornhub", "phub"],
    tags: ["maker"],
    help: ["pornhub <texto1>|<texto2>"],
    desc: "Genera imagen estilo Pornhub",
    register: true,
    run: async ({ conn, m, text, prefijo }) => {
        try {
            if (!text)
                return m.reply(`🎬 *PORNHUB MAKER*\n\nUso:\n*${prefijo}pornhub texto1|texto2*\n\nEjemplo:\n*${prefijo}pornhub Mitzuki|api*`);
            let [text1, text2] = text.split("|");
            text1 = text1?.trim();
            text2 = text2?.trim();
            if (!text1 || !text2) {
                return m.reply(`⚠️ Formato incorrecto.\n\nUsa:\n*${prefijo}pornhub texto1|texto2*`);
            }
            await m.react?.("🕒");
            const api = `https://api.mitzuki.xyz/maker/pornhub?text1=${encodeURIComponent(text1)}&text2=${encodeURIComponent(text2)}&apikey=${process.env.API_KEY}`;
            const res = await fetch(api);
            const raw = await res.text();
            let json;
            try {
                json = JSON.parse(raw);
            }
            catch {
                throw new Error("La API no devolvió JSON válido");
            }
            if (!json?.status || !json?.data?.url) {
                throw new Error(json?.message || json?.error || "La API no devolvió imagen");
            }
            await conn.sendMessage(m.chat, { image: { url: json.data.url }, caption: `✅ *Imagen generada correctamente*` }, { quoted: m });
            await m.react?.("✅");
        }
        catch (e) {
            console.error("❌ Error en pornhub:", e);
            await m.react?.("❌");
            await m.reply("❌ Error generando la imagen.");
        }
    }
};
