import { db } from "../lib/db.js";
import fetch from "node-fetch";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import crypto from "crypto";
import webp from "node-webpmux";
import FormData from "form-data";
const packnameDefault = "𝗦𝗧𝗜𝗖𝗞𝗘𝗥𝗦❤️‍🔥 - Mitzuki\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n";
const authorDefault = "Owner: @elrebelde21\n• Dueña: @itschinita_official";
async function addExif(webpSticker, packname, author, categories = ["😂"]) {
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
async function imageToWebp(buffer) {
    const tmpIn = path.join(tmpdir(), `${Date.now()}_${crypto.randomBytes(4).toString("hex")}.png`);
    const tmpOut = path.join(tmpdir(), `${Date.now()}_${crypto.randomBytes(4).toString("hex")}.webp`);
    await fs.promises.writeFile(tmpIn, buffer);
    await new Promise((resolve, reject) => {
        ffmpeg(tmpIn)
            .inputOptions(["-y"])
            .outputOptions([
            "-vcodec libwebp",
            "-vf",
            "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15,pad=320:320:-1:-1:color=white@0.0",
            "-preset default",
            "-an",
            "-vsync 0"
        ])
            .toFormat("webp")
            .save(tmpOut)
            .on("end", resolve)
            .on("error", reject);
    });
    const webpBuffer = await fs.promises.readFile(tmpOut);
    try {
        fs.unlinkSync(tmpIn);
    }
    catch { }
    try {
        fs.unlinkSync(tmpOut);
    }
    catch { }
    return webpBuffer;
}
async function uploadToMitzukiCdn(buffer, filename = "smeme.png") {
    const form = new FormData();
    form.append("file", buffer, filename);
    const res = await fetch(`https://api.mitzuki.xyz/cdn/upload?apikey=${process.env.API_KEY}&expire=1h`, {
        method: "POST",
        body: form,
        headers: form.getHeaders()
    });
    const raw = await res.text();
    const json = JSON.parse(raw);
    if (!json?.status || !json?.data?.url) {
        throw new Error(json?.error || "CDN no devolvió URL");
    }
    return json.data.url;
}
export default {
    name: ["smeme"],
    tags: ["sticker"],
    help: ["smeme <texto arriba>|<texto abajo>"],
    desc: "Crea sticker meme respondiendo a imagen o sticker",
    register: true,
    run: async ({ conn, m, text, prefijo }) => {
        let tmpFinal = null;
        try {
            const q = m.quoted ? m.quoted : m;
            const mime = (q.msg || q).mimetype || q.mediaType || "";
            if (!/image|webp/.test(mime))
                return m.reply(`😂 *SMEME STICKER*\n\nResponde a una imagen o sticker con:\n\n*${prefijo}smeme texto arriba|texto abajo*\n\nEjemplo:\n*${prefijo}smeme mitzuki|official*`);
            if (!text)
                return m.reply(`⚠️ Falta el texto.\n\nEjemplo:\n*${prefijo}smeme nice|gurl*`);
            await m.react?.("🕒");
            let [top, bottom] = text.split("|");
            top = top?.trim() || " ";
            bottom = bottom?.trim() || " ";
            const media = await q.download?.();
            if (!media)
                throw new Error("No pude descargar la imagen/sticker");
            let imageBuffer = media;
            if (/webp/.test(mime)) {
                imageBuffer = await new Promise((resolve, reject) => {
                    const tmpIn = path.join(tmpdir(), `${Date.now()}_in.webp`);
                    const tmpOut = path.join(tmpdir(), `${Date.now()}_out.png`);
                    fs.writeFileSync(tmpIn, media);
                    ffmpeg(tmpIn)
                        .outputOptions(["-vframes 1"])
                        .save(tmpOut)
                        .on("end", () => {
                        const buf = fs.readFileSync(tmpOut);
                        try {
                            fs.unlinkSync(tmpIn);
                        }
                        catch { }
                        try {
                            fs.unlinkSync(tmpOut);
                        }
                        catch { }
                        resolve(buf);
                    })
                        .on("error", reject);
                });
            }
            const imageUrl = await uploadToMitzukiCdn(imageBuffer, "smeme.png");
            const api = `https://api.mitzuki.xyz/maker/smeme?top=${encodeURIComponent(top)}&image=${encodeURIComponent(imageUrl)}&bottom=${encodeURIComponent(bottom)}&apikey=${process.env.API_KEY}`;
            const res = await fetch(api);
            const raw = await res.text();
            const json = JSON.parse(raw);
            if (!json?.status || !json?.data?.url) {
                throw new Error(json?.message || "La API no devolvió imagen");
            }
            const imgRes = await fetch(json.data.url);
            if (!imgRes.ok)
                throw new Error("No pude descargar el resultado");
            const buffer = Buffer.from(await imgRes.arrayBuffer());
            const userResult = await db.query("SELECT sticker_packname, sticker_author FROM usuarios WHERE id = $1", [m.sender]);
            const user = userResult.rows[0] || {};
            const packname = user.sticker_packname || packnameDefault;
            const author = user.sticker_author || authorDefault;
            const webpBuffer = await imageToWebp(buffer);
            const finalSticker = await addExif(webpBuffer, packname, author);
            tmpFinal = path.join(tmpdir(), `${Date.now()}_${crypto.randomBytes(4).toString("hex")}_smeme.webp`);
            await fs.promises.writeFile(tmpFinal, finalSticker);
            await conn.sendFile(m.chat, tmpFinal, "sticker.webp", "", m, false, { asSticker: true, isAiSticker: true });
            await m.react?.("✅");
        }
        catch (e) {
            console.error("❌ Error en smeme:", e);
            await m.react?.("❌");
            await m.reply("❌ Error creando el sticker smeme.");
        }
        finally {
            if (tmpFinal && fs.existsSync(tmpFinal)) {
                try {
                    fs.unlinkSync(tmpFinal);
                }
                catch { }
            }
        }
    }
};
