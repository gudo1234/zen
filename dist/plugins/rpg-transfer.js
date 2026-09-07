const items = ['exp', 'limite'];
let confirmation = {};
// ===== FUNCIONES AUXILIARES =====
function cleanJid(jid = '') {
    return String(jid || '').replace(/:\d+/, '');
}
function onlyNum(v = '') {
    return String(v || '').replace(/[^0-9]/g, '');
}
function getDisplayName(target) {
    if (target?.num)
        return target.num;
    if (target?.username)
        return target.username;
    if (target?.nombre || target?.name)
        return target.nombre || target.name;
    if (target?.lid) {
        const lidNum = onlyNum(target.lid);
        if (lidNum)
            return lidNum;
    }
    return 'usuario';
}
function getMentionJid(target) {
    if (target?.id && target.id.includes('@s.whatsapp.net'))
        return target.id;
    if (target?.num)
        return `${target.num}@s.whatsapp.net`;
    if (target?.lid)
        return target.lid;
    return null;
}
export default {
    name: ["transfer", "pay", "dar", "transferir"],
    help: ["transfer <tipo> <cantidad> @tag"],
    desc: "Transferir XP o diamantes a otro usuario",
    tags: ["econ"],
    register: true,
    run: async ({ conn, m, args, mentionedJid, prefijo }) => {
        if (confirmation[m.sender]) {
            return conn.sendMessage(m.chat, {
                text: "⏳ Ya estás haciendo una transferencia, terminá esa mierda primero"
            }, { quoted: m });
        }
        const { rows: [user] } = await m.db.query("SELECT exp, limite FROM usuarios WHERE id = $1 OR lid = $1", [m.sender]);
        if (!user) {
            return conn.sendMessage(m.chat, {
                text: "❌ No estás registrado en la base de datos."
            }, { quoted: m });
        }
        const tipo = (args[0] || '').toLowerCase();
        if (!items.includes(tipo)) {
            return conn.sendMessage(m.chat, {
                text: `${m.e.warn} Solo podés transferir:\n• exp → Experiencia\n• limite → ${m.e.currency_emoji} ${m.e.currency_name}\n\nEjemplo: ${prefijo}transfer exp 500 @tag`
            }, { quoted: m });
        }
        const count = Math.max(1, Number(args[1]) || 1);
        if (isNaN(count) || count < 1) {
            return conn.sendMessage(m.chat, {
                text: "⚠️ Pon una cantidad válida mayor a 0"
            }, { quoted: m });
        }
        let who = mentionedJid?.[0] ||
            m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
            m.quoted?.sender ||
            args.slice(2).join(' ');
        if (!who) {
            return conn.sendMessage(m.chat, {
                text: "❌ Etiquetá al usuario, pon su número o LID"
            }, { quoted: m });
        }
        who = cleanJid(who);
        const num = onlyNum(who);
        const esLid = who.includes('@lid');
        let target = null;
        let realJid = null;
        if (esLid) {
            const res = await m.db.query(`SELECT * FROM usuarios WHERE lid = $1`, [who]);
            if (res.rows.length)
                target = res.rows[0];
        }
        if (!target && num) {
            const res = await m.db.query(`SELECT * FROM usuarios WHERE num = $1`, [num]);
            if (res.rows.length)
                target = res.rows[0];
        }
        if (!target && who.includes('@s.whatsapp.net')) {
            const res = await m.db.query(`SELECT * FROM usuarios WHERE id = $1`, [who]);
            if (res.rows.length)
                target = res.rows[0];
        }
        if (!target && num && num.length >= 6) {
            const res = await m.db.query(`SELECT * FROM usuarios WHERE num LIKE $1`, [`%${num.slice(-6)}%`]);
            if (res.rows.length)
                target = res.rows[0];
        }
        if (!target) {
            return conn.sendMessage(m.chat, {
                text: `❌ *Usuario no encontrado*\n\nNo se encontró: \`${who}\``
            }, { quoted: m });
        }
        if (target?.id && target.id.includes('@s.whatsapp.net')) {
            realJid = target.id;
        }
        else if (target?.num) {
            realJid = `${target.num}@s.whatsapp.net`;
        }
        else if (target?.lid) {
            realJid = target.lid;
        }
        else {
            realJid = who;
        }
        if (realJid === m.sender) {
            return conn.sendMessage(m.chat, {
                text: "❌ No te transferís a vos mismo, pelotudo"
            }, { quoted: m });
        }
        if (user[tipo] < count) {
            const tipoLabel = tipo === 'limite' ? `${m.e.currency_emoji} ${m.e.currency_name}` : tipo.toUpperCase();
            return conn.sendMessage(m.chat, {
                text: `❌ No tenés ni ${count} ${tipoLabel}, pobre`
            }, { quoted: m });
        }
        const displayName = getDisplayName(target);
        const mentionJid = getMentionJid(target);
        const tipoLabel = tipo === 'limite' ? `${m.e.currency_emoji} ${m.e.currency_name}` : tipo.toUpperCase();
        const confirmTxt = `⚠️ *VAS A TRANSFERIR:*\n` +
            `→ ${count} ${tipoLabel}\n` +
            `→ A: @${displayName}\n\n` +
            `Escribí *si* para confirmar o *no* para cancelar\n` +
            `⏳ Tenés 60 segundos.`;
        await conn.sendMessage(m.chat, {
            text: confirmTxt,
            mentions: mentionJid ? [mentionJid] : [m.sender]
        }, { quoted: m });
        confirmation[m.sender] = {
            sender: m.sender,
            to: realJid,
            type: tipo,
            count,
            targetData: target,
            displayName: displayName,
            mentionJid: mentionJid,
            chatId: m.chat,
            conn: conn,
            timeout: setTimeout(async () => {
                const data = confirmation[m.sender];
                if (data) {
                    await conn.sendMessage(m.chat, {
                        text: "⏰ Se te acabó el tiempo, boludo"
                    }, { quoted: m });
                    delete confirmation[m.sender];
                }
            }, 60_000)
        };
    },
    before: async (m, { conn }) => {
        const data = confirmation[m.sender];
        if (!data)
            return;
        const { timeout, sender, to, type, count, targetData, displayName, mentionJid, chatId } = data;
        if (/^no$/i.test(m.text)) {
            clearTimeout(timeout);
            delete confirmation[sender];
            await conn.sendMessage(chatId, {
                text: "❌ Transferencia cancelada"
            }, { quoted: m });
            return true;
        }
        if (/^si$/i.test(m.text)) {
            clearTimeout(timeout);
            const { rows: [fromUser] } = await m.db.query(`SELECT ${type} FROM usuarios WHERE id = $1 OR lid = $1`, [sender]);
            if (!fromUser || fromUser[type] < count) {
                delete confirmation[sender];
                await conn.sendMessage(chatId, {
                    text: "❌ Ya no tenés suficiente, se canceló"
                }, { quoted: m });
                return true;
            }
            await m.db.query(`UPDATE usuarios SET ${type} = ${type} - $1 WHERE id = $2 OR lid = $2`, [count, sender]);
            const targetLid = targetData?.lid || targetData?.id || to;
            await m.db.query(`UPDATE usuarios SET ${type} = ${type} + $1 WHERE lid = $2 OR id = $2`, [count, targetLid]);
            const tipoLabel = type === 'limite' ? `${m.e.currency_emoji} ${m.e.currency_name}` : type.toUpperCase();
            const confirmMsg = `✅ Transferiste ${count} ${tipoLabel} a @${displayName}`;
            await conn.sendMessage(chatId, {
                text: confirmMsg,
                mentions: mentionJid ? [mentionJid] : [m.sender]
            }, { quoted: m });
            delete confirmation[sender];
            return true;
        }
    }
};
