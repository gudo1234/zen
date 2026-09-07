import fetch, { FormData, Blob } from "node-fetch";
import { fileTypeFromBuffer } from "file-type";
// ✅ Buffer → ArrayBuffer seguro y con casting TS correcto
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
// 🌐 file.io
const fileIO = async (buffer) => {
    const { ext, mime } = (await fileTypeFromBuffer(buffer)) || { ext: "bin", mime: "application/octet-stream" };
    const form = new FormData();
    form.append("file", new Blob([toArrayBuffer(buffer)], { type: mime }), `tmp.${ext}`);
    const res = await fetch("https://file.io/?expires=1d", { method: "POST", body: form });
    const json = await safeJson(res);
    if (!json?.success)
        throw "❌ Error al subir a File.io";
    return json.link;
};
// ☁️ storage.restfulapi.my.id
const RESTfulAPI = async (inp) => {
    const form = new FormData();
    const buffers = Array.isArray(inp) ? inp : [inp];
    const mime = (await fileTypeFromBuffer(buffers[0]))?.mime || "application/octet-stream";
    for (const buffer of buffers)
        form.append("file", new Blob([toArrayBuffer(buffer)], { type: mime }));
    const res = await fetch("https://storage.restfulapi.my.id/upload", { method: "POST", body: form });
    const json = await safeJson(res);
    if (!json?.files)
        throw "❌ Error al subir a RESTfulAPI";
    return Array.isArray(inp) ? json.files.map((r) => r.url) : json.files[0].url;
};
// 🦆 qu.ax
const quax = async (buffer) => {
    const { ext, mime } = (await fileTypeFromBuffer(buffer)) || { ext: "bin", mime: "application/octet-stream" };
    const form = new FormData();
    form.append("files[]", new Blob([toArrayBuffer(buffer)], { type: mime }), `file.${ext}`);
    const res = await fetch("https://qu.ax/upload.php", { method: "POST", body: form });
    const json = await safeJson(res);
    if (!json?.success || !json?.files)
        throw "❌ Error al subir a qu.ax";
    return json.files[0].url;
};
// 🐱 catbox
const catbox = async (buffer) => {
    const { ext } = (await fileTypeFromBuffer(buffer)) || { ext: "bin" };
    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("fileToUpload", new Blob([toArrayBuffer(buffer)]), `file.${ext}`);
    const res = await fetch("https://catbox.moe/user/api.php", { method: "POST", body: form });
    const url = await res.text();
    if (!url.startsWith("https://"))
        throw "❌ Error al subir a catbox";
    return url;
};
// 🐸 uguu
const uguu = async (buffer) => {
    const { ext } = (await fileTypeFromBuffer(buffer)) || { ext: "bin" };
    const form = new FormData();
    form.append("file", new Blob([toArrayBuffer(buffer)]), `file.${ext}`);
    const res = await fetch("https://uguu.se/api.php?d=upload-tool", { method: "POST", body: form });
    const url = await res.text();
    if (!url.startsWith("https://"))
        throw "❌ Error al subir a uguu";
    return url;
};
// 💾 filechan
const filechan = async (buffer) => {
    const { ext } = (await fileTypeFromBuffer(buffer)) || { ext: "bin" };
    const form = new FormData();
    form.append("file", new Blob([toArrayBuffer(buffer)]), `file.${ext}`);
    const res = await fetch("https://api.filechan.org/upload", { method: "POST", body: form });
    const json = await safeJson(res);
    if (!json?.success || !json?.files?.length)
        throw "❌ Error al subir a filechan";
    return json.files[0].url;
};
// 📤 pixeldrain
const pixeldrain = async (buffer) => {
    const form = new FormData();
    form.append("file", new Blob([toArrayBuffer(buffer)]));
    const res = await fetch("https://pixeldrain.com/api/file", { method: "POST", body: form });
    const json = await safeJson(res);
    if (!json?.id)
        throw "❌ Error al subir a pixeldrain";
    return `https://pixeldrain.com/u/${json.id}`;
};
// 🚀 gofile
const gofile = async (buffer) => {
    const serverRes = await fetch("https://api.gofile.io/getServer");
    const { data } = await safeJson(serverRes);
    const form = new FormData();
    form.append("file", new Blob([toArrayBuffer(buffer)]));
    const res = await fetch(`https://${data.server}.gofile.io/uploadFile`, { method: "POST", body: form });
    const json = await safeJson(res);
    if (json?.status !== "ok" || !json?.data?.downloadPage)
        throw "❌ Error al subir a Gofile";
    return json.data.downloadPage;
};
// 🐙 krakenfiles
const krakenfiles = async (buffer) => {
    const { ext } = (await fileTypeFromBuffer(buffer)) || { ext: "bin" };
    const form = new FormData();
    form.append("file", new Blob([toArrayBuffer(buffer)]), `file.${ext}`);
    const res = await fetch("https://api.krakenfiles.com/v2/file/upload", { method: "POST", body: form });
    const json = await safeJson(res);
    if (!json?.success || !json?.data?.url)
        throw "❌ Error al subir a KrakenFiles";
    return json.data.url;
};
// 📰 telegraph
const telegraph = async (buffer) => {
    const { ext } = (await fileTypeFromBuffer(buffer)) || { ext: "bin" };
    const form = new FormData();
    form.append("file", new Blob([toArrayBuffer(buffer)]), `file.${ext}`);
    const res = await fetch("https://telegra.ph/upload", { method: "POST", body: form });
    const json = await safeJson(res);
    if (!Array.isArray(json) || !json[0]?.src)
        throw "❌ Error al subir a Telegraph";
    return "https://telegra.ph" + json[0].src;
};
export { quax, RESTfulAPI, catbox, uguu, filechan, pixeldrain, gofile, krakenfiles, telegraph };
// ♻️ Subida automática
export default async function (inp) {
    const servicios = [quax, RESTfulAPI, catbox, uguu, filechan, pixeldrain, gofile, krakenfiles, telegraph];
    for (const upload of servicios) {
        try {
            const result = await upload(inp);
            console.log(`[UPLOAD OK]`, result);
            return result;
        }
        catch (e) {
            console.log(`[UPLOAD FAIL]`, e);
        }
    }
    throw new Error("❌ Todos los servicios fallaron");
}
