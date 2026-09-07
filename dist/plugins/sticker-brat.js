import { db } from "../lib/db.js";
import fetch from "node-fetch";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import crypto from "crypto";
import webp from "node-webpmux";
const packnameDefault = "𝗦𝗧𝗜𝗖𝗞𝗘𝗥𝗦❤️‍🔥 - Mitzuki\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n";
const authorDefault = "Owner: @elrebelde21\n• Dueña: @itschinita_official";
async function addExif(webpSticker, packname, author, categories = ["🍏"]) {
    const img = new webp.Image();
    const json = {
        "sticker-pack-id": crypto.randomBytes(32).toString("hex"),
        "sticker-pack-name": packname,
        "sticker-pack-publisher": author,
        emojis: categories
    };
    const exifAttr = Buffer.from([
        0x49, 0x49, 0x2a, 0x00,
        0x08, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x41, 0x57,
        0x07, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x16, 0x00,
        0x00, 0x00
    ]);
    const jsonBuffer = Buffer.from(JSON.stringify(json), "utf8");
    const exif = Buffer.concat([exifAttr, jsonBuffer]);
    exif.writeUIntLE(jsonBuffer.length, 14, 4);
    await img.load(webpSticker);
    img.exif = exif;
    return await img.save(null);
}
async function toStickerWebp(buffer, ext = "png") {
    let tmpIn = "";
    let tmpOut = "";
    try {
        const id = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
        tmpIn = path.join(tmpdir(), `${id}.${ext}`);
        tmpOut = path.join(tmpdir(), `${id}.webp`);
        await fs.promises.writeFile(tmpIn, buffer);
        await new Promise((resolve, reject) => {
            ffmpeg(tmpIn)
                .inputOptions(["-y"])
                .outputOptions([
                "-vcodec",
                "libwebp",
                "-vf",
                "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15,pad=320:320:-1:-1:color=white@0.0",
                "-loop",
                "0",
                "-preset",
                "default",
                "-an",
                "-vsync",
                "0"
            ])
                .toFormat("webp")
                .save(tmpOut)
                .on("end", () => resolve())
                .on("error", (err) => reject(err));
        });
        return await fs.promises.readFile(tmpOut);
    }
    finally {
        await Promise.allSettled([tmpIn, tmpOut]
            .filter(Boolean)
            .map(file => fs.promises.unlink(file)));
    }
}
export default {
    name: ["brat", "bratvid", "bratanime"],
    tags: ["sticker"],
    help: ["brat <texto>", "bratvid <texto>", "bratanime <texto>"],
    desc: "Generador de stickers brat",
    register: true,
    run: async ({ conn, m, text, cmd, prefijo }) => {
        let tmpFinal = "";
        if (!text) {
            return m.reply(null, `*🍏 BRAT MAKER*\n\n` +
                `Comandos disponibles:\n` +
                `➜ ${prefijo}brat hola\n` +
                `➜ ${prefijo}bratvid hola\n` +
                `➜ ${prefijo}bratanime hola\n`);
        }
        await m.react?.("🕒");
        try {
            const userResult = await db.query("SELECT sticker_packname, sticker_author FROM usuarios WHERE id = $1", [m.sender]);
            const user = (userResult.rows[0] || {});
            const packname = user.sticker_packname ||
                packnameDefault;
            const author = user.sticker_author ||
                authorDefault;
            const apiKey = process.env.API_KEY || "";
            if (!apiKey) {
                throw new Error("Falta process.env.API_KEY");
            }
            let api = "";
            let ext = "png";
            if (cmd === "brat") {
                api =
                    `https://api.mitzuki.xyz/maker/brat?text=${encodeURIComponent(text)}` +
                        `&apikey=${encodeURIComponent(apiKey)}`;
                ext = "png";
            }
            else if (cmd === "bratvid") {
                api =
                    `https://api.mitzuki.xyz/maker/bratvid?text=${encodeURIComponent(text)}` +
                        `&apikey=${encodeURIComponent(apiKey)}`;
                ext = "gif";
            }
            else if (cmd === "bratanime") {
                api =
                    `https://api.mitzuki.xyz/maker/brat-variant?text=${encodeURIComponent(text)}` +
                        `&type=bratanime` +
                        `&apikey=${encodeURIComponent(apiKey)}`;
                ext = "png";
            }
            else {
                throw new Error("Comando brat inválido");
            }
            const res = await fetch(api);
            const json = await res.json();
            if (!json?.status || !json?.data?.url) {
                throw new Error(json?.message || json?.error || "La API no devolvió imagen");
            }
            const fileRes = await fetch(json.data.url);
            if (!fileRes.ok) {
                throw new Error("No pude descargar el resultado");
            }
            const buffer = Buffer.from(await fileRes.arrayBuffer());
            const webpBuffer = await toStickerWebp(buffer, ext);
            const finalSticker = await addExif(webpBuffer, packname, author);
            tmpFinal = path.join(tmpdir(), `${Date.now()}_${crypto.randomBytes(4).toString("hex")}_brat.webp`);
            await fs.promises.writeFile(tmpFinal, finalSticker);
            await conn.sendFile(m.chat, tmpFinal, "sticker.webp", "", m, false, {
                asSticker: true,
                isAiSticker: true
            });
            await m.react?.("✅");
        }
        catch (e) {
            console.error("❌ Error en brat:", e);
            await m.react?.("❌");
            await m.reply(`❌ Error creando el sticker brat.\n${e?.message || e}`);
        }
        finally {
            if (tmpFinal) {
                await fs.promises.unlink(tmpFinal).catch(() => null);
            }
        }
    }
};
