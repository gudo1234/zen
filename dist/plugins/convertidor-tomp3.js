import { toAudio, toPTT, webpToVideoSharp } from "../lib/converter.js";
export default {
    name: ["tomp3", "toaud", "tovideo", "tovid"],
    help: ["tomp3", "toaud", "tovideo"],
    desc: "Convierte multimedia a MP3, nota de voz o video",
    tags: ["convertidor"],
    register: true,
    run: async ({ conn, m, prefijo, cmd }) => {
        const q = m.quoted ? m.quoted : m;
        const msg = q.message || {};
        const audioMsg = msg.audioMessage || {};
        const videoMsg = msg.videoMessage || {};
        const stickerMsg = msg.stickerMessage || {};
        const realMime = audioMsg.mimetype || videoMsg.mimetype || stickerMsg.mimetype || q.mimetype || "";
        const mime = realMime;
        if (/^tovideo|tovid$/i.test(cmd)) {
            if (!/webp|sticker/i.test(mime)) {
                return m.reply(`${m.e.warn} *Este comando solo funciona con stickers animados*\n\n📌 Responde a un sticker animado con:\n> *${prefijo + cmd}*`);
            }
            const stickerMsg = q.message?.stickerMessage;
            const isAnimated = stickerMsg?.isAnimated === true;
            if (!isAnimated) {
                return m.reply(`${m.e.warn} *Este sticker NO es animado*\n\n📌 Solo stickers animados (con movimiento) se pueden convertir a video.`);
            }
            const media = await q.download();
            if (!media)
                return m.reply(m.e.warn + " No se pudo descargar el sticker.");
            await m.react("🎚️");
            try {
                await m.reply("Calmaoooo estoy procesando 😎\n\n> *Convirtiendo sticker animado a video MP4 🔄*");
                const videoData = await webpToVideoSharp(media);
                await conn.sendMessage(m.chat, {
                    video: videoData
                }, { quoted: m });
                await m.react("✅");
            }
            catch (err) {
                console.error(err);
                await m.reply(`${m.e.error + m.msg.error}\n\n >>> ${err} <<<< `);
                await m.react("❌");
            }
            return;
        }
        if (!/video|audio|webp|sticker/i.test(mime))
            return m.reply(`${m.e.warn} *¿Y el archivo multimedia?*\n\n📌 Responde a un video, audio o sticker con:\n> *${prefijo + cmd}*`);
        const media = await q.download();
        if (!media)
            return m.reply(m.e.warn + " No se pudo descargar el archivo.");
        await m.react("🎚️");
        try {
            let result = null;
            let mimetype = "";
            let text = "";
            let ptt = false;
            let inputExt = /webp|sticker/i.test(mime) ? "webp" : "mp4";
            if (/^tomp3$/i.test(cmd)) {
                text = "Calmaoooo estoy procesando 😎\n\n> *Convirtiendo de MP4 a MP3 🔄*";
                result = await toAudio(media, inputExt);
                mimetype = "audio/mpeg";
                ptt = false;
                await m.reply(text);
                await conn.sendMessage(m.chat, { audio: result.data, mimetype, ptt, contextInfo: {} }, { quoted: m });
            }
            else if (/^toaud$/i.test(cmd)) {
                if (/audio\//i.test(mime)) {
                    text = "Calmaoooo estoy procesando 😎\n\n> Convirtiendo a nota de voz...";
                    result = { data: media, filename: 'audio.mp3' };
                    mimetype = "audio/ogg; codecs=opus";
                    ptt = true;
                    await m.reply(text);
                    await conn.sendMessage(m.chat, { audio: result.data, mimetype, ptt }, { quoted: m });
                }
                else {
                    text = "Calmaoooo estoy procesando 😎\n\n> Convirtiendo a nota de voz...";
                    result = await toPTT(media, inputExt);
                    mimetype = "audio/ogg; codecs=opus";
                    ptt = true;
                    await m.reply(text);
                    await conn.sendMessage(m.chat, { audio: result.data, mimetype, ptt }, { quoted: m });
                }
            }
            await m.react("✅");
        }
        catch (err) {
            console.error(err);
            await m.reply(`${m.e.error + m.msg.error}\n\n >>> ${err} <<<< `);
            await m.react("❌");
        }
    }
};
