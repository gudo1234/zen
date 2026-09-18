import { db } from "../lib/db.js";
const cleanJid = (jid = '') => String(jid || '').replace(/:\d+/, '');
const onlyNum = (v = '') => String(v || '').replace(/[^0-9]/g, '');
export default {
    name: [
        "addlimit", "removelimit", "addexp", "removexp",
        "añadirdiamantes", "dardiamantes", "quitardiamantes", "sacardiamantes",
        "añadirxp", "addxp", "quitarxp", "sacarexp",
        "resetdiamantes", "resetexp",
        "resetbanc", "quitarbanc", "addbanc", "añadirbanc"
    ],
    help: ["addlimit", "removelimit", "addxp", "quitarxp"],
    tags: ["owner"],
    desc: "Agrega, quita o reinicia diamantes/exp a un usuario",
    rowner: true,
    register: true,
    run: async ({ conn, m, args, text, cmd }) => {
        let who = null;
        let cantidad = 0;
        let userInput = "";
        let isReset = false;
        if (/resetdiamantes|resetexp|resetbanco/i.test(cmd)) {
            isReset = true;
        }
        // Detectar usuario
        if (m.mentionedJid && m.mentionedJid.length > 0) {
            who = m.mentionedJid[0];
            const parts = text.split(' ');
            const lastPart = parts[parts.length - 1];
            if (isReset || lastPart.toLowerCase() === 'reset') {
                cantidad = 0;
                isReset = true;
            }
            else {
                cantidad = parseInt(lastPart) || 0;
            }
            userInput = who;
        }
        else if (m.quoted) {
            who = m.quoted.sender || m.quoted.participant;
            const parts = text.split(' ');
            const lastPart = parts[parts.length - 1];
            if (isReset || lastPart.toLowerCase() === 'reset') {
                cantidad = 0;
                isReset = true;
            }
            else {
                cantidad = parseInt(lastPart) || 0;
            }
            userInput = who;
        }
        else {
            const lidMatch = text.match(/\d+@lid/);
            if (lidMatch) {
                userInput = lidMatch[0];
                const parts = text.split(' ');
                const lastPart = parts[parts.length - 1];
                if (lastPart.toLowerCase() === 'reset') {
                    cantidad = 0;
                    isReset = true;
                }
                else {
                    const allNumbers = text.match(/\d+/g);
                    if (allNumbers && allNumbers.length > 0) {
                        const lastNum = allNumbers[allNumbers.length - 1];
                        const lidClean = onlyNum(lidMatch[0]);
                        if (lastNum === lidClean && allNumbers.length > 1) {
                            cantidad = parseInt(allNumbers[allNumbers.length - 2]) || 0;
                        }
                        else {
                            cantidad = parseInt(lastNum) || 0;
                        }
                    }
                }
                who = userInput;
            }
            else {
                const phoneMatch = text.match(/\+\d{10,15}/) || text.match(/\d{10,15}/);
                if (phoneMatch) {
                    userInput = phoneMatch[0];
                    const parts = text.split(' ');
                    const lastPart = parts[parts.length - 1];
                    if (lastPart.toLowerCase() === 'reset') {
                        cantidad = 0;
                        isReset = true;
                    }
                    else {
                        const allNumbers = text.match(/\d+/g);
                        if (allNumbers && allNumbers.length > 0) {
                            const lastNum = allNumbers[allNumbers.length - 1];
                            const phoneClean = onlyNum(phoneMatch[0]);
                            if (lastNum === phoneClean && allNumbers.length > 1) {
                                cantidad = parseInt(allNumbers[allNumbers.length - 2]) || 0;
                            }
                            else {
                                cantidad = parseInt(lastNum) || 0;
                            }
                        }
                    }
                    if (!userInput.startsWith('+') && /^\d{10,15}$/.test(userInput)) {
                        userInput = '+' + userInput;
                    }
                    who = userInput;
                }
                else {
                    return m.reply(`⚠️ Usa: ${cmd} @usuario cantidad\nEjemplo: ${cmd} +59160603187 10000\nO: ${cmd} 123456789@lid reset`);
                }
            }
        }
        if (!who) {
            return m.reply(`⚠️ Usa: ${cmd} @usuario cantidad\nEjemplo: ${cmd} +59160603187 10000\nO: ${cmd} 123456789@lid reset`);
        }
        if (isReset) {
            cantidad = 0;
        }
        if (!isReset && (!cantidad || isNaN(cantidad) || cantidad <= 0)) {
            return m.reply(`⚠️ Ingresa una cantidad válida o usa "reset".`);
        }
        try {
            who = cleanJid(who);
            const num = onlyNum(who);
            const esLid = who.includes('@lid');
            let user = null;
            let realJid = null;
            let resUser;
            if (esLid) {
                resUser = await db.query(`SELECT * FROM usuarios WHERE lid = $1`, [who]);
                if (resUser.rows.length)
                    user = resUser.rows[0];
            }
            if (!user && num) {
                resUser = await db.query(`SELECT * FROM usuarios WHERE num = $1`, [num]);
                if (resUser.rows.length)
                    user = resUser.rows[0];
            }
            if (!user && who.includes('@s.whatsapp.net')) {
                resUser = await db.query(`SELECT * FROM usuarios WHERE id = $1`, [who]);
                if (resUser.rows.length)
                    user = resUser.rows[0];
            }
            if (!user && num && num.length >= 6) {
                resUser = await db.query(`SELECT * FROM usuarios WHERE num LIKE $1`, [`%${num.slice(-6)}%`]);
                if (resUser.rows.length)
                    user = resUser.rows[0];
            }
            if (!user) {
                return m.reply(`❌ *Usuario no encontrado*\n\nNo se encontró: \`${who}\``);
            }
            if (user?.id && user.id.includes('@s.whatsapp.net')) {
                realJid = user.id;
            }
            else if (user?.num) {
                realJid = `${user.num}@s.whatsapp.net`;
            }
            else if (user?.lid) {
                realJid = user.lid;
            }
            else {
                realJid = who;
            }
            const lid = user?.lid || '';
            const nombre = user?.nombre || user?.name || realJid.split('@')[0];
            let resultado;
            let action = "";
            let valueName = "";
            let resetText = "";
            // DIAMANTES
            if (/addlimit|añadirdiamantes|dardiamantes/i.test(cmd)) {
                resultado = await db.query(`UPDATE usuarios SET limite = limite + $1 WHERE lid = $2 RETURNING limite`, [cantidad, lid]);
                action = "💎 DIAMANTES AGREGADOS";
                valueName = "limite";
            }
            if (/removelimit|quitardiamantes|sacardiamantes/i.test(cmd)) {
                if (isReset) {
                    resultado = await db.query(`UPDATE usuarios SET limite = 0 WHERE lid = $1 RETURNING limite`, [lid]);
                    action = "💎 DIAMANTES REINICIADOS";
                    valueName = "limite";
                    resetText = " (a 0)";
                }
                else {
                    resultado = await db.query(`UPDATE usuarios SET limite = GREATEST(0, limite - $1) WHERE lid = $2 RETURNING limite`, [cantidad, lid]);
                    action = "💎 DIAMANTES QUITADOS";
                    valueName = "limite";
                }
            }
            if (/resetdiamantes/i.test(cmd)) {
                resultado = await db.query(`UPDATE usuarios SET limite = 0 WHERE lid = $1 RETURNING limite`, [lid]);
                action = "💎 DIAMANTES REINICIADOS";
                valueName = "limite";
                resetText = " (a 0)";
            }
            // EXP
            if (/addexp|añadirxp|addxp/i.test(cmd)) {
                resultado = await db.query(`UPDATE usuarios SET exp = exp + $1 WHERE lid = $2 RETURNING exp`, [cantidad, lid]);
                action = "✨ EXP AGREGADO";
                valueName = "exp";
            }
            if (/removexp|quitarxp|sacarexp/i.test(cmd)) {
                if (isReset) {
                    resultado = await db.query(`UPDATE usuarios SET exp = 0 WHERE lid = $1 RETURNING exp`, [lid]);
                    action = "✨ EXP REINICIADO";
                    valueName = "exp";
                    resetText = " (a 0)";
                }
                else {
                    resultado = await db.query(`UPDATE usuarios SET exp = GREATEST(0, exp - $1) WHERE lid = $2 RETURNING exp`, [cantidad, lid]);
                    action = "✨ EXP QUITADO";
                    valueName = "exp";
                }
            }
            if (/resetexp/i.test(cmd)) {
                resultado = await db.query(`UPDATE usuarios SET exp = 0 WHERE lid = $1 RETURNING exp`, [lid]);
                action = "✨ EXP REINICIADO";
                valueName = "exp";
                resetText = " (a 0)";
            }
            // BANCO
            if (/addbanc|añadirbanc/i.test(cmd)) {
                resultado = await db.query(`UPDATE usuarios SET banco = banco + $1 WHERE lid = $2 RETURNING banco`, [cantidad, lid]);
                action = "🏦 BANCO AGREGADO";
                valueName = "banco";
            }
            if (/quitarbanc|removerbanc/i.test(cmd)) {
                if (isReset) {
                    resultado = await db.query(`UPDATE usuarios SET banco = 0 WHERE lid = $1 RETURNING banco`, [lid]);
                    action = "🏦 BANCO REINICIADO";
                    valueName = "banco";
                    resetText = " (a 0)";
                }
                else {
                    resultado = await db.query(`UPDATE usuarios SET banco = GREATEST(0, banco - $1) WHERE lid = $2 RETURNING banco`, [cantidad, lid]);
                    action = "🏦 BANCO QUITADO";
                    valueName = "banco";
                }
            }
            if (/resetbanc/i.test(cmd)) {
                resultado = await db.query(`UPDATE usuarios SET banco = 0 WHERE lid = $1 RETURNING banco`, [lid]);
                action = "🏦 BANCO REINICIADO";
                valueName = "banco";
                resetText = " (a 0)";
            }
            if (resultado) {
                const newValue = resultado.rows[0]?.[valueName] || 0;
                const msg = [
                    `*≡ ${action}${resetText}*`,
                    `┏━━━━━━━━━━━━━━━`,
                    `┃• *Usuario:* ${nombre}`,
                    isReset ? `┃• *Estado:* Reiniciado a 0` : `┃• *Cantidad:* ${cantidad.toLocaleString('es-AR')}`,
                    `┃• *Nuevo total:* ${newValue.toLocaleString('es-AR')}`,
                    `┗━━━━━━━━━━━━━━━`
                ].join('\n');
                const mention = realJid.includes('@') ? realJid : `${realJid}@s.whatsapp.net`;
                return conn.sendMessage(m.chat, {
                    text: msg,
                    mentions: [mention]
                }, { quoted: m });
            }
        }
        catch (e) {
            console.error(e);
            return m.reply(`❌ Error: ${e.message}`);
        }
    }
};
