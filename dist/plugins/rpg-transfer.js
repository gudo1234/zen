// @ts-nocheck
const RECURSOS = ['exp', 'limite'];
const CONFIRMACION_TIEMPO = 60_000;
let confirmation = {};
// ===== HELPERS =====
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
function labelRecurso(tipo, m) {
    if (tipo === 'limite')
        return `${m.e.currency_emoji} ${m.e.currency_name}`;
    if (tipo === 'banco')
        return `${m.e.currency_emoji} (banco)`;
    if (tipo === 'exp')
        return 'XP';
    return tipo;
}
async function buscarUsuario(m, who, num) {
    if (who.includes('@lid')) {
        const res = await m.db.query(`SELECT * FROM usuarios WHERE lid = $1 LIMIT 1`, [who]);
        if (res.rows.length)
            return res.rows[0];
    }
    if (num) {
        const res = await m.db.query(`SELECT * FROM usuarios WHERE num = $1 LIMIT 1`, [num]);
        if (res.rows.length)
            return res.rows[0];
    }
    if (who.includes('@s.whatsapp.net')) {
        const res = await m.db.query(`SELECT * FROM usuarios WHERE id = $1 LIMIT 1`, [who]);
        if (res.rows.length)
            return res.rows[0];
    }
    if (num && num.length >= 6) {
        const res = await m.db.query(`SELECT * FROM usuarios WHERE num LIKE $1 LIMIT 1`, [`%${num.slice(-6)}%`]);
        if (res.rows.length)
            return res.rows[0];
    }
    return null;
}
function getRealJid(target, fallback) {
    if (target?.id?.includes('@s.whatsapp.net'))
        return target.id;
    if (target?.num)
        return `${target.num}@s.whatsapp.net`;
    if (target?.lid)
        return target.lid;
    return fallback;
}
export default {
    name: ["transfer", "pay", "dar", "transferir"],
    help: ["transfer <tipo> <cantidad> @tag"],
    desc: "Transferir recursos a otro usuario",
    tags: ["econ"],
    register: true,
    run: async ({ conn, m, args, mentionedJid, prefijo }) => {
        if (confirmation[m.sender]) {
            return conn.sendMessage(m.chat, {
                text: "⏳ Ya estás haciendo una transferencia, terminá esa primero"
            }, { quoted: m });
        }
        const { rows: [user] } = await m.db.query("SELECT exp, limite, banco, inventario, picos FROM usuarios WHERE id = $1 OR lid = $1", [m.sender]);
        if (!user) {
            return conn.sendMessage(m.chat, {
                text: "❌ No estás registrado en la base de datos."
            }, { quoted: m });
        }
        const tipo = (args[0] || '').toLowerCase();
        if (!tipo) {
            return conn.sendMessage(m.chat, {
                text: `${m.e.warn} *¿Qué querés transferir?*\n\n` +
                    `*Recursos:*\n` +
                    `▢ *${prefijo}transfer exp <cantidad> @tag*\n` +
                    `▢ *${prefijo}transfer limite <cantidad> @tag*\n\n` +
                    `*Items:*\n` +
                    `▢ *${prefijo}transfer hamburguesa 3 @tag*\n` +
                    `▢ *${prefijo}transfer venda 2 @tag*\n\n` +
                    `*Picos:*\n` +
                    `▢ *${prefijo}transfer pico_hierro 1 @tag*`
            }, { quoted: m });
        }
        const esRecurso = RECURSOS.includes(tipo);
        const inventario = user.inventario || {};
        const picos = user.picos || {};
        const esItem = !esRecurso && (inventario[tipo] || 0) > 0;
        const esPico = !esRecurso && Array.isArray(picos[tipo]) && picos[tipo].length > 0;
        // Si no es nada de lo anterior, error
        if (!esRecurso && !esItem && !esPico) {
            return conn.sendMessage(m.chat, {
                text: `❌ No tenés *${tipo}* en tu inventario, arsenal o recursos.\n\n> Usá *${prefijo}inv* para ver qué tenés`
            }, { quoted: m });
        }
        // ===== CANTIDAD =====
        const count = Math.max(1, Number(args[1]) || 0);
        if (isNaN(count) || count < 1) {
            return conn.sendMessage(m.chat, {
                text: "⚠️ Poné una cantidad válida mayor a 0"
            }, { quoted: m });
        }
        // ===== DESTINATARIO =====
        let who = mentionedJid?.[0] ||
            m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
            m.quoted?.sender;
        if (!who) {
            return conn.sendMessage(m.chat, {
                text: "❌ Etiquetá al usuario a quien querés transferirle"
            }, { quoted: m });
        }
        who = cleanJid(who);
        const num = onlyNum(who);
        const target = await buscarUsuario(m, who, num);
        if (!target) {
            return conn.sendMessage(m.chat, {
                text: `❌ *Usuario no encontrado*\n\nNo se encontró: \`${who}\``
            }, { quoted: m });
        }
        const realJid = getRealJid(target, who);
        if (realJid === m.sender) {
            return conn.sendMessage(m.chat, {
                text: "❌ No te transferís a vos mismo, pelotudo"
            }, { quoted: m });
        }
        const displayName = getDisplayName(target);
        const mentionJid = getMentionJid(target);
        // ===== VERIFICAR SALDO =====
        let label = "";
        let saldo = 0;
        if (esRecurso) {
            saldo = Number(user[tipo]) || 0;
            label = labelRecurso(tipo, m);
        }
        else if (esItem) {
            saldo = Number(inventario[tipo]) || 0;
            label = `x${tipo}`;
        }
        else if (esPico) {
            saldo = picos[tipo].length;
            label = `x${tipo}`;
        }
        if (saldo < count) {
            return conn.sendMessage(m.chat, {
                text: `❌ No tenés ni *${count}* ${label}\n\n▢ Tenés: *${saldo}*`
            }, { quoted: m });
        }
        // ===== CONFIRMACIÓN =====
        const confirmTxt = `⚠️ *VAS A TRANSFERIR:*\n` +
            `→ *${count}* ${label}\n` +
            `→ A: @${displayName}\n\n` +
            `Escribí *si* para confirmar o *no* para cancelar\n` +
            `⏳ Tenés 60 segundos.`;
        await conn.sendMessage(m.chat, {
            text: confirmTxt,
            mentions: mentionJid ? [mentionJid] : [m.sender]
        }, { quoted: m });
        // ===== GUARDAR CONFIRMACIÓN =====
        confirmation[m.sender] = {
            sender: m.sender,
            to: realJid,
            tipo: esRecurso ? "recurso" : esItem ? "item" : "pico",
            key: tipo,
            count,
            targetData: target,
            displayName,
            mentionJid,
            chatId: m.chat,
            conn,
            timeout: setTimeout(async () => {
                if (confirmation[m.sender]) {
                    await conn.sendMessage(m.chat, {
                        text: "⏰ Se te acabó el tiempo"
                    }, { quoted: m });
                    delete confirmation[m.sender];
                }
            }, CONFIRMACION_TIEMPO)
        };
    },
    before: async (m, { conn }) => {
        const data = confirmation[m.sender];
        if (!data)
            return;
        const { timeout, sender, tipo, key, count, targetData, displayName, mentionJid, chatId } = data;
        // ===== CANCELAR =====
        if (/^no$/i.test(m.text)) {
            clearTimeout(timeout);
            delete confirmation[sender];
            await conn.sendMessage(chatId, {
                text: "❌ Transferencia cancelada"
            }, { quoted: m });
            return true;
        }
        // ===== CONFIRMAR =====
        if (/^si$/i.test(m.text)) {
            clearTimeout(timeout);
            const targetKey = targetData?.id || targetData?.lid;
            // ===== RECURSO =====
            if (tipo === "recurso") {
                const { rows: [fromUser] } = await m.db.query(`SELECT ${key} FROM usuarios WHERE id = $1 OR lid = $1`, [sender]);
                if (!fromUser || Number(fromUser[key]) < count) {
                    delete confirmation[sender];
                    await conn.sendMessage(chatId, {
                        text: "❌ Ya no tenés suficiente, se canceló"
                    }, { quoted: m });
                    return true;
                }
                await m.db.query(`UPDATE usuarios SET ${key} = ${key} - $1 WHERE id = $2 OR lid = $2`, [count, sender]);
                await m.db.query(`UPDATE usuarios SET ${key} = ${key} + $1 WHERE id = $2 OR lid = $2`, [count, targetKey]);
                const label = labelRecurso(key, m);
                await conn.sendMessage(chatId, {
                    text: `✅ Transferiste *${count}* ${label} a @${displayName}`,
                    mentions: mentionJid ? [mentionJid] : [m.sender]
                }, { quoted: m });
            }
            // ===== ITEM =====
            if (tipo === "item") {
                const { rows: [fromUser] } = await m.db.query("SELECT inventario FROM usuarios WHERE id = $1 OR lid = $1", [sender]);
                const inv = fromUser?.inventario || {};
                if (Number(inv[key] || 0) < count) {
                    delete confirmation[sender];
                    await conn.sendMessage(chatId, {
                        text: "❌ Ya no tenés ese item, se canceló"
                    }, { quoted: m });
                    return true;
                }
                inv[key] = Number(inv[key]) - count;
                if (inv[key] <= 0)
                    delete inv[key];
                await m.db.query("UPDATE usuarios SET inventario = $1::jsonb WHERE id = $2 OR lid = $2", [JSON.stringify(inv), sender]);
                const { rows: [toUser] } = await m.db.query("SELECT inventario FROM usuarios WHERE id = $1 OR lid = $1", [targetKey]);
                const invTo = toUser?.inventario || {};
                invTo[key] = (Number(invTo[key]) || 0) + count;
                await m.db.query("UPDATE usuarios SET inventario = $1::jsonb WHERE id = $2 OR lid = $2", [JSON.stringify(invTo), targetKey]);
                await conn.sendMessage(chatId, {
                    text: `✅ Transferiste *${count}x ${key}* a @${displayName}`,
                    mentions: mentionJid ? [mentionJid] : [m.sender]
                }, { quoted: m });
            }
            // ===== PICO =====
            if (tipo === "pico") {
                const { rows: [fromUser] } = await m.db.query("SELECT picos FROM usuarios WHERE id = $1 OR lid = $1", [sender]);
                const picos = fromUser?.picos || {};
                const lista = picos[key] || [];
                if (lista.length < count) {
                    delete confirmation[sender];
                    await conn.sendMessage(chatId, {
                        text: "❌ Ya no tenés ese pico, se canceló"
                    }, { quoted: m });
                    return true;
                }
                const sacados = lista.splice(0, count);
                if (lista.length === 0)
                    delete picos[key];
                await m.db.query("UPDATE usuarios SET picos = $1::jsonb WHERE id = $2 OR lid = $2", [JSON.stringify(picos), sender]);
                const { rows: [toUser] } = await m.db.query("SELECT picos FROM usuarios WHERE id = $1 OR lid = $1", [targetKey]);
                const picosTo = toUser?.picos || {};
                if (!picosTo[key])
                    picosTo[key] = [];
                picosTo[key].push(...sacados);
                await m.db.query("UPDATE usuarios SET picos = $1::jsonb WHERE id = $2 OR lid = $2", [JSON.stringify(picosTo), targetKey]);
                await conn.sendMessage(chatId, {
                    text: `✅ Transferiste *${count}x ${key}* a @${displayName}`,
                    mentions: mentionJid ? [mentionJid] : [m.sender]
                }, { quoted: m });
            }
            delete confirmation[sender];
            return true;
        }
    }
};
