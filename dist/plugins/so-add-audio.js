import fs from 'fs';
import path from 'path';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { db } from '../lib/db.js';
import FormData from 'form-data';
import fetch from 'node-fetch'; // 🔥 IMPORTAR fetch
const audiosPath = path.resolve('./src/audios.json');
function getGlobalAudios() {
    try {
        if (fs.existsSync(audiosPath)) {
            return JSON.parse(fs.readFileSync(audiosPath, 'utf8'));
        }
        return {};
    }
    catch (e) {
        console.error('[❌] Error leyendo audios.json:', e);
        return {};
    }
}
function saveGlobalAudios(audios) {
    try {
        fs.writeFileSync(audiosPath, JSON.stringify(audios, null, 2), 'utf8');
        return true;
    }
    catch (e) {
        console.error('[❌] Error guardando audios.json:', e);
        return false;
    }
}
// ===== SUBIR A EVOGB CDN =====
async function uploadToEvogb(buffer) {
    try {
        const form = new FormData();
        form.append("file", buffer, {
            filename: `Mitzuki_${Date.now()}.mp3`,
            contentType: "audio/mpeg"
        });
        form.append("urlMode", "custom_name");
        form.append("author", "Mitzuki");
        const res = await fetch("https://evogb.win/api/upload", {
            method: "POST",
            body: form,
            headers: form.getHeaders()
        });
        const json = await res.json();
        console.log('[EVOGB RESPONSE]', json);
        if (!json?.success || !json?.url) {
            throw new Error(JSON.stringify(json));
        }
        return json.url;
    }
    catch (e) {
        console.error('[EVOGB ERROR]', e);
        throw e;
    }
}
async function getLocalAudios(chatId) {
    const res = await db.query("SELECT audios_data FROM chats WHERE group_id = $1", [chatId]);
    return res.rows[0]?.audios_data || {};
}
async function saveLocalAudios(chatId, audios) {
    await db.query(`INSERT INTO chats (group_id) VALUES ($1) ON CONFLICT (group_id) DO NOTHING`, [chatId]);
    await db.query(`UPDATE chats SET audios_data = $1 WHERE group_id = $2`, [JSON.stringify(audios), chatId]);
}
export default {
    name: ["addaudios", "delaudios"],
    help: ["addaudios", "delaudios"],
    desc: "Agrega o elimina audios por palabra clave",
    tags: ["group"],
    admin: true,
    group: true,
    register: true,
    run: async ({ conn, m, args, text, prefijo, cmd, isOwner }) => {
        try {
            const chatId = m.chat;
            // ===== DELAUDIOS =====
            if (cmd === 'delaudios') {
                if (!text) {
                    return m.reply(`⚠️ Uso: ${prefijo}delaudios <frase>\n\n📌 Ejemplo: ${prefijo}delaudios hola`);
                }
                const frase = text.trim().toLowerCase();
                if (isOwner) {
                    const globalAudios = getGlobalAudios();
                    if (globalAudios.global && globalAudios.global[frase]) {
                        delete globalAudios.global[frase];
                        saveGlobalAudios(globalAudios);
                        m.react("🗑️");
                        return m.reply(`🗑️ Audio global *${frase}* eliminado correctamente`);
                    }
                    return m.reply(`❌ No existe un audio global con la frase: *${frase}*`);
                }
                const localAudios = await getLocalAudios(chatId);
                if (localAudios[frase]) {
                    delete localAudios[frase];
                    await saveLocalAudios(chatId, localAudios);
                    m.react("🗑️");
                    return m.reply(`🗑️ Audio *${frase}* eliminado correctamente del grupo`);
                }
                return m.reply(`❌ No existe un audio con la frase: *${frase}* en este grupo`);
            }
            // ===== ADDAUDIOS =====
            if (cmd === 'addaudios') {
                if (!text) {
                    return m.reply(`⚠️ Uso: ${prefijo}addaudios <frase> - <audio_url>\n\n📌 Ejemplo: ${prefijo}addaudios hola - https://example.com/audio.mp3\n\nO responde a un audio: ${prefijo}addaudios hola`);
                }
                const [fraseRaw, ...resto] = text.split('-');
                const frases = fraseRaw.split(',').map(f => f.trim().toLowerCase()).filter(Boolean);
                if (!frases.length) {
                    return m.reply(`✳️ Usa: ${prefijo}addaudios hola,hello - audio_url`);
                }
                const url = resto.join('-')?.trim() || null;
                let audioUrl = null;
                // Si es URL directa
                if (url?.startsWith('http')) {
                    audioUrl = url;
                }
                // Si responde a un audio
                else if (m.quoted?.message?.audioMessage) {
                    try {
                        m.react("⏳");
                        const audioMsg = m.quoted.message.audioMessage;
                        const stream = await downloadContentFromMessage(audioMsg, 'audio');
                        let buffer = Buffer.from([]);
                        for await (const chunk of stream) {
                            buffer = Buffer.concat([buffer, chunk]);
                        }
                        if (!buffer || buffer.length === 0) {
                            throw new Error('Buffer vacío');
                        }
                        audioUrl = await uploadToEvogb(buffer);
                    }
                    catch (e) {
                        console.error('[❌] Error:', e);
                        m.react("❌");
                        return m.reply(`❌ Error al subir audio: ${e.message || e}`);
                    }
                }
                else {
                    return m.reply(`❌ Responde a un audio o usa una URL válida.\n\n📌 ${prefijo}addaudios hola - https://example.com/audio.mp3`);
                }
                // ===== GUARDAR =====
                if (isOwner) {
                    const globalAudios = getGlobalAudios();
                    if (!globalAudios.global)
                        globalAudios.global = {};
                    for (const frase of frases) {
                        const regex = `(${frase})`;
                        if (!globalAudios.global[frase]) {
                            globalAudios.global[frase] = { regex, audio: audioUrl };
                        }
                        else {
                            const actual = globalAudios.global[frase];
                            if (actual.audio && actual.audio !== audioUrl) {
                                globalAudios.global[frase] = { regex, audios: [actual.audio, audioUrl] };
                            }
                            else if (actual.audios) {
                                if (!actual.audios.includes(audioUrl)) {
                                    actual.audios.push(audioUrl);
                                }
                            }
                        }
                    }
                    saveGlobalAudios(globalAudios);
                    m.react("✅");
                    return m.reply(`✅ Audio global guardado:\n📌 Frases: ${frases.join(', ')}\n🌐 Enlace: ${audioUrl}`);
                }
                const localAudios = await getLocalAudios(chatId);
                for (const frase of frases) {
                    const regex = `(${frase})`;
                    if (!localAudios[frase]) {
                        localAudios[frase] = { regex, audio: audioUrl };
                    }
                    else {
                        const actual = localAudios[frase];
                        if (actual.audio && actual.audio !== audioUrl) {
                            localAudios[frase] = { regex, audios: [actual.audio, audioUrl] };
                        }
                        else if (actual.audios) {
                            if (!actual.audios.includes(audioUrl)) {
                                actual.audios.push(audioUrl);
                            }
                        }
                    }
                }
                await saveLocalAudios(chatId, localAudios);
                m.react("✅");
                return m.reply(`✅ Audio guardado en el grupo:\n📌 Frases: ${frases.join(', ')}\n🌐 Enlace: ${audioUrl}`);
            }
        }
        catch (error) {
            console.error('[AUDIOS ADMIN ERROR]', error);
            m.react("❌");
            return m.reply(`❌ Error.\n\n${error.message || error}`);
        }
    }
};
