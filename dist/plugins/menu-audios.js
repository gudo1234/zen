import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { db, getBotSettings } from '../lib/db.js';
const audiosPath = path.resolve('./src/audios.json');
function getAudios() {
    try {
        if (fs.existsSync(audiosPath)) {
            return JSON.parse(fs.readFileSync(audiosPath, 'utf8'));
        }
        return {};
    }
    catch (e) {
        console.error('[❌] Error cargando audios.json:', e);
        return {};
    }
}
// ===== OBTENER AUDIOS LOCALES DE LA DB =====
async function getLocalAudios(chatId) {
    const res = await db.query("SELECT audios_data FROM chats WHERE group_id = $1", [chatId]);
    return res.rows[0]?.audios_data || {};
}
export default {
    name: ["menu2", "menú2", "memu2", "menuaudio", "menuaudios", "memuaudios", "memuaudio"],
    help: ["menu2"],
    desc: "Muestra la lista de audios",
    tags: ["main"],
    register: true,
    run: async ({ conn, m, prefijo }) => {
        try {
            const audios = getAudios();
            const taguser = '@' + m.sender.split('@')[0];
            const chatId = m.chat?.trim();
            // ===== ESTADO ON/OFF =====
            const res = await db.query("SELECT audios FROM chats WHERE group_id = $1", [chatId]);
            const audiosActivos = res.rows[0]?.audios !== false;
            // ===== AUDIOS GLOBALES (desde JSON) =====
            const globalAudios = Object.keys(audios.global || {}).sort();
            // ===== AUDIOS LOCALES (desde DB) =====
            const localAudiosData = await getLocalAudios(chatId);
            const localAudios = Object.keys(localAudiosData).sort();
            const listaGlobal = globalAudios.map(v => `🔊 _${v}_`).join('\n');
            const listaLocal = localAudios.map(v => `🔊 _${v}_`).join('\n');
            let str = `Hola ${taguser} 💖彡

\`<MENU DE AUDIOS/>\`
> Escribe las palabras/frases tal como estan, no hace falta poner ningun prefijo (#, ., *, etc) 

📌 *ESTADO:* ${audiosActivos ? '✅' : `❌ (Activarlo con: ${prefijo}on audios)`}

━━━━━━━━━━━━━━━━━━━

${listaGlobal || '   No hay audios globales'}

${listaLocal.length > 0 ? `━━━━━━━━━━━━━━━━━━━
📍 *AUDIOS DEL GRUPO*
━━━━━━━━━━━━━━━━━━━

${listaLocal}

━━━━━━━━━━━━━━━━━━━` : ''}

> By: Mitzuki 💜
`.trim(); //`
            // Obtener imagen personalizada
            const botId = conn.user?.id?.split(":")[0] || "mainbot";
            const settings = await getBotSettings(botId);
            let imageUrl = settings?.logo_url || "https://telegra.ph/file/39fb047cdf23c790e0146.jpg";
            let imageBuffer;
            try {
                if (fs.existsSync('./media/Menu2.jpg')) {
                    imageBuffer = fs.readFileSync('./media/Menu2.jpg');
                }
                else {
                    const res = await fetch(imageUrl);
                    imageBuffer = Buffer.from(await res.arrayBuffer());
                }
            }
            catch (e) {
                const res = await fetch("https://telegra.ph/file/39fb047cdf23c790e0146.jpg");
                imageBuffer = Buffer.from(await res.arrayBuffer());
            }
            // Contexto newsletter
            const jid = settings?.newsletter_jid || "120363321650707484@newsletter";
            const name = settings?.newsletter_name || "Mitzuki official ✨️";
            const isActive = jid && jid !== "" && jid !== "off";
            const contextInfo = {
                mentionedJid: [m.sender],
                forwardingScore: 999,
                isForwarded: true
            };
            if (isActive) {
                contextInfo.forwardedNewsletterMessageInfo = {
                    newsletterJid: jid,
                    newsletterName: name
                };
            }
            await conn.sendMessage(m.chat, {
                image: imageBuffer,
                caption: str,
                contextInfo: contextInfo
            }, { quoted: m });
            m.react("🔊");
        }
        catch (error) {
            console.error('[MENU AUDIOS ERROR]', error);
            m.react("❌");
            return m.reply(`❌ Error al mostrar menú de audios.\n\n${error.message || error}`);
        }
    }
};
