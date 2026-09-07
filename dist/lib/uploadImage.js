import fetch, { FormData, Blob } from "node-fetch";
import { fileTypeFromBuffer } from "file-type";
// ✅ Conversión segura Buffer → ArrayBuffer
function toArrayBuffer(buffer) {
    if (buffer instanceof ArrayBuffer)
        return buffer;
    if (buffer instanceof SharedArrayBuffer)
        return buffer;
    if (buffer.buffer)
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    return Uint8Array.from(buffer).buffer;
}
// ✅ JSON seguro
const safeJson = async (res) => {
    try {
        return await res.json();
    }
    catch {
        return {};
    }
};
/**
 * 🌐 Sube archivos a qu.ax
 * Soporta:
 * - image/jpeg
 * - image/png
 * - video/mp4
 * - video/webm
 * - audio/mpeg
 * - audio/wav
 */
export default async function uploadImage(buffer) {
    const { ext, mime } = (await fileTypeFromBuffer(buffer)) || { ext: "bin", mime: "application/octet-stream" };
    const form = new FormData();
    form.append("files[]", new Blob([toArrayBuffer(buffer)], { type: mime }), `file.${ext}`);
    const res = await fetch("https://qu.ax/upload.php", { method: "POST", body: form });
    const result = await safeJson(res);
    if (result?.success && result?.files?.[0]?.url) {
        return result.files[0].url;
    }
    throw new Error("❌ Error al subir la imagen a qu.ax");
}
