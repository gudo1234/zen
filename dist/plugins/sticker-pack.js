import axios from "axios";
import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import ffmpeg from "fluent-ffmpeg";
import { db } from "../lib/db.js";
const packnameDefault = "𝗦𝗧𝗜𝗖𝗞𝗘𝗥𝗦❤️‍🔥 - Mitzuki\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n";
const authorDefault = "Owner: @elrebelde21\n• Dueña: @itschinita_official";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const cooldown = new Map();
const cache = new Map();
function fileExists(p) {
    try {
        fs.accessSync(p);
        return true;
    }
    catch {
        return false;
    }
}
function ffmpegToWebp(input, output) {
    return new Promise((resolve, reject) => {
        ffmpeg(input)
            .inputOptions(["-y"])
            .outputOptions([
            "-vcodec", "libwebp",
            "-vf",
            "scale='min(320,iw)':'min(320,ih)':force_original_aspect_ratio=decrease,fps=15,pad=320:320:-1:-1:color=white@0.0"
        ])
            .toFormat("webp")
            .save(output)
            .on("end", resolve)
            .on("error", reject);
    });
}
function mp4ToPngFirstFrame(input, outputPng) {
    return new Promise((resolve, reject) => {
        ffmpeg(input)
            .inputOptions(["-y"])
            .outputOptions([
            "-vf",
            "thumbnail,scale='min(512,iw)':'min(512,ih)':force_original_aspect_ratio=decrease"
        ])
            .frames(1)
            .save(outputPng)
            .on("end", resolve)
            .on("error", reject);
    });
}
export default {
    name: ["stickerly"],
    tags: ["sticker"],
    help: ["stickerly <nombre> o stickerly <número>"],
    desc: "Busca y descarga packs completos de stickers",
    register: true,
    run: async ({ conn, m, text, prefijo, cmd }) => {
        const user = m.sender;
        const now = Date.now();
        if (!text)
            return m.reply(`${m.e.warn} *Usa:*\n${prefijo}stickerly <nombre>\n📌 Ej: *${prefijo}stickerly AuronPlay*`);
        if (/^\d+$/.test(text.trim())) {
            const packs = cache.get(m.chat);
            const num = parseInt(text.trim());
            if (!packs)
                return m.reply(`${m.e.warn} Primero busca un pack con un nombre.\nEj: ${prefijo + cmd} AuronPlay`);
            if (num < 1 || num > packs.length)
                return m.reply(`⚠️ Elige un número entre 1 y ${packs.length}`);
            const pack = packs[num - 1];
            await m.react("⬇️");
            const userResult = await db.query("SELECT sticker_packname, sticker_author FROM usuarios WHERE id = $1", [m.sender]);
            const u = userResult.rows[0] || {};
            const packname = u.sticker_packname || packnameDefault;
            const author = u.sticker_author || authorDefault;
            try {
                const id = pack.url.split("/s/")[1];
                const { data } = await axios.get(`https://api.sticker.ly/v3.1/stickerPack/${id}`, { headers: { "User-Agent": "androidapp.stickerly/1.13.3 (Android)" } });
                const result = data.result;
                if (!result?.stickers?.length)
                    return m.reply(m.e.error + " No se pudo obtener el pack (sin stickers).");
                const prefix = result.resourceUrlPrefix;
                const stickers = result.stickers;
                const total = stickers.length;
                await m.reply(`📦 *${pack.name}*\n👤 ${pack.author}\n> Descargando ${total} stickers...`);
                const stickerItems = [];
                for (let i = 0; i < stickers.length; i++) {
                    const s = stickers[i];
                    const url = prefix + s.fileName;
                    let ext = ".png";
                    if (url.includes(".mp4"))
                        ext = ".mp4";
                    else if (url.includes(".webp"))
                        ext = ".webp";
                    else if (url.includes(".jpg") || url.includes(".jpeg"))
                        ext = ".jpg";
                    else if (url.includes(".png"))
                        ext = ".png";
                    const tmpIn = path.join(tmpdir(), `${Date.now()}_${i}${ext}`);
                    const tmpWebp = path.join(tmpdir(), `${Date.now()}_${i}.webp`);
                    const tmpPng = path.join(tmpdir(), `${Date.now()}_${i}.png`);
                    try {
                        const res = await axios.get(url, { responseType: "arraybuffer" });
                        await fs.promises.writeFile(tmpIn, res.data);
                        if (ext === ".mp4") {
                            await mp4ToPngFirstFrame(tmpIn, tmpPng);
                            const buf = await fs.promises.readFile(tmpPng);
                            stickerItems.push({ sticker: buf, emojis: [""] });
                            continue;
                        }
                        if (ext === ".webp") {
                            const buf = await fs.promises.readFile(tmpIn);
                            stickerItems.push({ sticker: buf, emojis: [""] });
                            continue;
                        }
                        await ffmpegToWebp(tmpIn, tmpWebp);
                        const buf = await fs.promises.readFile(tmpWebp);
                        stickerItems.push({ sticker: buf, emojis: [""] });
                    }
                    catch (err) {
                        console.error(`Error con sticker ${i + 1}:`, err);
                    }
                    finally {
                        if (fileExists(tmpIn))
                            fs.unlinkSync(tmpIn);
                        if (fileExists(tmpWebp))
                            fs.unlinkSync(tmpWebp);
                        if (fileExists(tmpPng))
                            fs.unlinkSync(tmpPng);
                    }
                }
                if (!stickerItems.length)
                    return m.reply("❌ No se pudo descargar ningún sticker.");
                await conn.sendMessage(m.chat, {
                    cover: stickerItems[0].sticker,
                    stickers: stickerItems.map(s => ({
                        data: s.sticker,
                        emojis: s.emojis
                    })),
                    name: packname,
                    publisher: author,
                    description: ""
                }, { quoted: m });
                cooldown.set(user, now);
                await m.react("✅");
            }
            catch (err) {
                console.error("Error descargando pack:", err);
                await m.react("❌");
            }
            return;
        }
        await m.react("⏳");
        try {
            const { data } = await axios.get(`https://api.mitzuki.xyz/search/stickerly?page=1&query=${encodeURIComponent(text)}&apikey=${process.env.API_KEY}`);
            if (!data?.status || !Array.isArray(data?.data) || !data.data.length)
                return m.reply("⚠️ No se encontraron resultados.");
            const packs = data.data.slice(0, 50);
            cache.set(m.chat, packs);
            let msg = `🎨 *Resultados para:* ${text}\n\n`;
            for (let i = 0; i < packs.length; i++) {
                const p = packs[i];
                msg += `*${i + 1}.* ${p.name}\n👤 ${p.author}\n📦 ${p.stickerCount} stickers\n🔗 ${p.url}\n\n`;
            }
            msg += `Responde con *${prefijo}stickerly <número>* para descargar el pack completo.`;
            await m.reply(msg);
            await m.react("✅");
        }
        catch (e) {
            console.error("Error buscando pack:", e);
            await m.react("❌");
            m.reply(`${m.e.warn + m.msg.error}\n\n >>> ${e} <<<< `);
        }
    }
};
