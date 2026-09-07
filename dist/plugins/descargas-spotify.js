import fetch from "node-fetch";
const userRequests = {};
const userMessages = new Map();
export default {
    name: ["spotify", "music"],
    help: ["spotify <canción>"],
    desc: "Descarga música desde Spotify por nombre o URL.",
    tags: ["downloader"],
    register: true,
    limitPrem: true,
    limit: 1,
    run: async ({ conn, m, text, prefijo, cmd }) => {
        if (!text)
            return m.reply(`${m.e.warn || "🎧"} *Ingresa el nombre o link de una canción de Spotify.*\n\n📌 Ejemplo:\n${prefijo + cmd} ozuna`);
        if (userRequests[m.sender])
            return conn.reply(`${m.e.warn} Hey @${m.sender.split("@")[0]} ya estás descargando una canción.\nPor favor, espera a que termine la descarga anterior 🎶`, userMessages.get(m.sender) || m);
        userRequests[m.sender] = true;
        await m.react("⌛");
        try {
            const searchRes = await fetch(`https://api.evogb.org/search/spotify?query=${encodeURIComponent(text)}&key=gata-2026-ofc`);
            const songData = await searchRes.json();
            if (!songData?.result?.length)
                return m.reply(`❌ No se encontraron resultados para "${text}".`);
            const track = songData.result[0];
            const caption = `🎵 *Spotify Downloader*\n\n🎧 *Título:* ${track.title}\n👤 *Artista:* ${track.artist}\n\n> 🚀 *Enviando canción... por favor espera unos segundos.*`;
            const ytimg = await fetch(track.image);
            const img = Buffer.from(await ytimg.arrayBuffer());
            const msg = await conn.reply(m.chat, caption, m, {
                thumbnail: img,
                title: track.title,
                description: "Spotify Downloader 🎶",
                largeThumbnail: true,
                previewType: "video",
                thumbnailUrl: "https://api.mitzuki.xyz"
            });
            //conn.sendFile(m.chat, track.image, "apk.jpg", caption, m)
            /*await conn.sendMessage(m.chat, { text: caption,
            contextInfo: {
            externalAdReply: {
            mediaUrl: track.url,
            mediaType: 2,
            showAdAttribution: false,
            renderLargerThumbnail: false,
            title: track.title,
            body: "Spotify Downloader 🎶",
            thumbnailUrl: track.image,
            sourceUrl: track.link
            }}}, { quoted: m })*/
            userMessages.set(m.sender, msg);
            const sources = [
                async () => {
                    const r = await fetch(`https://api.mitzuki.xyz/download/spotify?url=${encodeURIComponent(track.link)}&apikey=${process.env.API_KEY}`);
                    const j = await r.json();
                    return j?.data?.media?.audio || null;
                },
                async () => {
                    const r = await fetch(`https://api.evogb.org/dl/spotify?url=${encodeURIComponent(track.link)}&key=gata-2026-ofc`);
                    const j = await r.json();
                    return j?.data?.url || null;
                },
                async () => {
                    const res = await fetch(`https://api.siputzx.my.id/api/d/spotify?url=${track.link}`);
                    const data = await res.json();
                    return data?.data?.download;
                },
                async () => {
                    const res = await fetch(`https://api.delirius.store/download/spotifydl?url=${track.link}`);
                    const data = await res.json();
                    return data?.data?.url;
                }
            ];
            let downloadUrl = null;
            for (const src of sources) {
                try {
                    downloadUrl = await src();
                    if (downloadUrl)
                        break;
                }
                catch (err) {
                    console.error(`⚠️ Fallback Spotify error: ${err.message}`);
                }
            }
            if (!downloadUrl)
                throw new Error("No se pudo obtener la descarga desde ninguna API disponible.");
            await conn.sendMessage(m.chat, { audio: { url: downloadUrl }, fileName: `${track.title}.mp3`, mimetype: "audio/mpeg", contextInfo: {} }, { quoted: m });
            await m.react("✅");
            m.success = true;
        }
        catch (err) {
            console.error("❌ Error Spotify:", err);
            await m.react("❌");
            await m.reply(`${m.e.error + m.msg.error}\n\n >>> ${err} <<<< `);
        }
        finally {
            delete userRequests[m.sender];
        }
    }
};
