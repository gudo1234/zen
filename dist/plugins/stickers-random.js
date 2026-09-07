import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import crypto from "crypto";
import webp from "node-webpmux";
import fetch from "node-fetch";
const actions = {
    lick: { e: "👅", v: "lamió a", nsfw: false },
    bite: { e: "🧛‍♂️", v: "mordió a", nsfw: false },
    blush: { e: "😳", v: "se sonrojó junto a", nsfw: false },
    kill: { e: "🔪", v: "asesinó fríamente a", nsfw: false },
    cuddle: { e: "🥰", v: "se acurrucó con", nsfw: false },
    handhold: { e: "🤝", v: "tomó de la mano a", nsfw: false },
    highfive: { e: "✋", v: "chocó los cinco con", nsfw: false },
    poke: { e: "👉", v: "hizo poke a", nsfw: false },
    smile: { e: "😊", v: "sonrió a", nsfw: false },
    wave: { e: "👋", v: "saludó a", nsfw: false },
    nom: { e: "🍪", v: "le dio un nom a", nsfw: false },
    dance: { e: "💃", v: "bailó con", nsfw: false },
    wink: { e: "😉", v: "guiñó a", nsfw: false },
    happy: { e: "😁", v: "está feliz con", nsfw: false },
    smug: { e: "😏", v: "miró con soberbia a", nsfw: false },
    blowjob: { e: "😳", v: "le hizo oral a", nsfw: true }
};
async function addExif(webpSticker, packname, author = "", categories = ["✨"]) {
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
    const jsonBuffer = Buffer.from(JSON.stringify(json));
    const exif = Buffer.concat([exifAttr, jsonBuffer]);
    exif.writeUIntLE(jsonBuffer.length, 14, 4);
    await img.load(webpSticker);
    img.exif = exif;
    return img.save(null);
}
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
export default {
    name: Object.keys(actions),
    tags: ["sticker"],
    help: Object.keys(actions),
    desc: "Acciones animadas con stickers",
    register: true,
    run: async ({ conn, m, cmd }) => {
        try {
            const act = actions[cmd.toLowerCase()];
            if (!act)
                return;
            let who = m.mentionedJid?.[0] ||
                m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
                m.quoted?.sender ||
                m.sender;
            if (who.endsWith("@lid")) {
                const meta = await conn.groupMetadata(m.chat);
                const p = meta.participants.find(x => x.lid === who || x.id === who);
                who =
                    p?.id ||
                        who.replace(/@lid$/, "") + "@s.whatsapp.net";
            }
            const getName = async (jid) => (await conn.getName(jid).catch(() => null)) ||
                `+${jid.split("@")[0]}`;
            const senderName = await getName(m.sender);
            const targetName = await getName(who);
            const texto = `${act.e} ${senderName} ${act.v} ${targetName}`;
            const tipo = act.nsfw ? "nsfw" : "sfw";
            const waifuRes = await fetch(`https://api.waifu.pics/${tipo}/${cmd}`);
            const waifuJson = await waifuRes.json();
            if (!waifuJson?.url) {
                throw new Error("No se recibió GIF");
            }
            const gifRes = await fetch(waifuJson.url);
            const gif = Buffer.from(await gifRes.arrayBuffer());
            const id = Date.now();
            const tmpIn = path.join(tmpdir(), `${id}.gif`);
            const tmpOut = path.join(tmpdir(), `${id}.webp`);
            const tmpFinal = path.join(tmpdir(), `${id}_final.webp`);
            await fs.promises.writeFile(tmpIn, gif);
            await new Promise((resolve, reject) => {
                ffmpeg(tmpIn)
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
            await delay(100);
            await Promise.allSettled([
                fs.promises.unlink(tmpIn),
                fs.promises.unlink(tmpOut),
                fs.promises.unlink(tmpFinal)
            ]);
        }
        catch (e) {
            console.error(e);
            await m.react?.("❌");
        }
    }
};
