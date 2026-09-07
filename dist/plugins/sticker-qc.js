import { db } from "../lib/db.js";
import axios from "axios";
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
    name: ["qc"],
    help: ["qc <texto>"],
    tags: ["sticker"],
    desc: "Crea sticker quote con texto",
    run: async ({ conn, m, args, body, prefijo, cmd }) => {
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
            let text = "";
            if (args?.length >= 1) {
                text = args.join(" ");
            }
            else if (m.quoted?.text) {
                text = m.quoted.text;
            }
            if (!text) {
                return m.reply(m.e.warn +
                    ` *Uso incorrecto*\n\n` +
                    `Agrega un texto para crear el sticker.\n\n` +
                    `📌 Ejemplo:\n${prefijo + cmd} hola mundo`);
            }
            const who = m.mentionedJid?.[0] ||
                m.quoted?.sender ||
                m.sender;
            const mentionRegex = new RegExp(`@${who.split("@")[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`, "g");
            const cleanText = text.replace(mentionRegex, "").trim();
            if (!cleanText) {
                return m.reply(m.e.warn + " *Agrega un texto válido.*");
            }
            if (cleanText.length > 65) {
                return m.reply("*⚠️ El texto no puede tener más de 65 caracteres*");
            }
            const pp = await conn.profilePictureUrl(who, "image").catch(() => "https://telegra.ph/file/24fa902ead26340f3df2c.png");
            const nombre = await conn.getName(who).catch(() => "Usuario");
            const obj = {
                type: "quote",
                format: "png",
                backgroundColor: "#000000",
                width: 512,
                height: 768,
                scale: 2,
                messages: [
                    {
                        entities: [],
                        avatar: true,
                        from: {
                            id: 1,
                            name: nombre,
                            photo: {
                                url: pp
                            }
                        },
                        text: cleanText,
                        replyMessage: {}
                    }
                ]
            };
            const json = await axios.post("https://bot.lyo.su/quote/generate", obj, {
                headers: {
                    "Content-Type": "application/json"
                }
            });
            const buffer = Buffer.from(json.data.result.image, "base64");
            const finalSticker = await addExif(buffer, f, g);
            await conn.sendFile(m.chat, finalSticker, "sticker.webp", "", m, false, {
                asSticker: true,
                isAiSticker: true
            });
        }
        catch (err) {
            console.error("❌ Error en /qc:", err);
            return m.reply(m.e.error + " *Error creando el quote sticker.*");
        }
    }
};
