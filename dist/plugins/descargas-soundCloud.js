import fetch from "node-fetch";
const userRequests = {};
export default {
    name: ["soundcloud", "scdl", "scsong", "sound"],
    help: ["soundcloud <texto|link>"],
    desc: "Descarga canciones de SoundCloud en formato MP3 (usa búsqueda o link).",
    tags: ["downloader"],
    register: true,
    limitPrem: true,
    limit: 1,
    run: async ({ conn, m, args, text, prefijo, cmd }) => {
        if (!text)
            return m.reply(`${m.e.warn} *Ingresa nombre o link de SoundCloud.*\n\n📌 Ejemplo:\n${prefijo + cmd} LISA MONEY`);
        if (userRequests[m.sender])
            return conn.reply(m.chat, `⏳ Hey @${m.sender.split("@")[0]}, ya hay una descarga en proceso. Espera a que termine antes de iniciar otra.`, userRequests[m.sender].message || m);
        const { key } = await conn.sendMessage(m.chat, { text: `🎧 *Conectando con SoundCloud...*\n▰▰▱▱▱▱▱▱▱` }, { quoted: m });
        userRequests[m.sender] = { active: true, message: { key, chat: m.chat, fromMe: true } };
        const delay = (t) => new Promise(res => setTimeout(res, t));
        await delay(800);
        await conn.sendMessage(m.chat, { text: `🎶 *Procesando solicitud...*\n▰▰▰▰▱▱▱▱▱`, edit: key });
        await delay(800);
        await m.react("⌛");
        try {
            let url = text.trim();
            if (!url.includes("soundcloud.com")) {
                const searchRes = await fetch(`https://api.delirius.store/search/soundcloud?q=${encodeURIComponent(url)}`);
                const searchData = await searchRes.json();
                if (!searchData?.status || !searchData.data?.length)
                    throw new Error("No se encontraron resultados para esa búsqueda.");
                const first = searchData.data[0];
                url = first.link;
                await conn.sendMessage(m.chat, { text: `🎵 *Resultado encontrado:* ${first.title}\n👤 ${first.artist}\n\n⬇️ *Descargando...*`, edit: key });
            }
            const res = await fetch(`https://api.delirius.store/download/soundcloud?url=${encodeURIComponent(url)}`);
            const data = await res.json();
            if (!data?.status || !data.data)
                throw new Error("No se pudo obtener información de la canción.");
            const song = data.data;
            const durationSec = Math.floor((song.duration || 0) / 1000);
            const mins = Math.floor(durationSec / 60);
            const secs = durationSec % 60;
            const caption = `🎧 *Descargador de SoundCloud*

🎶 *Título:* ${song.title}
👤 *Artista:* ${song.author}
❤️ *Likes:* ${song.likes?.toLocaleString() || 0}
💬 *Comentarios:* ${song.comments?.toLocaleString() || 0}
▶️ *Reproducciones:* ${song.playbacks?.toLocaleString() || 0}
⏱️ *Duración:* ${mins}:${secs.toString().padStart(2, "0")}
📅 *Subido:* ${new Date(song.created_at || "").toLocaleDateString()}
🔗 *Link:* ${song.link}

💾 *Descargando archivo...*`.trim();
            await conn.sendFile(m.chat, song.image || song.author_avatar || "", "cover.jpg", caption, m);
            await conn.sendMessage(m.chat, { audio: { url: song.download }, mimetype: "audio/mpeg", fileName: `${song.title?.replace(/[<>:"/\\|?*]+/g, "") || "soundcloud"}.mp3`, caption: `🎵 *${song.title}* — ${song.author}` }, { quoted: m });
            await conn.sendMessage(m.chat, { text: `✅ *Descarga completada correctamente*\n▰▰▰▰▰▰▰▰▰`, edit: key });
            await m.react("✅");
            m.success = true;
        }
        catch (err) {
            console.error("❌ Error en SoundCloud Downloader:", err);
            await m.react("❌");
            await conn.sendMessage(m.chat, { text: `${m.e.error + m.msg.error}\n\n >>> ${err} <<<< `, edit: key });
        }
        finally {
            delete userRequests[m.sender];
        }
    }
};
