import { db } from "../lib/db.js";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import crypto from "crypto";
import webp from "node-webpmux";

const packnameDefault =
    `${m.pushName}\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n`;

const authorDefault =
    "xd";

const shapeFlags = {
    "-c": "circle",
    "-t": "triangle",
    "-d": "diamond",
    "-g": "hexagon",
    "-p": "pentagon",
    "-a": "heart",
    "-b": "blob",
    "-l": "leaf",
    "-n": "moon",
    "-s": "star",
    "-z": "zap",
    "-r": "curve",
    "-e": "edges",
    "-m": "mirror",
    "-f": "arrow",
    "-x": "attach",
    "-i": "expand",
    "-h": "flip-horizontal",
    "-v": "flip-vertical"
};

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
        0x49, 0x49, 0x2A, 0x00,
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
    name: ["s", "sticker", "stiker"],
    help: ["s", "sticker"],
    tags: ["sticker"],
    desc: "Convierte imágenes, videos, GIF y stickers en stickers con formas personalizadas",

    run: async ({ conn, m, prefijo, cmd, args }) => {
        let tmpIn = null;
        let tmpOut = null;
        let tmpMask = null;
        let tmpFinal = null;

        try {

            const userResult = await db.query(
                "SELECT sticker_packname, sticker_author FROM usuarios WHERE id = $1",
                [m.sender]
            );

            const user = userResult.rows[0] || {};

            let packname;
            let author;

            if (user.sticker_packname && user.sticker_author) {
                packname = user.sticker_packname;
                author = user.sticker_author;
            } else if (user.sticker_packname && !user.sticker_author) {
                packname = user.sticker_packname;
                author = authorDefault;
            } else {
                packname = packnameDefault;
                author = authorDefault;
            }

            const selectedFlag = args?.find(arg =>
                Object.keys(shapeFlags).includes(arg)
            );

            const selectedShape = selectedFlag
                ? shapeFlags[selectedFlag]
                : null;

            const q = m.quoted ? m.quoted : m;

            let mime = (q.msg || q).mimetype || q.mediaType || "";

            let img;
            const possibleUrl = args?.find(arg => isUrl(arg));

            if (possibleUrl) {
                try {
                    const response = await fetch(possibleUrl);

                    if (!response.ok) {
                        throw new Error("No se pudo descargar la URL.");
                    }

                    img = Buffer.from(await response.arrayBuffer());

                    mime = getMimeFromUrl(possibleUrl);
                } catch (err) {
                    console.error("Error descargando URL:", err);

                    return m.reply(
                        (m.e?.error || "❌") +
                        " No pude descargar el archivo desde esa URL."
                    );
                }
            }
            else if (/webp|image|video|gif/i.test(mime)) {

                if (
                    /video|gif/i.test(mime) &&
                    Number((q.msg || q).seconds || 0) > 8
                ) {
                    return m.reply(
                        (m.e?.warn || "⚠️") +
                        " ¡El video no puede durar más de 8 segundos!"
                    );
                }

                img = await q.download?.();
            }
            else {
                return m.reply(
                    (m.e?.warn || "⚠️") +
                    ` Responde a una imagen, video o GIF para crear un sticker.

┌🎨 *Formas disponibles:*
│
│ ● *Básicas*
│ ├─ -c → Circular
│ ├─ -t → Triangular
│ ├─ -d → Diamante
│ ├─ -g → Hexágono
│ └─ -p → Pentágono
│
│ ● *Decorativas*
│ ├─ -a → Corazón
│ ├─ -b → Burbuja
│ ├─ -l → Hoja
│ ├─ -n → Luna
│ ├─ -s → Estrella
│ └─ -z → Rayo
│
│ ● *Especiales*
│ ├─ -r → Curvado
│ ├─ -e → Esquinas redondeadas
│ ├─ -m → Espejo
│ ├─ -f → Flecha
│ ├─ -x → Acoplado
│ ├─ -i → Ampliado
│ ├─ -h → Horizontal
│ └─ -v → Vertical
└──────────────

◈ *Ejemplo:*
Responde a una imagen con:
${prefijo || "."}${cmd} -a`
                );
            }

            if (!img) {
                return m.reply(
                    (m.e?.warn || "⚠️") +
                    " No pude obtener la imagen o video."
                );
            }

            if (m.react) {
                await m.react("🧩").catch(() => {});
            }
            if (/webp/i.test(mime) && !selectedShape) {

                const finalSticker = await addExif(
                    img,
                    packname,
                    author
                );

                tmpFinal = tempFile("final", "webp");

                await fs.promises.writeFile(
                    tmpFinal,
                    finalSticker
                );

                await conn.sendFile(
                    m.chat,
                    tmpFinal,
                    "sticker.webp",
                    "",
                    m,
                    false,
                    {
                        asSticker: true,
                        isAiSticker: true
                    }
                );

                return;
            }

            if (
                /video|mp4|gif/i.test(mime) &&
                !selectedShape
            ) {
                tmpIn = tempFile("input", "mp4");
                tmpOut = tempFile("animated", "webp");

                await fs.promises.writeFile(
                    tmpIn,
                    img
                );

                await runFfmpeg(
                    tmpIn,
                    tmpOut,
                    [
                        "-vcodec libwebp",
                        "-vf",
                        "scale='min(512,iw)':min'(512,ih)':force_original_aspect_ratio=decrease,fps=15,pad=512:512:-1:-1:color=0x00000000,split[a][b];[a]palettegen=reserve_transparent=on:transparency_color=ffffff[p];[b][p]paletteuse",
                        "-loop 0",
                        "-t 8",
                        "-an",
                        "-vsync 0"
                    ]
                );

                const animated = await fs.promises.readFile(
                    tmpOut
                );

                const finalSticker = await addExif(
                    animated,
                    packname,
                    author
                );

                tmpFinal = tempFile("final", "webp");

                await fs.promises.writeFile(
                    tmpFinal,
                    finalSticker
                );

                await conn.sendFile(
                    m.chat,
                    tmpFinal,
                    "sticker.webp",
                    "",
                    m,
                    false,
                    {
                        asSticker: true,
                        isAiSticker: true
                    }
                );

                return;
            }

            let frameInput = img;

            if (/video|mp4|gif/i.test(mime)) {

                tmpIn = tempFile("input", "mp4");
                tmpOut = tempFile("frame", "png");

                await fs.promises.writeFile(
                    tmpIn,
                    img
                );

                await runFfmpeg(
                    tmpIn,
                    tmpOut,
                    [
                        "-frames:v 1",
                        "-vf scale=500:-1"
                    ]
                );

                frameInput = await fs.promises.readFile(
                    tmpOut
                );
            }

            let processed;
            if (selectedShape === "flip-horizontal") {

                processed = await processImage(
                    frameInput,
                    [
                        "hflip",
                        "scale=512:512:force_original_aspect_ratio=decrease",
                        "pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black@0"
                    ]
                );
            }
            else if (selectedShape === "flip-vertical") {

                processed = await processImage(
                    frameInput,
                    [
                        "vflip",
                        "scale=512:512:force_original_aspect_ratio=decrease",
                        "pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black@0"
                    ]
                );
            }
            else if (selectedShape) {

                tmpIn = tempFile("shape-input", "png");
                tmpMask = tempFile("shape-mask", "png");
                tmpOut = tempFile("shape-output", "png");

                await fs.promises.writeFile(
                    tmpIn,
                    frameInput
                );

                const svg = getSVGMask(
                    selectedShape,
                    500
                );

                await fs.promises.writeFile(
                    tmpMask,
                    svg
                );

                await applyShape(
                    tmpIn,
                    tmpMask,
                    tmpOut,
                    selectedShape
                );

                processed = await processImage(
                    await fs.promises.readFile(tmpOut),
                    [
                        "scale=512:512:force_original_aspect_ratio=decrease",
                        "pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black@0"
                    ]
                );
            }
            else {

                processed = await processImage(
                    frameInput,
                    [
                        "scale=512:512:force_original_aspect_ratio=decrease",
                        "pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black@0"
                    ]
                );
            }
            const finalSticker = await addExif(
                processed,
                packname,
                author
            );

            tmpFinal = tempFile(
                "final",
                "webp"
            );

            await fs.promises.writeFile(
                tmpFinal,
                finalSticker
            );
            await conn.sendFile(
                m.chat,
                tmpFinal,
                "sticker.webp",
                "",
                m,
                false,
                {
                    asSticker: true,
                    isAiSticker: true
                }
            );

        } catch (err) {

            console.error(
                "❌ Error en /s:",
                err
            );

            return m.reply(
                (m.e?.error || "❌") +
                " Error creando el sticker."
            );

        } finally {
            for (const file of [
                tmpIn,
                tmpOut,
                tmpMask,
                tmpFinal
            ]) {
                if (
                    file &&
                    fs.existsSync(file)
                ) {
                    try {
                        fs.unlinkSync(file);
                    } catch {}
                }
            }
        }
    }
};

function tempFile(prefix, ext) {
    return path.join(
        tmpdir(),
        `${Date.now()}_${crypto.randomBytes(6).toString("hex")}_${prefix}.${ext}`
    );
}

function runFfmpeg(input, output, options = []) {
    return new Promise((resolve, reject) => {

        const command = ffmpeg(input)
            .inputOptions(["-y"])
            .outputOptions(options)
            .toFormat(path.extname(output).replace(".", ""))
            .save(output);

        command
            .on("end", resolve)
            .on("error", reject);
    });
}

function processImage(buffer, filters = []) {

    return new Promise(async (resolve, reject) => {

        const input = tempFile(
            "process-input",
            "png"
        );

        const output = tempFile(
            "process-output",
            "webp"
        );

        try {

            await fs.promises.writeFile(
                input,
                buffer
            );

            await new Promise((res, rej) => {

                ffmpeg(input)
                    .inputOptions(["-y"])
                    .outputOptions([
                        "-vcodec libwebp",
                        "-lossless 0",
                        "-compression_level 6",
                        "-q:v 80",
                        "-pix_fmt yuva420p",
                        "-vf",
                        filters.join(",")
                    ])
                    .toFormat("webp")
                    .save(output)
                    .on("end", res)
                    .on("error", rej);

            });

            const result =
                await fs.promises.readFile(output);

            resolve(result);

        } catch (err) {

            reject(err);

        } finally {

            try {
                if (fs.existsSync(input))
                    fs.unlinkSync(input);
            } catch {}

            try {
                if (fs.existsSync(output))
                    fs.unlinkSync(output);
            } catch {}
        }
    });
}

function applyShape(
    input,
    mask,
    output,
    shape
) {

    return new Promise((resolve, reject) => {

        let filter;

        if (
            shape === "attach" ||
            shape === "expand"
        ) {

            filter =
                "[0:v]format=rgba[base];" +
                "[1:v]format=gray[mask];" +
                "[base][mask]alphamerge";

        } else {

            filter =
                "[0:v]format=rgba[base];" +
                "[1:v]format=gray[mask];" +
                "[base][mask]alphamerge";
        }

        ffmpeg()
            .input(input)
            .input(mask)
            .inputOptions([
                "-loop 1"
            ])
            .complexFilter([
                filter
            ])
            .outputOptions([
                "-frames:v 1",
                "-pix_fmt rgba"
            ])
            .toFormat("png")
            .save(output)
            .on("end", resolve)
            .on("error", reject);
    });
}

function getSVGMask(shape, size) {

    const half = size / 2;
    const quarter = size / 4;
    const threeQuarter = 3 * quarter;
    const radius = size * 0.15;

    switch (shape) {

        case "circle":
            return `
<svg width="${size}" height="${size}">
    <circle
        cx="${half}"
        cy="${half}"
        r="${half}"
        fill="white"/>
</svg>`;

        case "triangle":
            return `
<svg width="${size}" height="${size}">
    <polygon
        points="${half},0 ${size},${size} 0,${size}"
        fill="white"/>
</svg>`;

        case "diamond":
            return `
<svg width="${size}" height="${size}">
    <polygon
        points="${half},0 ${size},${half} ${half},${size} 0,${half}"
        fill="white"/>
</svg>`;

        case "hexagon":
            return `
<svg width="${size}" height="${size}">
    <polygon
        points="
        ${half},0
        ${size},${quarter}
        ${size},${threeQuarter}
        ${half},${size}
        0,${threeQuarter}
        0,${quarter}"
        fill="white"/>
</svg>`;

        case "pentagon":
            return `
<svg width="${size}" height="${size}">
    <polygon
        points="
        ${half},0
        ${size},${quarter}
        ${(3 * quarter)},${size}
        ${quarter},${size}
        0,${quarter}"
        fill="white"/>
</svg>`;

        case "heart":
            return `
<svg
    width="${size}"
    height="${size}"
    viewBox="0 0 32 29.6">

    <path
        d="
        M23.6,0
        c-2.7,0-5.1,1.3-6.6,3.3
        C15.5,1.3,13.1,0,10.4,0
        C4.7,0,0,4.7,0,10.4
        c0,6,6.2,10.9,15.7,18.5
        L16,29.6
        l0.3-0.3
        C25.8,21.3,32,16.4,32,10.4
        C32,4.7,27.3,0,21.6,0
        H23.6z"
        fill="white"/>
</svg>`;

        case "blob":
            return `
<svg width="${size}" height="${size}">
    <path
        d="
        M150 0
        C250 50,250 150,150 200
        C50 250,0 150,50 50
        Z"
        fill="white"
        transform="scale(${size / 300})"/>
</svg>`;

        case "leaf":
            return `
<svg width="${size}" height="${size}">
    <path
        d="
        M${half},0
        C${size},${quarter},${quarter},${size} 0,${size}
        C0,${half} 0,${quarter} ${half},0
        Z"
        fill="white"/>
</svg>`;

        case "moon":
            return `
<svg width="${size}" height="${size}">
    <path
        d="
        M${half},0
        A${half},${half} 0 1,0 ${half},${size}
        A${size * 0.6},${half} 0 1,1 ${half},0
        Z"
        fill="white"/>
</svg>`;

        case "star":
            return `
<svg width="${size}" height="${size}">
    <polygon
        points="
        ${half},0
        ${half + 15},${half - 10}
        ${size},${half}
        ${half + 15},${half + 10}
        ${half},${size}
        ${half - 15},${half + 10}
        0,${half}
        ${half - 15},${half - 10}"
        fill="white"/>
</svg>`;

        case "zap":
            return `
<svg width="${size}" height="${size}">
    <polygon
        points="
        ${half - 20},${half}
        ${half + 10},${half}
        ${half - 10},${size}
        ${half + 30},${half}
        ${half},${half}
        ${half + 10},0"
        fill="white"/>
</svg>`;

        case "curve":
            return `
<svg width="${size}" height="${size}">
    <path
        d="
        M0,${size}
        Q${half},0 ${size},${size}
        Z"
        fill="white"/>
</svg>`;

        case "edges":
            return `
<svg width="${size}" height="${size}">
    <rect
        width="${size}"
        height="${size}"
        rx="${radius}"
        ry="${radius}"
        fill="white"/>
</svg>`;

        case "mirror":
            return `
<svg width="${size}" height="${size}">
    <rect
        width="${half}"
        height="${size}"
        x="0"
        fill="white"/>
</svg>`;

        case "arrow":
            return `
<svg width="${size}" height="${size}">
    <polygon
        points="
        0,${half - 50}
        ${half},${half - 50}
        ${half},0
        ${size},${half}
        ${half},${size}
        ${half},${half + 50}
        0,${half + 50}"
        fill="white"/>
</svg>`;

        case "attach":
        case "expand":
            return `
<svg width="${size}" height="${size}">
    <rect
        width="${size}"
        height="${size}"
        fill="white"/>
</svg>`;

        default:
            throw new Error(
                `Forma no soportada: ${shape}`
            );
    }
}

function isUrl(text) {

    return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|mp4)(\?.*)?$/i.test(
        text || ""
    );
}


function getMimeFromUrl(url) {

    const cleanUrl =
        url.split("?")[0].toLowerCase();

    if (cleanUrl.endsWith(".mp4"))
        return "video/mp4";

    if (cleanUrl.endsWith(".gif"))
        return "image/gif";

    if (cleanUrl.endsWith(".webp"))
        return "image/webp";

    if (
        cleanUrl.endsWith(".jpg") ||
        cleanUrl.endsWith(".jpeg")
    )
        return "image/jpeg";

    return "image/png";
}
