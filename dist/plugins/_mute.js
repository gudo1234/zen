// _mute.js
import { db } from "../lib/db.js";
const cleanJid = (jid = '') => String(jid || '').replace(/:\d+/, '');
export async function before(m, { conn }) {
    try {
        if (!m.isGroup)
            return;
        if (m.key?.fromMe)
            return;
        // Obtener usuarios muteados del grupo
        const res = await db.query("SELECT muted_users FROM chats WHERE group_id = $1", [m.chat]);
        if (!res.rows.length)
            return;
        const mutedUsers = res.rows[0].muted_users || [];
        // Verificar si el sender está muteado
        const senderId = m.sender?.replace(/:\d+/, '');
        const isMuted = mutedUsers.some(user => {
            const userId = user.user_id?.replace(/:\d+/, '');
            const lid = user.lid?.replace(/:\d+/, '');
            const num = user.num;
            return userId === senderId || lid === senderId || num === m.sender?.split('@')[0];
        });
        if (!isMuted)
            return;
        // Eliminar mensaje
        await conn.sendMessage(m.chat, {
            delete: {
                remoteJid: m.chat,
                fromMe: false,
                id: m.key.id,
                participant: m.key.participant || m.sender
            }
        });
        return true;
    }
    catch (e) {
        console.error('❌ Error en mute before:', e);
    }
}
