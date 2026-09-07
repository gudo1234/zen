import fetch from "node-fetch";
export default {
    name: ["google", "gsearch"],
    help: ["google <texto>"],
    desc: "Busca información en Google.",
    tags: ["buscadores"],
    register: true,
    limit: 1,
    run: async ({ conn, m, text, prefijo, cmd }) => {
        if (!text)
            return m.reply(`${m.e.warn} *Ingresa lo que quieres buscar.*\n\n${m.msg.example}:\n${prefijo + cmd} Blackpink historia`);
        await m.react("🔎");
        try {
            const res = await fetch(`https://api.delirius.store/search/googlesearch?query=${encodeURIComponent(text)}`);
            const data = await res.json();
            if (!data?.status || !data.data || !data.data.length)
                throw new Error("No se encontraron resultados para esa búsqueda.");
            let resultados = `🔍 *Resultados de:* ${text}\n\n`;
            for (const r of data.data.slice(0, 8)) {
                resultados += `*📄 ${r.title}*\n🔗 ${r.url}\n📝 _${r.description || "Sin descripción"}_\n\n───────────────\n\n`;
            }
            const ss = `https://image.thum.io/get/fullpage/https://google.com/search?q=${encodeURIComponent(text)}`;
            await conn.sendFile(m.chat, ss, "result.png", resultados.trim(), m);
            await m.react("✅");
            m.success = true;
        }
        catch (err) {
            console.error("❌ Error en Google Search:", err);
            await m.react("❌");
        }
    }
};
