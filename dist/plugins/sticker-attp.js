import { db } from "../lib/db.js";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import crypto from "crypto";
import webp from "node-webpmux";
const packnameDefault = "𝗦𝗧𝗜𝗖𝗞𝗘𝗥𝗦❤️‍🔥 - Mitzuki\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n";
const authorDefault = "Owner: @elrebelde21\n• Dueña: @itschinita_official";
async function addExif(webpSticker, packname, author, categories = ["✨"]) {
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
export default {
    name: ["attp", "ttp"],
    tags: ["sticker"],
    help: ["attp <texto>", "ttp <texto>"],
    desc: "Generador de sticker attp/ttp",
    register: true,
    run: async ({ conn, m, text, cmd, prefijo }) => {
        let tmpFinal = "";
        if (!text) {
            return m.reply(null, `✨ *ATTP / TTP STICKER*\n\n` +
                `Ejemplos:\n` +
                `➜ *${prefijo}attp api mitzuki*\n` +
                `➜ *${prefijo}ttp api mitzuki*`);
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
            const api = `https://api.mitzuki.xyz/maker/attp?text=${encodeURIComponent(text)}` +
                `&type=${encodeURIComponent(cmd)}` +
                `&apikey=${encodeURIComponent(apiKey)}`;
            const res = await fetch(api);
            const json = await res.json();
            if (!json?.status || !json?.data?.url) {
                throw new Error(json?.message || json?.error || "La API no devolvió sticker");
            }
            const fileRes = await fetch(json.data.url);
            if (!fileRes.ok) {
                throw new Error("No pude descargar el sticker");
            }
            const webpBuffer = Buffer.from(await fileRes.arrayBuffer());
            const finalSticker = await addExif(webpBuffer, packname, author);
            tmpFinal = path.join(tmpdir(), `${Date.now()}_${crypto.randomBytes(4).toString("hex")}_${cmd}.webp`);
            await fs.promises.writeFile(tmpFinal, finalSticker);
            await conn.sendFile(m.chat, tmpFinal, "sticker.webp", "", m, false, {
                asSticker: true,
                isAiSticker: true
            });
            await m.react?.("✅");
        }
        catch (e) {
            console.error(`❌ Error en ${cmd}:`, e);
            await m.react?.("❌");
            await m.reply(`❌ Error creando el sticker ${cmd}.\n${e?.message || e}`);
        }
        finally {
            if (tmpFinal) {
                await fs.promises.unlink(tmpFinal).catch(() => null);
            }
        }
    }
};
