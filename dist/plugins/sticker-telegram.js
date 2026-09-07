import axios from "axios";
import { db } from "../lib/db.js";
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { execFile } from "child_process";
const packnameDefault = "𝗦𝗧𝗜𝗖𝗞𝗘𝗥𝗦❤️‍🔥 - Mitzuki\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n";
const authorDefault = "Owner: @elrebelde21\n• Dueña: @itschinita_official";
function execFileAsync(file, args) {
    return new Promise((resolve, reject) => {
        execFile(file, args, { timeout: 120000 }, (err, stdout, stderr) => {
            if (err) {
                err.stderr = stderr;
                return reject(err);
            }
            resolve({ stdout, stderr });
        });
    });
}
async function downloadToTmp(url, ext = ".bin") {
    const id = crypto.randomBytes(8).toString("hex");
    const file = path.join(os.tmpdir(), `tgsticker_${id}${ext}`);
    const r = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 60000
    });
    fs.writeFileSync(file, Buffer.from(r.data));
    return file;
}
async function webmToAnimatedWebp(url) {
    const input = await downloadToTmp(url, ".webm");
    const output = input.replace(".webm", ".webp");
    try {
        await execFileAsync("ffmpeg", [
            "-y",
            "-i", input,
            "-t", "6",
            "-vf",
            "fps=15,scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000",
            "-loop", "0",
            "-an",
            "-vsync", "0",
            output
        ]);
        const buffer = fs.readFileSync(output);
        return buffer;
    }
    finally {
        fs.existsSync(input) && fs.unlinkSync(input);
        fs.existsSync(output) && fs.unlinkSync(output);
    }
}
async function buildStickerData(s) {
    const url = s.sticker_url || s.image_url;
    if (!url)
        return null;
    if (s.ext === "webm" ||
        s.type === "video" ||
        s.is_video ||
        url.includes(".webm")) {
        return await webmToAnimatedWebp(url); // Buffer directo
    }
    return { url };
}
export default {
    name: ["tgsticker"],
    tags: ["sticker"],
    help: ["tgsticker <texto|link>"],
    desc: "Descarga packs de stickers de Telegram.",
    register: true,
    run: async ({ conn, m, text }) => {
        try {
            if (!text) {
                return m.reply("❌ Usa:\n" +
                    "• .tgsticker anime\n" +
                    "• .tgsticker https://t.me/addstickers/bujiu");
            }
            await m.react("⏳");
            const { data } = await axios.get("https://api.mitzuki.xyz/search/sticker-tg", {
                params: {
                    q: text,
                    apikey: process.env.API_KEY
                },
                timeout: 60000
            });
            if (!data?.status) {
                await m.react("❌");
                return m.reply("❌ " + (data?.error || "No se encontró el pack"));
            }
            let pack = null;
            if (data.type === "pack") {
                pack = data.data;
            }
            else if (data.type === "search") {
                if (!Array.isArray(data.data) || !data.data.length) {
                    await m.react("❌");
                    return m.reply("❌ No se encontraron packs");
                }
                pack = data.data[0];
            }
            if (!pack?.stickers?.length) {
                await m.react("❌");
                return m.reply("❌ El pack no tiene stickers");
            }
            const allStickers = pack.stickers.filter(s => s.sticker_url || s.image_url);
            if (!allStickers.length) {
                await m.react("❌");
                return m.reply("❌ No se pudieron obtener stickers válidos");
            }
            const chunks = [];
            for (let i = 0; i < allStickers.length; i += 60) {
                chunks.push(allStickers.slice(i, i + 60));
            }
            const packs = chunks.slice(0, 3);
            const userResult = await db.query("SELECT sticker_packname, sticker_author FROM usuarios WHERE id = $1", [m.sender]);
            const u = userResult.rows[0] || {};
            const packname = u.sticker_packname || packnameDefault;
            const author = u.sticker_author || authorDefault;
            await m.reply(`📦 *${pack.title || pack.name}*\n` +
                `🧩 Stickers: ${pack.sticker_count || allStickers.length}\n` +
                `📤 Enviaré: ${packs.length} paquete${packs.length > 1 ? "s" : ""}\n` +
                `🎞 Tipo: ${pack.type || "regular"}\n\n` +
                `⬇️ Enviando pack...`);
            for (const [index, chunk] of packs.entries()) {
                const stickerItems = [];
                for (const s of chunk) {
                    const stickerData = await buildStickerData(s);
                    if (!stickerData)
                        continue;
                    stickerItems.push({
                        data: stickerData,
                        emojis: [s.emoji || "❤"]
                    });
                }
                if (!stickerItems.length)
                    continue;
                await conn.sendMessage(m.chat, {
                    cover: Buffer.isBuffer(stickerItems[0].data)
                        ? { url: chunk[0].thumb_url || chunk[0].sticker_url || chunk[0].image_url }
                        : stickerItems[0].data,
                    stickers: stickerItems,
                    name: packs.length > 1
                        ? `${packname} (${index + 1}/${packs.length})`
                        : packname,
                    publisher: author,
                    description: `• Pack ${index + 1}/${packs.length}\n` +
                        `• by: api.mitzuki.xyz`
                }, { quoted: m });
            }
            await m.react("✅");
        }
        catch (e) {
            console.error("TGSTICKER ERROR:", e);
            await m.react("❌").catch(() => { });
            return m.reply("❌ Error descargando stickers\n\n" +
                (e?.response?.data?.error || e.message));
        }
    }
};
