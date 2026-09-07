import { db } from '../lib/db.js';
import fetch from 'node-fetch';
const presets = {
    1: () => fetch('https://raw.githubusercontent.com/Skidy89/chat-gpt-jailbreak/main/Text.txt').then(r => r.text()),
    2: () => fetch('https://raw.githubusercontent.com/elrebelde21/ChinaMitzuki/master/src/text-chatgpt.txt').then(r => r.text()),
    3: () => 'Actuás como un nene millonario cheto llamado NeneFlok. Hablá con tono cheto, re sobrado, con faltas de ortografía, sin importarte nada. Sos anti pobres, hacés bromas y tirás indirectas.',
    4: () => fetch('https://raw.githubusercontent.com/elrebelde21/LoliBot-MD/main/src/text-chatgpt.txt').then(r => r.text())
};
const prompt_name = {
    1: '💣 exploit mode',
    2: '🇨🇳 china',
    3: '💸 NeneFlok',
    4: '🧠 IA multipersonalidad'
};
export default {
    name: ['setprompt', 'autorespond', 'clearmemory', 'clearai', 'resetai', 'memttl', 'timeIA'],
    help: ['setprompt', 'resetai', 'timeIA'],
    tags: ['group'],
    group: true,
    admin: true,
    register: true,
    run: async ({ m, text, prefijo, cmd, isOwner }) => {
        const input = text?.trim().toLowerCase();
        // 🧠 Borrar memoria del chat
        if (['clearmemory', 'clearai', 'resetai'].includes(cmd)) {
            await db.query('DELETE FROM chat_memory WHERE chat_id = $1', [m.chat]);
            return m.reply('🧠 Memoria del chat borrada correctamente. El bot empezará desde cero.');
        }
        // ⏱️ Cambiar TTL de memoria
        if (['timeIA', 'memttl'].includes(cmd)) {
            if (!isOwner)
                return m.reply('⛔ Solo el *OWNER* puede poner más de 24 horas.');
            if (!text) {
                return m.reply(`⏱️ *Uso:* ${prefijo + cmd} 10m | 2h | 1d | 0
Unidades válidas: s (seg), m (min), h (horas), d (días)
Ejemplos:
${prefijo + cmd} 30m → memoria se borra tras 30 minutos
${prefijo + cmd} 2h → 2 horas
${prefijo + cmd} 0 → se borra en cada mensaje`);
            }
            if (text === '0') {
                await db.query('UPDATE chats SET srestrict = 0 WHERE group_id = $1', [m.chat]);
                return m.reply('🧠 Memoria desactivada. El bot responderá sin historial.');
            }
            const match = text.match(/^(\d+)([smhd])$/i);
            if (!match)
                return m.reply('❌ Formato inválido. Usa: 10m, 2h, 1d');
            const num = parseInt(match[1]);
            const unit = match[2].toLowerCase();
            const unitToSeconds = { s: 1, m: 60, h: 3600, d: 86400 };
            const seconds = num * unitToSeconds[unit];
            await db.query('UPDATE chats SET srestrict = $1 WHERE group_id = $2', [seconds, m.chat]);
            return m.reply(`✅ Tiempo de memoria actualizado a *${num}${unit}* (${seconds} segundos).`);
        }
        // 💬 Establecer prompt
        if (!text)
            return m.reply(`📌 *Uso del comando ${cmd}:*
${prefijo + cmd} 1  - ${prompt_name[1]}
${prefijo + cmd} 2  - ${prompt_name[2]}
${prefijo + cmd} 3  - ${prompt_name[3]}
${prefijo + cmd} 4  - ${prompt_name[4]}
${prefijo + cmd} tu texto - ✍️ prompt personalizado
${prefijo + cmd} delete|borrar - 🧹 borrar prompt y memoria`);
        const isPreset = ['1', '2', '3', '4'].includes(input);
        const isDelete = ['delete', 'borrar'].includes(input);
        let prompt = null;
        if (isDelete) {
            prompt = null;
        }
        else if (isPreset) {
            prompt = await presets[Number(input)]();
        }
        else {
            prompt = text;
        }
        await db.query(`INSERT INTO chats (group_id, sautorespond)
       VALUES ($1, $2)
       ON CONFLICT (group_id)
       DO UPDATE SET sautorespond = $2`, [m.chat, prompt]);
        // 🧹 Reiniciar memoria
        await db.query('DELETE FROM chat_memory WHERE chat_id = $1', [m.chat]);
        if (!prompt)
            return m.reply('🗑️ *Prompt borrado con éxito.*');
        return m.reply(`✅ *Configuración exitosa.*\n\n*Has establecido un nuevo prompt para este chat.*\n💬 El bot usará tus indicaciones personalizadas.\n\n` +
            (prompt_name[Number(input)] || prompt));
    }
};
