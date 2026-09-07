import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import crypto from "crypto";
import webp from "node-webpmux";
import fetch from "node-fetch";
async function addExif(webpSticker, packname, author = "", categories = ["💋"]) {
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
    name: ["kiss", "beso", "besar", "besito"],
    tags: ["sticker"],
    help: ["kiss"],
    desc: "Dar un beso",
    register: true,
    run: async ({ conn, m }) => {
        let tmpIn = "";
        let tmpOut = "";
        let tmpFinal = "";
        try {
            let who = m.mentionedJid?.[0] ||
                m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
                m.quoted?.sender ||
                m.sender;
            if (who && who.endsWith("@lid")) {
                const meta = await conn.groupMetadata(m.chat);
                const participant = meta.participants.find(p => p.lid === who || p.id === who);
                if (participant?.id) {
                    who = participant.id;
                }
                else {
                    who = who.replace(/@lid$/, "") + "@s.whatsapp.net";
                }
            }
            const getName = async (jid) => (await conn.getName(jid).catch(() => null)) ||
                `+${jid.split("@")[0]}`;
            const senderName = await getName(m.sender);
            const targetName = await getName(who);
            const texto = `💋 ${senderName} besó a ${targetName}`;
            const waifuRes = await fetch("https://api.waifu.pics/sfw/kiss");
            const waifuJson = await waifuRes.json();
            if (!waifuJson?.url) {
                throw new Error("No se recibió URL del GIF");
            }
            const gifRes = await fetch(waifuJson.url);
            const gif = Buffer.from(await gifRes.arrayBuffer());
            const id = Date.now();
            tmpIn = path.join(tmpdir(), `${id}.gif`);
            tmpOut = path.join(tmpdir(), `${id}.webp`);
            tmpFinal = path.join(tmpdir(), `${id}_final.webp`);
            await fs.promises.writeFile(tmpIn, gif);
            await new Promise((resolve, reject) => {
                ffmpeg(tmpIn)
                    .inputOptions(["-y"])
                    .outputOptions([
                    "-vcodec",
                    "libwebp",
                    "-vf",
                    "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15,pad=320:320:-1:-1:color=white@0.0"
                ])
                    .toFormat("webp")
                    .save(tmpOut)
                    .on("end", () => resolve())
                    .on("error", (err) => reject(err));
            });
            const finalSticker = await addExif(await fs.promises.readFile(tmpOut), texto, "");
            await fs.promises.writeFile(tmpFinal, finalSticker);
            await conn.sendFile(m.chat, tmpFinal, "sticker.webp", "", m, false, {
                asSticker: true,
                isAiSticker: true
            });
        }
        catch (e) {
            console.error(e);
            await m.react?.("❌");
        }
        finally {
            await Promise.allSettled([tmpIn, tmpOut, tmpFinal]
                .filter(Boolean)
                .map(file => fs.promises.unlink(file)));
        }
    }
};
