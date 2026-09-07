import fetch from "node-fetch";
const userRequests = {};
export default {
    name: ["play", "play2", "play3", "play4", "musica", "audio", "video", "playdoc", "playdoc2"],
    help: ["play", "play2", "playdoc", "playdoc2"],
    desc: "Descargar música o video de YouTube",
    tags: ["downloader"],
    limitPrem: true,
    limit: 1,
    run: async ({ conn, m, text, prefijo, cmd }) => {
        if (!text)
            return m.reply(`🤔 ¿Qué está buscando?\n\n${m.e.warn} *Usa:*\n${prefijo + cmd} <canción o link>\n*Ej:* ${prefijo + cmd} emilia 420`);
        if (userRequests[m.sender])
            return m.reply(`⏳ Hey @${m.sender.split("@")[0]} espera, ya tienes una descarga en proceso...`);
        userRequests[m.sender] = true;
        m.react("⏳");
        try {
            const isYoutubeUrl = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)/i.test(text);
            let video = null;
            let yurl = "";
            if (isYoutubeUrl) {
                yurl = normalizeYouTubeUrl(text);
                const info = await getVideoInfo(yurl);
                video = {
                    title: info?.title || "Video de YouTube",
                    duration: info?.duration || "Desconocida",
                    thumbnail: info?.thumbnail || "",
                    url: yurl,
                    id: extractYoutubeId(yurl),
                    metaOk: info?.ok === true
                };
            }
            else {
                const yt_play = await search(text);
                if (!yt_play || yt_play.length === 0) {
                    return m.reply(m.e.warn + " No encontré resultados en YouTube");
                }
                video = yt_play[0];
                if (video?.id) {
                    yurl = `https://youtu.be/${video.id}`;
                }
                else if (video?.url) {
                    yurl = normalizeYouTubeUrl(video.url);
                }
                else {
                    return m.reply("❌ No pude obtener la URL del video");
                }
            }
            const hasGoodMeta = (video?.metaOk === true || (!video?.metaOk && video?.title && video?.duration)) && video.title !== "Video de YouTube" && video.duration !== "Desconocida";
            const tipoDescarga = cmd === 'play' || cmd === 'musica' ? 'audio' : cmd === 'play2' ? 'video' : cmd === 'play3' ? 'audio (documento)' : cmd === 'play4' ? 'video (documento)' : '';
            const ytimg = await fetch(video.thumbnail);
            const img = Buffer.from(await ytimg.arrayBuffer());
            if (hasGoodMeta) {
                await conn.reply(m.chat, `${video.title}
*⇄ㅤ     ◁   ㅤ  ❚❚ㅤ     ▷ㅤ     ↻*
*⏰ Duración:* ${video.duration}
> *👉🏻Aguarde un momento en lo que envío su ${tipoDescarga}...*`, m, {
                    thumbnail: img,
                    title: video.title,
                    description: "Downloader",
                    largeThumbnail: true,
                    previewType: "video",
                    thumbnailUrl: "https://api.mitzuki.xyz"
                });
                /*conn.sendMessage(m.chat, { text: `${video.title}
                *⇄ㅤ     ◁   ㅤ  ❚❚ㅤ     ▷ㅤ     ↻*
                *⏰ Duración:* ${video.duration}
                > *👉🏻Aguarde un momento en lo que envío su ${tipoDescarga}...*`,
                contextInfo: {
                externalAdReply: {
                mediaUrl: video.url,
                mediaType: 2,
                title: video.title,
                body: "Downloader",
                thumbnailUrl: video.thumbnail,
                sourceUrl: video.url
                }}}, { quoted: m })*/
            }
            else {
                await m.reply(["play", "musica", "audio", "play3", "playdoc"].includes(cmd) ? "⏳ Descargando tu audio, aguarda un momento..." : "⏳ Descargando tu video, aguarda un momento...");
            }
            const audioApis = [
                { url: () => fetch(`https://api.mitzuki.xyz/download/youtube?url=${encodeURIComponent(yurl)}&type=audio&format=mp3&apikey=${process.env.API_KEY}`).then(r => r.json()),
                    extract: (d) => d?.data?.dl_download
                },
                { url: () => fetch(`https://api.mitzuki.xyz/download/youtube2?url=${encodeURIComponent(yurl)}&apikey=${process.env.API_KEY}`).then(r => r.json()),
                    extract: (d) => d?.data?.url
                },
                { url: () => fetch(`https://dv-yer-api.online/ytmp3?mode=link&url=${encodeURIComponent(yurl)}`).then(r => r.json()),
                    extract: (d) => d?.download_url_full || d?.stream_url_full || (d?.url ? `https://dv-yer-api.online${d.url}` : null)
                },
                { url: () => fetch(`https://api.dorratz.com/v3/ytdl?url=${encodeURIComponent(yurl)}`).then(r => r.json()),
                    extract: (d) => d?.medias?.find((m) => m.quality === "160kbps" && m.extension === "mp3")?.url
                }
            ];
            const videoApis = [
                { url: () => fetch(`https://dv-yer-api.online/ytmp4?mode=link&url=${encodeURIComponent(yurl)}&quality=360p&fast=false`).then(r => r.json()),
                    extract: (d) => d?.download_url_full || d?.stream_url_full
                },
                { url: () => fetch(`https://api.mitzuki.xyz/download/youtube-mp4?url=${encodeURIComponent(yurl)}&quality=360&apikey=${process.env.API_KEY}`).then(r => r.json()),
                    extract: (d) => d?.data?.dl_download
                },
                { url: () => fetch(`https://api.mitzuki.xyz/download/youtube?url=${encodeURIComponent(yurl)}&type=video&quality=360&apikey=${process.env.API_KEY}`).then(r => r.json()),
                    extract: (d) => d?.data?.dl_download
                },
                { url: () => fetch(`https://api.siputzx.my.id/api/d/ytmp4?url=${encodeURIComponent(yurl)}`).then(r => r.json()),
                    extract: (d) => d?.dl
                }
            ];
            const downloadBackup = async (apis) => {
                for (let i = 0; i < apis.length; i++) {
                    const api = apis[i];
                    try {
                        console.log(`🔍 Probando API #${i + 1}`);
                        const raw = await api.url();
                        const data = api.extract(raw);
                        if (typeof data === "string" && data.startsWith("http")) {
                            console.log(`✅ API #${i + 1} OK`);
                            return data;
                        }
                    }
                    catch (err) {
                        console.error(`❌ API #${i + 1} falló:`, err);
                    }
                }
                console.error("🚫 Ninguna API devolvió URL válida");
                return null;
            };
            if (["play", "musica", "audio"].includes(cmd)) {
                const url = await downloadBackup(audioApis);
                if (!url)
                    return m.reply("❌ Error al descargar audio");
                await conn.sendMessage(m.chat, { audio: { url }, mimetype: "audio/mpeg", fileName: `${sanitizeFileName(video.title)}.mp3`, contextInfo: {} }, { quoted: m });
                m.react("✅️");
                m.success = true;
            }
            if (["play2", "video"].includes(cmd)) {
                const url = await downloadBackup(videoApis);
                if (!url)
                    return m.reply("❌ Error al descargar video");
                const validTitle = video?.title && video.title.trim() !== "" && video.title !== "Video de YouTube" && video.title !== "Desconocido";
                await conn.sendMessage(m.chat, { video: { url }, mimetype: "video/mp4", caption: validTitle ? `🔰 Aquí está tu video\n${video.title}` : `🔰 Aquí está tu video` }, { quoted: m });
                m.react("✅️");
                m.success = true;
            }
            if (["play3", "playdoc"].includes(cmd)) {
                const url = await downloadBackup(audioApis);
                if (!url)
                    return m.reply("❌ Error al descargar audio");
                await conn.sendMessage(m.chat, { document: { url }, mimetype: "audio/mpeg", fileName: `${sanitizeFileName(video.title)}.mp3`, contextInfo: {} }, { quoted: m });
                m.react("✅️");
                m.success = true;
            }
            if (["play4", "playdoc2"].includes(cmd)) {
                const url = await downloadBackup(videoApis);
                if (!url)
                    return m.reply("❌ Error al descargar video");
                await conn.sendMessage(m.chat, { document: { url }, mimetype: "video/mp4", fileName: `${sanitizeFileName(video.title)}.mp4`, caption: `🔰 *Título:* ${video.title}`, contextInfo: {} }, { quoted: m });
                m.react("✅️");
                m.success = true;
            }
        }
        catch (err) {
            console.error("❌ Error en /play:", err);
            await m.react("❌");
        }
        finally {
            delete userRequests[m.sender];
        }
    }
};
async function search(query) {
    const res = await fetch(`https://api.mitzuki.xyz/search/youtube?q=${encodeURIComponent(query)}&apikey=${process.env.API_KEY}`);
    const data = await res.json();
    return data?.data?.items || [];
}
async function getVideoInfo(url) {
    try {
        const res = await fetch(`https://api.mitzuki.xyz/search/youtube?url=${encodeURIComponent(url)}&apikey=${process.env.API_KEY}`);
        const data = await res.json();
        if (data?.data?.items?.length) {
            return {
                ...data.data.items[0],
                ok: true
            };
        }
    }
    catch { }
    const id = extractYoutubeId(url);
    return {
        title: "Video de YouTube",
        duration: "Desconocida",
        thumbnail: id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "",
        ok: false
    };
}
function extractYoutubeId(url) {
    const clean = url.trim();
    const patterns = [
        /youtu\.be\/([^?&/]+)/i,
        /youtube\.com\/watch\?v=([^&]+)/i,
        /youtube\.com\/shorts\/([^?&/]+)/i,
        /youtube\.com\/embed\/([^?&/]+)/i
    ];
    for (const regex of patterns) {
        const match = clean.match(regex);
        if (match?.[1])
            return match[1];
    }
    return null;
}
function normalizeYouTubeUrl(url) {
    const id = extractYoutubeId(url);
    return id ? `https://youtu.be/${id}` : url.trim();
}
function sanitizeFileName(name) {
    return name.replace(/[\\/:*?"<>|]/g, "").trim();
}
function secondString(seconds) {
    seconds = Number(seconds);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h > 0 ? `${h}h ` : ""}${m}m ${s}s`;
}
