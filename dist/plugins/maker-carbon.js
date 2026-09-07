import fetch from "node-fetch";
export default {
    name: ["carbon"],
    tags: ["tools"],
    help: ["carbon <código>"],
    desc: "Genera una imagen estilo Carbon con código",
    register: true,
    run: async ({ conn, m, text, prefijo }) => {
        if (!text) {
            return m.reply(`🧑‍💻 *CARBON MAKER*\n\n` +
                `Escribe un código para generar la imagen.\n\n` +
                `Ejemplo:\n` +
                `*${prefijo}carbon console.log('mitzuki api')*`);
        }
        await m.react?.("🕒");
        try {
            const apiKey = process.env.API_KEY || "";
            if (!apiKey) {
                throw new Error("Falta process.env.API_KEY");
            }
            const api = `https://api.mitzuki.xyz/maker/carbon?code=${encodeURIComponent(text)}` +
                `&apikey=${encodeURIComponent(apiKey)}`;
            const res = await fetch(api);
            const json = await res.json();
            if (!json?.status || !json?.data?.url) {
                throw new Error(json?.message ||
                    json?.error ||
                    "La API no devolvió imagen");
            }
            await conn.sendMessage(m.chat, {
                image: {
                    url: json.data.url
                },
                caption: ""
            }, {
                quoted: m
            });
            await m.react?.("✅");
        }
        catch (e) {
            console.error("❌ Error en carbon:", e);
            await m.react?.("❌");
            await m.reply(`❌ Error generando la imagen carbon.\n${e?.message || e}`);
        }
    }
};
