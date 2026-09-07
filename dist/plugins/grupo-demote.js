import { db } from "../lib/db.js";
const cleanJid = (jid = '') => String(jid || '').replace(/:\d+/, '');
const onlyNum = (v = '') => String(v || '').replace(/[^0-9]/g, '');
const getTargetData = async (m, conn) => {
    let who = m.mentionedJid?.[0] ||
        m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
        m.quoted?.sender ||
        m.quoted?.participant;
    if (!who)
        return null;
    who = cleanJid(who);
    const num = onlyNum(who);
    let user = null;
    let realJid = null;
    const resUser = await db.query(`SELECT * FROM usuarios WHERE id = $1 OR lid = $1 OR num = $2`, [who, num]);
    if (resUser.rows.length)
        user = resUser.rows[0];
    if (user?.id && user.id.includes('@s.whatsapp.net')) {
        realJid = user.id;
    }
    else if (user?.num) {
        realJid = `${user.num}@s.whatsapp.net`;
    }
    else if (num) {
        realJid = `${num}@s.whatsapp.net`;
    }
    else if (who.includes('@s.whatsapp.net')) {
        realJid = who;
    }
    else {
        realJid = who;
    }
    const userId = user?.id || who;
    const lid = user?.lid || '';
    const userNum = user?.num || num;
    return { userId, lid, num: userNum, who, realJid };
};
export default {
    name: ["demote", "quitarpoder", "quitaradmin"],
    help: "demote",
    desc: "Quita el admin a un usuario en el grupo.",
    tags: ["group"],
    group: true,
    admin: true,
    botAdmin: true,
    register: true,
    run: async ({ conn, m, text }) => {
        if (!text && !m.quoted)
            return m.reply(m.e.warn + " *¿A quién le quito admin?* Etiqueta, responde o escribe su número 😈");
        try {
            const target = await getTargetData(m, conn);
            if (!target) {
                let number = text?.trim() || "";
                if (number && !isNaN(Number(number)) && !number.includes("@")) {
                    number = number.replace(/[^0-9]/g, "");
                    const userJid = `${number}@s.whatsapp.net`;
                    await conn.groupParticipantsUpdate(m.chat, [userJid], "demote");
                    await m.react("✅");
                    return conn.sendMessage(m.chat, {
                        text: `✅ *Admin removido exitosamente.*`,
                        mentions: [userJid]
                    }, { quoted: m });
                }
                return m.reply(m.e.warn + " No pude detectar a quién quitar admin.");
            }
            const { realJid, num, lid } = target;
            const metadata = await conn.groupMetadata(m.chat);
            const targetClean = realJid?.replace(/:\d+/, '').split('@')[0] || '';
            const targetNum = num || onlyNum(realJid || '');
            const targetLid = lid || '';
            const targetLidClean = targetLid.replace(/:\d+/, '').split('@')[0] || '';
            // 🔥 CORREGIDO: Buscar por LID también
            const isInGroup = metadata.participants.some(p => {
                const pId = p.id?.replace(/:\d+/, '').split('@')[0] || '';
                const pPhone = p.phoneNumber?.replace(/:\d+/, '').split('@')[0] || '';
                const pLid = p.lid?.replace(/:\d+/, '').split('@')[0] || '';
                const pIdFull = p.id || '';
                const match = pId === targetClean ||
                    pPhone === targetClean ||
                    pPhone === targetNum ||
                    p.id === realJid ||
                    p.phoneNumber === realJid ||
                    pLid === targetLidClean ||
                    p.id === targetLid ||
                    pIdFull === targetLid;
                if (match) {
                    console.log('✅ [DEMOTE] Match encontrado:', {
                        pId,
                        pPhone,
                        pLid,
                        pIdFull,
                        targetClean,
                        targetNum,
                        targetLid,
                        targetLidClean
                    });
                }
                return match;
            });
            console.log('🔍 [DEMOTE] isInGroup:', isInGroup);
            if (!isInGroup) {
                return m.reply(`❌ @${realJid.split('@')[0]} no está en el grupo.`, { mentions: [realJid] });
            }
            // Verificar si es admin
            const isAdmin = metadata.participants.some(p => {
                const pPhone = p.phoneNumber?.replace(/:\d+/, '').split('@')[0] || '';
                const pId = p.id?.replace(/:\d+/, '').split('@')[0] || '';
                const pLid = p.lid?.replace(/:\d+/, '').split('@')[0] || '';
                return (pPhone === targetClean ||
                    pId === targetClean ||
                    pLid === targetLidClean ||
                    p.id === targetLid ||
                    p.phoneNumber === realJid ||
                    p.id === realJid) &&
                    (p.admin === "admin" || p.admin === "superadmin");
            });
            console.log('🔍 [DEMOTE] isAdmin:', isAdmin);
            if (!isAdmin) {
                return m.reply(`⚠️ @${realJid.split('@')[0]} no es admin.`, { mentions: [realJid] });
            }
            // No permitir quitar admin al creador del grupo
            const creatorClean = metadata.owner?.replace(/:\d+/, '').split('@')[0] || '';
            const isCreator = creatorClean === targetClean || metadata.owner === realJid || metadata.owner === targetLid;
            if (isCreator) {
                return m.reply(`⚠️ No puedo quitar admin al creador del grupo.`);
            }
            await conn.groupParticipantsUpdate(m.chat, [realJid], "demote");
            await m.react("✅");
        }
        catch (err) {
            console.error("❌ Error al degradar:", err);
            await m.react("❌");
            await m.reply(m.e.error + " Error al intentar quitar admin. Asegúrate de que soy admin y que el usuario está en el grupo.");
        }
    }
};
