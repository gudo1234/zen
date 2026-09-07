import fetch from "node-fetch";
export default {
    name: ["image", "gimage", "imagen"],
    help: ["image <texto>"],
    desc: "Busca imágenes en Google.",
    tags: ["buscadores"],
    register: true,
    run: async ({ conn, m, text, prefijo, cmd }) => {
        if (!text) {
            return m.reply(`🤔 ¿Qué quieres buscar?\n\n` +
                `📌 Ejemplo:\n${prefijo + cmd} Loli`);
        }
        const forbiddenWords = [
            "caca", "polla", "porno", "porn", "gore", "cum", "semen", "puta",
            "puto", "culo", "putita", "putito", "pussy", "hentai", "pene",
            "coño", "asesinato", "zoofilia", "mia khalifa", "desnudo",
            "desnuda", "cuca", "chocha", "muertos", "pornhub", "xnxx",
            "xvideos", "teta", "vagina", "marsha may", "misha cross",
            "sexmex", "furry", "furro", "furra", "xxx", "rule34",
            "panocha", "pedofilia", "necrofilia", "pinga", "horny",
            "ass", "nude", "popo", "nsfw", "femdom", "futanari",
            "erofeet", "sexo", "sex", "yuri", "ero", "ecchi",
            "blowjob", "anal", "ahegao", "pija", "verga", "trasero",
            "violation", "violacion", "bdsm", "cachonda", "+18",
            "cp", "mia marin", "lana rhoades", "cepesito", "hot",
            "buceta", "pornografía", "pornografía infantil",
            "niña", "niñas", "niña pussy", "niña pack",
            "niña culo", "niña sin ropa",
            "niña siendo abusada",
            "niña siendo abusada sexualmente",
            "niña cogiendo", "niña fototeta",
            "niña vagina", "boku no pico"
        ];
        if (forbiddenWords.some(w => text.toLowerCase().includes(w))) {
            return m.reply(`${m.e?.warn || "🙄"} No voy a buscar tus pendejadas...`);
        }
        await m.react?.("🔎");
        try {
            const apiKey = process.env.API_KEY || "";
            if (!apiKey) {
                throw new Error("Falta process.env.API_KEY");
            }
            const url = `https://api.mitzuki.xyz/search/google-image?q=${encodeURIComponent(text)}` +
                `&apikey=${encodeURIComponent(apiKey)}`;
            const res = await fetch(url);
            const data = await res.json();
            const items = Array.isArray(data?.data)
                ? data.data.filter(i => i?.image)
                : [];
            if (!items.length) {
                await m.react?.("❌");
                return m.reply("❌ No encontré imágenes.");
            }
            const shuffled = [...items].sort(() => Math.random() - 0.5);
            const pick = shuffled[0];
            if (!pick?.image) {
                throw new Error("Imagen inválida");
            }
            await conn.sendMessage(m.chat, {
                image: {
                    url: pick.image
                },
                caption: `🔎 *Resultados de:* ${text}`
            }, {
                quoted: m
            });
            await m.react?.("✅");
        }
        catch (e) {
            console.error("❌ Error en image (Mitzuki):", e);
            await m.react?.("❌");
            await m.reply(`❌ Error buscando imágenes.\n${e?.message || e}`);
        }
    }
};
