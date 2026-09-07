import axios from "axios";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import fetch from "node-fetch";
import path from "path";
import { tmpdir } from "os";
const execFileAsync = promisify(execFile);
async function fetchAudioBuffer(url) {
    const r = await axios.get(url, {
        responseType: "arraybuffer",
        maxRedirects: 5,
        headers: { "User-Agent": "Mozilla/5.0", "Accept": "*/*" },
        validateStatus: s => s >= 200 && s < 400
    });
    const ct = String(r.headers["content-type"] || "");
    if (!ct.includes("audio") && !ct.includes("octet-stream") && !ct.includes("mpeg")) {
        const sample = Buffer.from(r.data).subarray(0, 200).toString("utf8");
        throw new Error(`No es audio. content-type=${ct}. sample=${sample}`);
    }
    return Buffer.from(r.data);
}
async function mp3ToOpusOgg(inputBuf) {
    const inPath = path.join(tmpdir(), `in_${Date.now()}.bin`);
    const outPath = path.join(tmpdir(), `out_${Date.now()}.ogg`);
    fs.writeFileSync(inPath, inputBuf);
    await execFileAsync("ffmpeg", [
        "-y",
        "-i", inPath,
        "-vn",
        "-ac", "1",
        "-ar", "48000",
        "-c:a", "libopus",
        "-b:a", "48k",
        "-application", "voip",
        outPath
    ]);
    const outBuf = fs.readFileSync(outPath);
    fs.unlinkSync(inPath);
    fs.unlinkSync(outPath);
    return outBuf;
}
const userRequests = {};
export default {
    name: ["music2"],
    run: async ({ conn, m, text, prefijo, cmd }) => {
        if (!text)
            return m.reply(`🤔 ¿Qué está buscando?\n\n${m.e.warn} *Usa:*\n${prefijo + cmd} <canción>\n📌 Ej: ${prefijo + cmd} emilia 420`);
        if (userRequests[m.sender])
            return m.reply(`⏳ Hey @${m.sender.split("@")[0]} espera, ya tienes una descarga en proceso...`);
        userRequests[m.sender] = true;
        try {
            const yt_play = await search(text);
            if (!yt_play || yt_play.length === 0)
                return m.reply(m.e.warn + " No encontré resultados en YouTube");
            const video = yt_play[0];
            console.log("VIDEO OBJ:", video);
            console.log("video.url:", video?.url, "type:", typeof video?.url);
            let yurl = "";
            if (video?.id) {
                yurl = `https://youtu.be/${video.id}`;
            }
            else if (video?.url) {
                const id = video.url.match(/v=([^&]+)/)?.[1];
                yurl = id ? `https://youtu.be/${id}` : video.url;
            }
            console.log("yurl final:", yurl);
            const testApi = `https://api.mitzuki.xyz/download/youtube2?url=${encodeURIComponent(yurl)}&apikey=${process.env.API_KEY}`;
            console.log("api url:", testApi);
            await conn.sendMessage(m.chat, { text: `${video.title}
*⇄ㅤ     ◁   ㅤ  ❚❚ㅤ     ▷ㅤ     ↻*
*⏰ Duración:* ${video.duration}
⏳ Aguarda un momento mientras envío tu archivo...`,
                contextInfo: {
                    externalAdReply: {
                        mediaUrl: video.url,
                        mediaType: 2,
                        title: video.title,
                        body: "Downloader",
                        thumbnailUrl: video.thumbnail,
                        sourceUrl: video.url
                    }
                } }, { quoted: m });
            const audioApis = [
                {
                    url: () => fetch(`https://api.mitzuki.xyz/download/youtube?url=${encodeURIComponent(yurl)}&type=audio&format=mp3&apikey=${process.env.API_KEY}`).then(r => r.json()),
                    extract: (d) => d?.data?.media?.dl_download
                },
                {
                    url: () => fetch(`https://api.mitzuki.xyz/download/youtube2?url=${encodeURIComponent(yurl)}&apikey=${process.env.API_KEY}`).then(r => r.json()),
                    extract: (d) => d?.data?.audio?.url
                },
                {
                    url: () => fetch(`https://api.dorratz.com/v3/ytdl?url=${encodeURIComponent(yurl)}`).then(r => r.json()),
                    extract: (d) => d?.medias?.find((m) => m.quality === "160kbps" && m.extension === "mp3")?.url
                }
            ];
            const videoApis = [
                { url: () => fetch(`https://api.mitzuki.xyz/download/youtube-mp4?url=${video.url}&quality=360&apikey=${process.env.API_KEY}`).then(r => r.json()),
                    extract: (d) => d?.data?.media?.dl_download
                },
                { url: () => fetch(`https://api.mitzuki.xyz/download/youtube?url=${encodeURIComponent(video.url)}&type=video&quality=360&apikey=${process.env.API_KEY}`).then(r => r.json()),
                    extract: (d) => d?.data?.media?.direct
                },
                { url: () => fetch(`https://api.siputzx.my.id/api/d/ytmp4?url=${video.url}`).then(r => r.json()),
                    extract: (d) => d.dl
                }
            ];
            const downloadBackup = async (apis) => {
                for (let i = 0; i < apis.length; i++) {
                    const api = apis[i];
                    try {
                        console.log(`🔍 Probando API #${i + 1}`);
                        const raw = await api.url();
                        console.log(`📦 API #${i + 1} RAW:`, raw);
                        if (raw?.status === false) {
                            console.log(`💥 API #${i + 1} ERROR:`, raw?.error);
                        }
                        const data = api.extract(raw);
                        console.log(`🔗 API #${i + 1} extracted:`, data);
                        if (typeof data === "string" && data.startsWith("http")) {
                            console.log(`✅ API #${i + 1} OK`);
                            return data;
                        }
                    }
                    catch (err) {
                        console.error(`❌ API #${i + 1} falló:`, err?.message || err);
                    }
                }
                console.error("🚫 Ninguna API devolvió URL válida");
                return null;
            };
            if (["music2"].includes(cmd)) {
                let url = null;
                url = await downloadBackup(audioApis);
                if (!url) {
                    console.log("❌ No se obtuvo URL de audio desde ninguna API");
                    return m.reply("❌ Error al descargar audio (ninguna API devolvió link).");
                }
                console.log("🎧 DL URL:", url);
                const audioSrcBuf = await fetchAudioBuffer(url);
                console.log("✅ Audio buffer bytes:", audioSrcBuf.length);
                const opusBuf = await mp3ToOpusOgg(audioSrcBuf);
                console.log("✅ Opus buffer bytes:", opusBuf.length);
                await conn.sendMessage(m.chat, {
                    audio: opusBuf,
                    mimetype: "audio/ogg; codecs=opus",
                    ptt: true,
                    contextInfo: {
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: "120363285614743024@newsletter",
                            newsletterName: "ᴄʜᴀɴɴᴇʟ🦖ᴢᴇɴᴛʀɪx",
                        },
                        forwardingScore: 999,
                        isForwarded: true,
                    },
                }, { quoted: m });
            }
            if (["play2", "video"].includes(cmd)) {
                let url = null;
                if (!url)
                    url = await downloadBackup(videoApis);
                //if (!url) return m.reply("❌ Error al descargar video")
                await conn.sendMessage(m.chat, { video: { url }, mimetype: "video/mp4", caption: `🔰 Aquí está tu video\n${video.title}` }, { quoted: m });
            }
            if (["play3", "playdoc"].includes(cmd)) {
                let url = null;
                if (!url)
                    url = await downloadBackup(audioApis);
                //if (!url) return m.reply("❌ Error al descargar audio")
                await conn.sendMessage(m.chat, { document: { url }, mimetype: "audio/mpeg", fileName: `${video.title}.mp3` }, { quoted: m });
            }
            if (["play4", "playdoc2"].includes(cmd)) {
                let url = null;
                /*try {
                const res = await fetch(`${apiBase}/ytmp4.php?url=${encodeURIComponent(video.url)}`)
                const data = (await res.json()) as ApiResponse
                if (data?.status) url = data.data?.download?.url || null
                } catch {}*/
                if (!url)
                    url = await downloadBackup(videoApis);
                if (!url)
                    return m.reply("❌ Error al descargar video");
                await conn.sendMessage(m.chat, { document: { url }, mimetype: "video/mp4", fileName: `${video.title}.mp4`, caption: `🔰 *Título:* ${video.title}` }, { quoted: m });
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
function secondString(seconds) {
    seconds = Number(seconds);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h > 0 ? `${h}h ` : ""}${m}m ${s}s`;
}
