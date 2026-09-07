// lib/anti-spam.ts
import { db } from './db.js';
const spamCache = new Map();
const SPAM_WINDOW = 10 * 1000; // 10 segundos
const MAX_REPEATS = 3; // Máximo de veces permitidas en la ventana
// Tiempos de mute/ban
const MUTE_DURATION = 5 * 60 * 1000; // 5 minutos
const BAN_DURATION = 10 * 60 * 1000; // 10 minutos
export function isSpam(sender, text) {
    const key = `${sender}:${text.toLowerCase().trim()}`;
    const now = Date.now();
    const data = spamCache.get(key);
    if (!data) {
        spamCache.set(key, {
            count: 1,
            firstSeen: now,
            lastSeen: now,
            messages: [text],
            warningLevel: 0
        });
        return false;
    }
    // Si pasó la ventana de tiempo, reiniciar
    if (now - data.firstSeen > SPAM_WINDOW) {
        spamCache.set(key, {
            count: 1,
            firstSeen: now,
            lastSeen: now,
            messages: [text],
            warningLevel: data.warningLevel // Mantener nivel de advertencia
        });
        return false;
    }
    // Actualizar contador
    data.count++;
    data.lastSeen = now;
    data.messages.push(text);
    if (data.messages.length > 10) {
        data.messages.shift();
    }
    // Si supera el límite, es spam
    if (data.count > MAX_REPEATS) {
        // Incrementar nivel de advertencia
        data.warningLevel = Math.min(data.warningLevel + 1, 4);
        return true;
    }
    return false;
}
export function getSpamData(sender, text) {
    const key = `${sender}:${text.toLowerCase().trim()}`;
    return spamCache.get(key) || null;
}
export function resetSpam(sender, text) {
    const key = `${sender}:${text.toLowerCase().trim()}`;
    spamCache.delete(key);
}
// Limpiar caché cada 5 minutos
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of spamCache) {
        if (now - data.lastSeen > 60 * 1000) {
            spamCache.delete(key);
        }
    }
}, 5 * 60 * 1000);
export async function handleSpamAction(conn, m, sender, text, chatId, isAdmin) {
    const data = getSpamData(sender, text);
    if (!data)
        return false;
    const warningLevel = data.warningLevel;
    const userName = m.pushName || sender.split('@')[0] || 'Usuario';
    // ===== NIVEL 1: ADVERTENCIA =====
    if (warningLevel === 1) {
        await conn.sendMessage(chatId, {
            text: `⚠️ *${userName}*, dejá de spamear con "${text}" 🤡\n\n📌 Es tu *1era advertencia*`
        }, { quoted: m });
        return true;
    }
    // ===== NIVEL 2: MUTE TEMPORAL (5 min) =====
    if (warningLevel === 2) {
        // Guardar en DB el mute
        const muteUntil = Date.now() + MUTE_DURATION;
        await db.query(`UPDATE chats SET muted_users = 
        jsonb_set(
          COALESCE(muted_users, '[]'::jsonb),
          array[$1],
          $2::jsonb
        )
       WHERE group_id = $3`, [sender, JSON.stringify({ until: muteUntil, reason: 'Spam' }), chatId]);
        await conn.sendMessage(chatId, {
            text: `🔇 *${userName}* ha sido *MUTEADO* por 5 minutos por spam\n\n📌 Escribiste "${text}" muchas veces seguidas`
        }, { quoted: m });
        // Auto-desmute después de 5 min
        setTimeout(async () => {
            await db.query(`UPDATE chats SET muted_users = 
          (SELECT jsonb_agg(elem) FROM jsonb_array_elements(muted_users) elem WHERE elem->>'id' != $1)
         WHERE group_id = $2`, [sender, chatId]);
        }, MUTE_DURATION);
        return true;
    }
    // ===== NIVEL 3: EXPULSIÓN DEL GRUPO =====
    if (warningLevel === 3) {
        if (!isAdmin) {
            await conn.sendMessage(chatId, {
                text: `👋 *${userName}* ha sido *EXPULSADO* del grupo por spam\n\n📌 Ignoró las advertencias anteriores`
            }, { quoted: m });
            await conn.groupParticipantsUpdate(chatId, [sender], "remove");
            resetSpam(sender, text);
        }
        else {
            // Si es admin, solo advertencia
            await conn.sendMessage(chatId, {
                text: `⚠️ *${userName}* (admin) dejá de spamear o te voy a tener que reportar 🤡`
            }, { quoted: m });
        }
        return true;
    }
    // ===== NIVEL 4: BANEO TEMPORAL DEL BOT (10 min) =====
    if (warningLevel === 4) {
        await db.query(`UPDATE usuarios SET banned = true, banned_reason = $1, ban_warnings = 0 WHERE id = $2 OR lid = $2`, [`Spam excesivo (baneado 10 min)`, sender]);
        await conn.sendMessage(chatId, {
            text: `🔨 *${userName}* ha sido *BANEADO* del bot por 10 minutos\n\n📌 Spam excesivo después de múltiples advertencias`
        }, { quoted: m });
        // Auto-desban después de 10 min
        setTimeout(async () => {
            await db.query(`UPDATE usuarios SET banned = false, banned_reason = NULL WHERE id = $1 OR lid = $1`, [sender]);
            resetSpam(sender, text);
        }, BAN_DURATION);
        return true;
    }
    return false;
}
