import { db } from "../lib/db.js";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import crypto from "crypto";
import webp from "node-webpmux";
const packnameDefault = "𝗦𝗧𝗜𝗖𝗞𝗘𝗥𝗦❤️‍🔥 - Mitzuki\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n";
const authorDefault = "Owner: @elrebelde21\n• Dueña: @itschinita_official";
async function addExif(webpSticker, packname, author, categories = [""]) {
    const img = new webp.Image();
    const stickerPackId = crypto.randomBytes(32).toString("hex");
    const json = {
        "sticker-pack-id": stickerPackId,
        "sticker-pack-name": packname,
        "sticker-pack-publisher": author,
        emojis: categories
    };
    const exifAttr = Buffer.from([
        0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x16, 0x00, 0x00, 0x00
    ]);
    const jsonBuffer = Buffer.from(JSON.stringify(json), "utf8");
    const exif = Buffer.concat([exifAttr, jsonBuffer]);
    exif.writeUIntLE(jsonBuffer.length, 14, 4);
    await img.load(webpSticker);
    img.exif = exif;
    return await img.save(null);
}
export default {
    name: ["s", "sticker"],
    help: ["s", "sticker"],
    tags: ["sticker"],
    desc: "Convierte imagen o video en sticker",
    run: async ({ conn, m, prefijo, cmd }) => {
        let tmpIn = null;
        let tmpOut = null;
        let tmpFinal = null;
        try {
            const userResult = await db.query("SELECT sticker_packname, sticker_author FROM usuarios WHERE id = $1", [m.sender]);
            const user = userResult.rows[0] || {};
            let f, g;
            if (user.sticker_packname && user.sticker_author) {
                f = user.sticker_packname;
                g = user.sticker_author;
            }
            else if (user.sticker_packname && !user.sticker_author) {
                f = user.sticker_packname;
                g = authorDefault;
            }
            else {
                f = packnameDefault;
                g = authorDefault;
            }
            const q = m.quoted ? m.quoted : m;
            const mime = (q.msg || q).mimetype || q.mediaType || "";
            if (!/webp|image|video/.test(mime)) {
                return m.reply(null, m.e.warn + " *Y la imagen o video? 🤔* Responde a una imagen, video o sticker para hacer el sticker.");
            }
            if (/video/.test(mime) && (q.msg || q).seconds > 18) {
                return m.reply(m.e.warn +
                    " ¿Dónde has visto un sticker de 15 segundos? Hazlo más corto, máximo 12s.");
            }
            const img = await q.download?.();
            if (!img) {
                return m.reply(null, m.e.warn +
                    " *Y la imagen? 🤔* Responde a una imagen, video o sticker para hacer el sticker.");
            }
            tmpFinal = path.join(tmpdir(), `${Date.now()}_${crypto.randomBytes(4).toString("hex")}_final.webp`);
            if (mime.includes("webp")) {
                const finalSticker = await addExif(img, f, g);
                await fs.promises.writeFile(tmpFinal, finalSticker);
                await conn.sendFile(m.chat, tmpFinal, "sticker.webp", "", m, false, {
                    asSticker: true,
                    isAiSticker: true
                });
                return;
            }
            const ext = mime.includes("video") ? "mp4" : "jpg";
            tmpIn = path.join(tmpdir(), `${Date.now()}_${crypto.randomBytes(4).toString("hex")}.${ext}`);
            tmpOut = path.join(tmpdir(), `${Date.now()}_${crypto.randomBytes(4).toString("hex")}.webp`);
            await fs.promises.writeFile(tmpIn, img);
            await new Promise((resolve, reject) => {
                ffmpeg(tmpIn)
                    .inputOptions(["-y"])
                    .outputOptions([
                    "-vcodec libwebp",
                    "-vf",
                    "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15,pad=320:320:-1:-1:color=white@0.0,split [a][b];[a] palettegen=reserve_transparent=on:transparency_color=ffffff [p];[b][p] paletteuse"
                ])
                    .toFormat("webp")
                    .save(tmpOut)
                    .on("end", resolve)
                    .on("error", reject);
            });
            const finalSticker = await addExif(await fs.promises.readFile(tmpOut), f, g);
            await fs.promises.writeFile(tmpFinal, finalSticker);
            await conn.sendFile(m.chat, tmpFinal, "sticker.webp", "", m, false, {
                asSticker: true,
                isAiSticker: true
            });
        }
        catch (err) {
            console.error("❌ Error en /s:", err);
            return m.reply(m.e.error + " *Error creando el sticker.*");
        }
        finally {
            for (const file of [tmpIn, tmpOut, tmpFinal]) {
                if (file && fs.existsSync(file)) {
                    try {
                        fs.unlinkSync(file);
                    }
                    catch { }
                }
            }
        }
    }
};
