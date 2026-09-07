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
    // Buscar en usuarios
    const resUser = await db.query(`SELECT * FROM usuarios WHERE id = $1 OR lid = $1 OR num = $2`, [who, num]);
    if (resUser.rows.length)
        user = resUser.rows[0];
    // Obtener el JID real (número) para el tag
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
    name: ["promote", "daradmin", "darpoder"],
    help: "promote",
    desc: "Dar admin a un usuario en el grupo.",
    tags: ["group"],
    group: true,
    admin: true,
    botAdmin: true,
    register: true,
    run: async ({ conn, m, text, cmd }) => {
        if (!text && !m.quoted)
            return m.reply(m.e.warn + " *¿A quién le doy admin?* Etiqueta, responde o escribe su número 😜");
        try {
            // 🔥 Usar la misma lógica que mute
            const target = await getTargetData(m, conn);
            if (!target) {
                // Si getTargetData falla, intentar con el texto directamente
                let number = text?.trim() || "";
                if (number && !isNaN(Number(number)) && !number.includes("@")) {
                    // Es un número directo
                    number = number.replace(/[^0-9]/g, "");
                    const userJid = `${number}@s.whatsapp.net`;
                    await conn.groupParticipantsUpdate(m.chat, [userJid], "promote");
                    await m.react("✅");
                    return conn.sendMessage(m.chat, {
                        text: `✅ *Usuario ascendido a admin exitosamente.*`,
                        mentions: [userJid]
                    }, { quoted: m });
                }
                return m.reply(m.e.warn + " No pude detectar a quién dar admin.");
            }
            const { realJid } = target;
            // Verificar si ya es admin
            const metadata = await conn.groupMetadata(m.chat);
            const isAlreadyAdmin = metadata.participants.some(p => {
                const pId = p.id?.replace(/:\d+/, "");
                const targetId = realJid?.replace(/:\d+/, "");
                return pId === targetId && (p.admin === "admin" || p.admin === "superadmin");
            });
            if (isAlreadyAdmin) {
                return m.reply(`⚠️ @${realJid.split('@')[0]} ya es admin.`, { mentions: [realJid] });
            }
            await conn.groupParticipantsUpdate(m.chat, [realJid], "promote");
            await m.react("✅");
        }
        catch (err) {
            console.error("❌ Error al promover:", err);
            await m.react("❌");
            await m.reply(m.e.error + " Error al intentar dar admin. Asegúrate de que soy admin y que el usuario está en el grupo.");
        }
    }
};
