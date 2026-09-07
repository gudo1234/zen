import { db, getBotSettings } from "../lib/db.js";
import { OWNERS } from "../handler.js";
const cleanJid = (jid = '') => String(jid || '').replace(/:\d+/, '');
const onlyNum = (v = '') => String(v || '').replace(/[^0-9]/g, '');
function getLid(jid) {
    if (!jid)
        return '';
    if (jid.includes('@lid')) {
        // 🔥 Limpiar :63@lid -> @lid
        return jid.replace(/:\d+@lid/, '@lid');
    }
    return '';
}
const getTargetData = async (m, conn) => {
    let who = m.mentionedJid?.[0] ||
        m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
        m.quoted?.sender ||
        m.quoted?.participant;
    if (!who)
        return null;
    const whoClean = cleanJid(who);
    const whoNum = onlyNum(who);
    const whoLid = getLid(who);
    let user = null;
    let realJid = null;
    let num = whoNum;
    let lid = whoLid;
    let userId = who;
    // 🔥 PRIMERO BUSCAR EN GROUP METADATA
    if (m.isGroup) {
        try {
            const meta = await conn.groupMetadata(m.chat);
            const found = meta.participants.find(p => {
                const pid = p.id?.replace(/:\d+/, '');
                const phone = p.phoneNumber?.replace(/[^0-9]/g, '');
                return pid === whoClean || phone === whoNum || pid === whoLid;
            });
            if (found) {
                if (found.phoneNumber) {
                    const foundNum = onlyNum(found.phoneNumber);
                    if (foundNum)
                        num = foundNum;
                    realJid = found.phoneNumber;
                }
                if (found.id && found.id.includes('@lid')) {
                    lid = getLid(found.id);
                }
                userId = found.id || found.phoneNumber || who;
            }
        }
        catch (e) {
            console.log("❌ Error obteniendo metadata:", e.message);
        }
    }
    // 🔥 BUSCAR EN DB (respaldo)
    try {
        const resUser = await db.query(`SELECT * FROM usuarios WHERE id = $1 OR lid = $1 OR num = $2 OR num = $3`, [who, lid || who, num, whoNum]);
        if (resUser.rows.length) {
            user = resUser.rows[0];
            if (user.id)
                realJid = user.id;
            if (user.num)
                num = user.num;
            if (user.lid)
                lid = user.lid;
        }
    }
    catch (e) { }
    // Si no hay realJid, construir uno
    if (!realJid) {
        if (num) {
            realJid = `${num}@s.whatsapp.net`;
        }
        else if (lid) {
            realJid = `${lid}@lid`;
        }
        else {
            realJid = who;
        }
    }
    return {
        userId: user?.id || userId,
        lid: lid || user?.lid || '',
        num: num || user?.num || '',
        who,
        realJid
    };
};
export default {
    name: ["mute", "unmute"],
    tags: ["grupo"],
    desc: "Silencia o habilita a un usuario en el grupo",
    group: true,
    admin: true,
    botAdmin: true,
    run: async ({ conn, m, cmd }) => {
        const botId = conn.user?.id?.split(":")[0] || "mainbot";
        try {
            if (!m.isGroup)
                return m.reply(m.e.warn + ` ${m.msg.group}`);
            const target = await getTargetData(m, conn);
            if (!target)
                return m.reply('⚠️ Etiqueta o responde a un usuario.\n\nEj: .mute @usuario');
            const { userId, lid, num, realJid } = target;
            const res = await db.query("SELECT muted_users FROM chats WHERE group_id = $1", [m.chat]);
            let mutedUsers = res.rows.length ? res.rows[0].muted_users || [] : [];
            if (cmd === 'mute') {
                const config = await getBotSettings(botId);
                const botOwners = config.owners || [];
                // 🔥 Verificar si es owner GLOBAL (por num o lid)
                const isGlobalOwner = OWNERS.some(o => {
                    const oNum = o.num || '';
                    const oLid = o.lid || '';
                    return oNum === num || oLid === lid;
                });
                // 🔥 Verificar si es owner del BOT (por num o lid)
                const isBotOwner = botOwners.some((o) => {
                    const oNum = o.num || '';
                    const oLid = o.lid || '';
                    return oNum === num || oLid === lid;
                });
                if (isGlobalOwner || isBotOwner)
                    return m.reply("⚠️ Jaja quiere mutear a mi jefe?, pobre inútil");
                // 🔥 Verificar si es el mismo sender
                const senderNum = onlyNum(m.sender);
                const senderLid = getLid(m.lid || '');
                if (num === senderNum || lid === senderLid) {
                    return m.reply("🙄 ¿jaja sos tonto?");
                }
                const botNum = onlyNum(conn.user?.id || '');
                const botLid = getLid(conn.user?.lid || '');
                if (num === botNum || lid === botLid) {
                    return m.reply("😾 No puedo mutearme a mí mismo.");
                }
                const alreadyMuted = mutedUsers.some(u => u.user_id === userId || u.lid === lid || u.num === num);
                if (alreadyMuted)
                    return m.reply('⚠️ Ese usuario ya está muteado.');
                mutedUsers.push({ user_id: userId, lid, num, created_at: Date.now() });
                await db.query(`UPDATE chats SET muted_users = $1 WHERE group_id = $2`, [JSON.stringify(mutedUsers), m.chat]);
                return conn.sendMessage(m.chat, {
                    text: `🔇 *Usuario muteado*\n\n@${realJid.split('@')[0]} ha sido silenciado.`,
                    mentions: [realJid]
                }, { quoted: m });
            }
            if (cmd === 'unmute') {
                const filtered = mutedUsers.filter(u => u.user_id !== userId && u.lid !== lid && u.num !== num);
                if (filtered.length === mutedUsers.length) {
                    return m.reply('⚠️ Ese usuario no estaba muteado.');
                }
                await db.query(`UPDATE chats SET muted_users = $1 WHERE group_id = $2`, [JSON.stringify(filtered), m.chat]);
                return conn.sendMessage(m.chat, {
                    text: `🔊 *Usuario habilitado*\n\n@${realJid.split('@')[0]} puede volver a enviar mensajes.`,
                    mentions: [realJid]
                }, { quoted: m });
            }
        }
        catch (e) {
            console.error('[MUTE] ❌ Error:', e);
            m.reply('❌ Error ejecutando mute/unmute.');
        }
    }
};
