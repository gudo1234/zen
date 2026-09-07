import fetch from "node-fetch";
import FormData from "form-data";
import { downloadContentFromMessage } from "@whiskeysockets/baileys";
const inProcess = {};
const MAX_DURATION = 60;
export default {
    name: ["whatmusic", "shazam", "quemusica", "song"],
    help: ["whatmusic"],
    desc: "Reconoce música desde audio o video",
    tags: ["tools"],
    limitPrem: true,
    run: async ({ conn, m, text, prefijo, cmd }) => {
        if (inProcess[m.sender]) {
            return m.reply("⏳ Ya tienes un reconocimiento de música en proceso...");
        }
        inProcess[m.sender] = true;
        await m.react?.("🎧");
        try {
            const apikey = process.env.API_KEY || "";
            if (!apikey) {
                throw new Error("Falta configurar process.env.API_KEY");
            }
            let result = null;
            const quoted = getQuotedMessage(m);
            const directMsg = getRealMessage(m.message);
            const media = quoted?.audioMessage
                ? {
                    msg: quoted.audioMessage,
                    type: "audio"
                }
                : quoted?.videoMessage
                    ? {
                        msg: quoted.videoMessage,
                        type: "video"
                    }
                    : directMsg?.audioMessage
                        ? {
                            msg: directMsg.audioMessage,
                            type: "audio"
                        }
                        : directMsg?.videoMessage
                            ? {
                                msg: directMsg.videoMessage,
                                type: "video"
                            }
                            : null;
            if (text && /^https?:\/\//i.test(text)) {
                result = await recognizeByUrl(text.trim(), apikey);
            }
            else if (media) {
                const seconds = Number(media.msg?.seconds ||
                    media.msg?.duration ||
                    0);
                if (seconds > MAX_DURATION) {
                    return m.reply(`⚠️ El audio/video no puede durar más de *${MAX_DURATION} segundos*.\n\n` +
                        `🎧 Duración detectada: *${seconds}s*`);
                }
                const buffer = await downloadMedia(media.msg, media.type);
                result = await recognizeByFile(buffer, apikey);
            }
            else {
                return m.reply(`🎧 Responde a un audio/video o envía una URL directa de audio.`);
            }
            if (!result?.status || !result?.data) {
                return m.reply(`❌ No pude reconocer la música.`);
            }
            const d = result.data;
            const caption = `🎧 *WHAT MUSIC*\n\n` +
                `🎵 *Título:* ${d.title || "Desconocido"}\n` +
                `👤 *Artista:* ${d.artist || "Desconocido"}\n` +
                `💿 *Álbum:* ${d.album || "Desconocido"}\n` +
                `📅 *Lanzamiento:* ${d.release_date || "Desconocido"}\n` +
                `⏱️ *Duración:* ${d.duration || "Desconocido"}\n` +
                `🎯 *Coincidencia:* ${d.matched_at || "Desconocido"}\n\n` +
                `🔗 *Enlaces*\n` +
                `${d.links?.song ? `• Canción: ${d.links.song}\n` : ""}` +
                `${d.links?.spotify ? `• Spotify: ${d.links.spotify}\n` : ""}` +
                `${d.links?.apple_music ? `• Apple Music: ${d.links.apple_music}\n` : ""}` +
                `${d.links?.deezer ? `• Deezer: ${d.links.deezer}` : ""}`;
            await m.reply(caption.trim());
            if (d.preview) {
                await conn.sendMessage(m.chat, {
                    audio: {
                        url: d.preview
                    },
                    mimetype: "audio/mpeg",
                    fileName: `${safeName(d.title || "preview")}.mp3`
                }, {
                    quoted: m
                });
            }
            await m.react?.("✅");
        }
        catch (e) {
            console.error("[WHATMUSIC BOT ERROR]", e);
            await m.react?.("❌");
            await m.reply(`❌ Error reconociendo la música.\n\n${e?.message || e}`);
        }
        finally {
            delete inProcess[m.sender];
        }
    }
};
async function recognizeByUrl(url, apikey) {
    const apiUrl = `https://api.mitzuki.xyz/tools/whatmusic` +
        `?url=${encodeURIComponent(url)}` +
        `&apikey=${encodeURIComponent(apikey)}`;
    const res = await fetch(apiUrl);
    return await res.json();
}
async function recognizeByFile(buffer, apikey) {
    const form = new FormData();
    form.append("file", buffer, {
        filename: "audio.mp3",
        contentType: "audio/mpeg"
    });
    const res = await fetch(`https://api.mitzuki.xyz/tools/whatmusic?apikey=${encodeURIComponent(apikey)}`, {
        method: "POST",
        body: form,
        headers: form.getHeaders()
    });
    return await res.json();
}
async function downloadMedia(msg, type) {
    const stream = await downloadContentFromMessage(msg, type);
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
}
function getRealMessage(message) {
    return (message?.ephemeralMessage?.message ||
        message?.viewOnceMessage?.message ||
        message?.viewOnceMessageV2?.message ||
        message);
}
function getQuotedMessage(m) {
    const msg = getRealMessage(m.message);
    return (msg?.extendedTextMessage?.contextInfo?.quotedMessage ||
        msg?.imageMessage?.contextInfo?.quotedMessage ||
        msg?.videoMessage?.contextInfo?.quotedMessage ||
        msg?.audioMessage?.contextInfo?.quotedMessage ||
        null);
}
function safeName(name) {
    return String(name || "audio")
        .replace(/[\\/:*?"<>|]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80);
}
