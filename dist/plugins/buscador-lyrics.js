import fetch from "node-fetch";
export default {
    name: ["letra", "letras", "lyrics", "lyric", "lirik"],
    help: ["letra <canción>"],
    desc: "Busca la letra de una canción.",
    tags: ["buscadores"],
    register: true,
    run: async ({ conn, m, text, prefijo, cmd }) => {
        if (!text)
            return m.reply(`${m.e.warn} *¿Qué canción deseas buscar?*\n\n📌 Ejemplo:\n${prefijo + cmd} ozuna te vas`);
        await m.react("🎵");
        try {
            const res = await fetch(`https://api.fgmods.xyz/api/other/lyrics?text=${encodeURIComponent(text)}&apikey=${process.env.API_KEY}`);
            const data = await res.json();
            if (!data.result?.lyrics)
                throw new Error("No se encontró la letra con FGMods.");
            const txt = `🎤 *Título:* ${data.result.title || "Desconocido"}\n👤 *Autor:* ${data.result.artist || "Desconocido"}\n🎶 *URL:* ${data.result.url || "No disponible"}

📃 *Letra:*
${data.result.lyrics || "No disponible"}
`.trim();
            const img = data.result.image || "https://i.imgur.com/ZZhWb9Y.png";
            await conn.sendFile(m.chat, img, "song.jpg", txt, m);
            await m.react("✅");
        }
        catch (err1) {
            console.warn("⚠️ FGMods falló, usando Delirius:", err1.message);
            try {
                const res = await fetch(`https://api.delirius.store/search/lyrics?query=${encodeURIComponent(text)}`);
                const data = await res.json();
                if (!data?.status || !data.data?.lyrics)
                    throw new Error("No se encontró la letra con Delirius.");
                const info = data.data;
                const txt = `🎤 *Título:* ${info.title || "Desconocido"}\n👥 *Artistas:* ${info.artists || "Desconocido"}\n💿 *Álbum:* ${info.album || "Desconocido"}\n⏱️ *Duración:* ${info.duration || "Desconocida"}

📃 *Letra:*
${info.lyrics || "No disponible"}
`.trim();
                await m.reply(txt);
                //conn.sendFile(m.chat, "https://i.imgur.com/ZZhWb9Y.png", "lyrics.jpg", txt, m)
                await m.react("✅");
            }
            catch (err2) {
                console.error("❌ Error en letra:", err2);
                await m.react(m.e.error);
                //await m.reply(`⚠️ *Ocurrió un error al obtener la letra.*\n\n> Usa *#report* para avisar al creador.\n\n${err2}`)
            }
        }
    }
};
