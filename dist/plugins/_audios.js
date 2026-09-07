import { db } from '../lib/db.js';
import fs from 'fs';
import path from 'path';
import { isSpam, handleSpamAction } from '../lib/anti-spam.js';
const audiosPath = path.resolve('./src/audios.json');
function getAudios() {
    try {
        return JSON.parse(fs.readFileSync(audiosPath, 'utf8'));
    }
    catch (e) {
        console.error('[❌] Error leyendo audios.json:', e);
        return {};
    }
}
async function getLocalAudios(chatId) {
    const res = await db.query("SELECT audios_data FROM chats WHERE group_id = $1", [chatId]);
    return res.rows[0]?.audios_data || {};
}
// Verificar si el bot es admin
async function isBotAdmin(conn, chatId) {
    try {
        const metadata = await conn.groupMetadata(chatId);
        const botJid = conn.user?.id?.replace(/:\d+/, '');
        return metadata.participants.some((p) => {
            const pId = p.id?.replace(/:\d+/, '') || '';
            return pId === botJid && p.admin === 'admin';
        });
    }
    catch {
        return false;
    }
}
export default {
    name: "audios",
    before: async (m, { conn }) => {
        try {
            if (/^[\/!#.\-]/.test(m.text || ''))
                return;
            if (!m.originalText || m.originalText.length > 500)
                return;
            const res = await db.query('SELECT audios FROM chats WHERE group_id = $1', [m.chat]);
            if (res.rows[0]?.audios === false)
                return;
            const lowerTexto = m.originalText.toLowerCase().trim();
            const chatId = m.chat;
            const audios = getAudios();
            const localAudios = await getLocalAudios(chatId);
            const sources = [localAudios, audios.global].filter(Boolean);
            // ===== ANTI-SPAM =====
            if (isSpam(m.sender, lowerTexto)) {
                const isAdmin = false; // Podrías verificar si es admin
                const handled = await handleSpamAction(conn, m, m.sender, lowerTexto, chatId, isAdmin);
                if (handled)
                    return; // Si se manejó la acción, no procesar el audio
            }
            for (const source of sources) {
                const clave = Object.keys(source).find(k => {
                    try {
                        const regexStr = source[k].regex;
                        let finalRegex = regexStr;
                        if (!regexStr.includes('\\b')) {
                            finalRegex = `\\b${regexStr}\\b`;
                        }
                        const regex = new RegExp(finalRegex, 'i');
                        const test = regex.test(lowerTexto);
                        if (test)
                            console.log('[✅] Match encontrado:', k, 'con regex:', finalRegex);
                        return test;
                    }
                    catch {
                        return false;
                    }
                });
                if (!clave)
                    continue;
                const audio = source[clave];
                try {
                    await conn.sendPresenceUpdate('recording', m.chat);
                    const listaAudios = Array.isArray(audio.audios)
                        ? audio.audios
                        : [audio.audio];
                    const elegido = listaAudios[Math.floor(Math.random() * listaAudios.length)];
                    let audioContent;
                    if (elegido.startsWith('data:audio/')) {
                        audioContent = Buffer.from(elegido.split(',')[1], 'base64');
                    }
                    else if (elegido.startsWith('./') || elegido.startsWith('/')) {
                        const filePath = path.resolve(elegido);
                        if (fs.existsSync(filePath)) {
                            audioContent = fs.readFileSync(filePath);
                        }
                        else {
                            console.error('[❌] Archivo no encontrado:', filePath);
                            continue;
                        }
                    }
                    else {
                        audioContent = { url: elegido };
                    }
                    const sent = await conn.sendMessage(m.chat, {
                        audio: audioContent,
                        mimetype: 'audio/mpeg'
                    }, { quoted: m });
                    if (sent) {
                        return true;
                    }
                    else {
                        console.log('[❌] sendMessage devolvió false/null');
                    }
                }
                catch (err) {
                    console.error('[❌] Error enviando audio:', err.message);
                    continue;
                }
            }
        }
        catch (e) {
            console.error('[❌] Error en before audios:', e);
        }
    }
};
