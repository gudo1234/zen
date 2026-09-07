import { createRequire } from "module";
const require = createRequire(import.meta.url);
// cola global (1 upload a la vez)
let q = Promise.resolve();
const serial = (fn) => {
    const run = q.then(fn, fn);
    q = run.catch(() => { });
    return run;
};
export function patchBaileysSerialUpload() {
    // importantísimo: resolvemos el MISMO módulo que usa Baileys
    const modPath = require.resolve("@whiskeysockets/baileys/lib/Utils/messages-media.js");
    const media = require(modPath);
    if (!media?.getWAUploadToServer) {
        console.log("❌ Patch: no encontré getWAUploadToServer en", modPath);
        return;
    }
    const original = media.getWAUploadToServer;
    media.getWAUploadToServer = function (...args) {
        const uploader = original.apply(this, args);
        // este uploader es el que se llama muchas veces en paralelo
        return async (filePath, meta) => {
            return serial(() => uploader(filePath, meta));
        };
    };
    console.log("✅ Patch activo: uploads SERIAL via getWAUploadToServer()");
}
