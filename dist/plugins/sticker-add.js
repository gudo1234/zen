import { getPack, addStickerToPack, countStickers } from "../lib/stickerPack.js";
import fs from "fs";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
const execFileAsync = promisify(execFile);
function isAnimatedWebp(buf) {
    const s = buf.toString("ascii");
    return s.includes("ANIM") || s.includes("ANMF");
}
async function compressWebpToWa(buf) {
    const MAX_BYTES = 450 * 1024;
    if (buf.length <= MAX_BYTES)
        return buf;
    const tmp = os.tmpdir();
    const inFile = path.join(tmp, `st_in_${Date.now()}_${Math.random().toString(16).slice(2)}.webp`);
    const outFile = path.join(tmp, `st_out_${Date.now()}_${Math.random().toString(16).slice(2)}.webp`);
    await fs.promises.writeFile(inFile, buf);
    const animated = isAnimatedWebp(buf);
    const tries = animated
        ? [
            { fps: 15, q: 55, t: 3.0 },
            { fps: 12, q: 50, t: 3.0 },
            { fps: 10, q: 45, t: 3.0 },
            { fps: 8, q: 40, t: 2.8 },
            { fps: 6, q: 35, t: 2.5 },
        ]
        : [
            { fps: 0, q: 70, t: 0 },
            { fps: 0, q: 60, t: 0 },
            { fps: 0, q: 50, t: 0 },
            { fps: 0, q: 40, t: 0 },
        ];
    for (const at of tries) {
        try {
            const args = animated
                ? [
                    "-y",
                    "-i", inFile,
                    "-t", String(at.t),
                    "-vf",
                    `scale=512:512:force_original_aspect_ratio=decrease,fps=${at.fps},pad=512:512:-1:-1:color=0x00000000`,
                    "-an",
                    "-loop", "0",
                    "-lossless", "0",
                    "-q:v", String(at.q),
                    outFile
                ]
                : [
                    "-y",
                    "-i", inFile,
                    "-vf",
                    "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:-1:-1:color=0x00000000",
                    "-frames:v", "1",
                    "-lossless", "0",
                    "-q:v", String(at.q),
                    outFile
                ];
            await execFileAsync("ffmpeg", args);
            const out = await fs.promises.readFile(outFile);
            if (out.length <= MAX_BYTES) {
                await fs.promises.unlink(inFile).catch(() => { });
                await fs.promises.unlink(outFile).catch(() => { });
                return out;
            }
        }
        catch { }
    }
    await fs.promises.unlink(inFile).catch(() => { });
    await fs.promises.unlink(outFile).catch(() => { });
    return null;
}
export default {
    name: ["addsticker"],
    tags: ["sticker"],
    help: ["addsticker <responder a un sticker>"],
    desc: "agregar un sticker al pack (respondiendo al sticker)",
    register: true,
    run: async ({ conn, m, text }) => {
        const quoted = m.quoted;
        if (!quoted?.message?.stickerMessage)
            return m.reply("❌ Responde a un sticker");
        const pack = await getPack(m.sender, text);
        if (!pack)
            return m.reply("❌ Pack no existe");
        const total = await countStickers(pack.id);
        if (total >= pack.max_stickers)
            return m.reply("❌ Este pack ya llegó al límite (50)");
        const buf = await quoted.download();
        if (!buf)
            return m.reply("❌ No se pudo descargar el sticker");
        let finalBuf = buf;
        if (buf.length > 450 * 1024) {
            finalBuf = await compressWebpToWa(buf);
            if (!finalBuf)
                return m.reply("❌ Sticker demasiado pesado (no se pudo comprimir). Usa uno más liviano.");
        }
        await addStickerToPack(pack.id, finalBuf);
        m.reply(`✅ Sticker agregado (${total + 1}/${pack.max_stickers})`);
    }
};
