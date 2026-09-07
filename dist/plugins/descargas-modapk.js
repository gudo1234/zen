import fetch from "node-fetch";
import axios from "axios";
const userMessages = new Map();
const userRequests = {};
export default {
    name: ["apk", "apkmod", "modapk", "aptoide", "aptoidedl"],
    help: ["apk <nombre>"],
    desc: "Descarga APKs de aplicaciones o juegos.",
    tags: ["downloader"],
    register: true,
    limitPrem: true,
    limit: 4,
    run: async ({ conn, m, prefijo, cmd, text }) => {
        if (!text)
            return m.reply(`${m.e.warn} *Ingresa el nombre del APK a buscar.*\n\n📌 Ejemplo:\n${prefijo + cmd} WhatsApp`);
        if (userRequests[m.sender])
            return conn.reply(m.chat, `${m.e.warn} Hey @${m.sender.split("@")[0]}, ya estás descargando un APK 🙄\nEspera a que termine tu solicitud actual.`, userMessages.get(m.sender) || m);
        userRequests[m.sender] = true;
        await m.react("⌛");
        try {
            const downloadAttempts = [
                async () => {
                    const res = await fetch(`https://api.dorratz.com/v2/apk-dl?text=${encodeURIComponent(text)}`);
                    const data = await res.json();
                    if (!data.name)
                        throw new Error("Sin resultados en Dorratz");
                    return {
                        name: data.name,
                        package: data.package,
                        lastUpdate: data.lastUpdate,
                        size: data.size,
                        icon: data.icon,
                        dllink: data.dllink
                    };
                },
                async () => {
                    const res = await fetch(`https://api.delirius.store/download/apk?query=${encodeURIComponent(text)}`);
                    const data = await res.json();
                    const apk = data.data;
                    if (!apk?.download)
                        throw new Error("Sin resultados en Delirius");
                    return {
                        name: apk.name,
                        developer: apk.developer,
                        publish: apk.publish,
                        size: apk.size,
                        icon: apk.image,
                        dllink: apk.download
                    };
                },
                async () => {
                    const res = await axios.get(`https://apkpure.com/api/v2/search?q=${encodeURIComponent(text)}`);
                    if (!res.data.results?.length)
                        throw new Error("Sin resultados en APKPure");
                    const first = res.data.results[0];
                    const download = await axios.get(`https://apkpure.com/api/v2/download?id=${first.id}`);
                    return {
                        name: first.name,
                        package: first.package,
                        lastUpdate: first.updated_at || "Desconocido",
                        size: first.size,
                        icon: first.icon,
                        dllink: download.data?.url
                    };
                }
            ];
            let apkData = null;
            for (const attempt of downloadAttempts) {
                try {
                    apkData = await attempt();
                    if (apkData)
                        break;
                }
                catch (err) {
                    console.error(`⚠️ Fallback error: ${err.message}`);
                    continue;
                }
            }
            if (!apkData)
                throw new Error("❌ No se pudo obtener el APK desde ninguna API.");
            const infoText = `≪ ＤＥＳＣＡＲＧＡ ＤＥ ＡＰＫ 🚀 ≫

💫 *Nombre:* ${apkData.name}
${apkData.developer ? `👤 *Desarrollador:* ${apkData.developer}` : `📦 *Paquete:* ${apkData.package}`}
🕒 *Actualización:* ${apkData.developer ? apkData.publish : apkData.lastUpdate}
💪 *Peso:* ${apkData.size}

> ⏳ *Enviando archivo... espera un momento*`.trim();
            //`
            const previewMsg = await conn.sendFile(m.chat, apkData.icon, "apk.jpg", infoText, m);
            userMessages.set(m.sender, previewMsg);
            const sizeText = apkData.size?.toLowerCase() || "";
            if (sizeText.includes("gb") || (sizeText.includes("mb") && parseFloat(sizeText) > 999)) {
                await m.reply(m.e.warn + " *El archivo es demasiado pesado para enviarlo por WhatsApp.*");
                return;
            }
            await conn.sendMessage(m.chat, { document: { url: apkData.dllink }, mimetype: "application/vnd.android.package-archive", fileName: `${apkData.name}.apk` }, { quoted: m });
            await m.react("✅");
            m.success = true;
        }
        catch (err) {
            console.error("❌ Error en APK Downloader:", err);
            await m.react("❌");
            await m.reply(`${m.e.error + m.msg.error}\n\n >>> ${err} <<<< `);
        }
        finally {
            delete userRequests[m.sender];
        }
    }
};
