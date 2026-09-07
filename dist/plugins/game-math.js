const mathGames = new Map();
const dificultades = {
    noob: { ops: ['+', '-'], min: 1, max: 10, tiempo: 15000, exp: [300, 600] },
    easy: { ops: ['+', '-', '*'], min: 10, max: 30, tiempo: 20000, exp: [600, 1000] },
    medium: { ops: ['+', '-', '*'], min: 30, max: 70, tiempo: 25000, exp: [1000, 1500] },
    hard: { ops: ['+', '-', '*'], min: 70, max: 120, tiempo: 30000, exp: [1500, 2000] },
    extreme: { ops: ['+', '-', '*', '/'], min: 100, max: 250, tiempo: 35000, exp: [2000, 3000] },
    impossible: { ops: ['+', '-', '*', '/'], min: 200, max: 999, tiempo: 40000, exp: [3000, 5000] }
};
// ========== BEFORE - DETECTA RESPUESTAS ==========
const before = async (m, { conn }) => {
    const texto = (m.originalText || m.text || "").trim();
    if (!texto)
        return;
    // SOLO EN PRIVADO O EN EL MISMO CHAT
    if (!mathGames.has(m.sender))
        return;
    const data = mathGames.get(m.sender);
    const { result, exp, intentos, chatId } = data;
    // Si no es el chat donde se inició el juego, ignorar
    if (chatId && m.chat !== chatId)
        return;
    const entrada = texto;
    let correcta = false;
    if (String(result).includes('.') || entrada.includes('.')) {
        correcta = parseFloat(entrada).toFixed(2) === result.toFixed(2);
    }
    else {
        correcta = Number(entrada) === result;
    }
    if (correcta) {
        mathGames.delete(m.sender);
        await m.db.query('UPDATE usuarios SET exp = exp + $1 WHERE id = $2', [exp, m.sender]);
        await m.reply(`✅ ¡Correcto!`, `Ganaste *${exp} XP* 🎉`);
        return true;
    }
    else {
        data.intentos--;
        if (data.intentos <= 0) {
            mathGames.delete(m.sender);
            await m.reply(`❌ Fallaste 3 veces.`, `La respuesta correcta era *${result}*.`);
            return true;
        }
        else {
            mathGames.set(m.sender, data);
            await m.reply(`❌ Incorrecto.`, `Te quedan *${data.intentos}* intento(s).`);
            return true;
        }
    }
};
// ========== COMANDO PRINCIPAL ==========
export default {
    name: ["math", "mates", "matemáticas"],
    help: ["math [dificultad]"],
    desc: "Juego de matemáticas",
    tags: ["game"],
    register: true,
    before: before,
    run: async ({ conn, m, args, prefijo, cmd }) => {
        const userId = m.sender;
        const chatId = m.chat;
        const lid = m.lid || "";
        // Verificar registrado
        const check = await m.db.query(`SELECT exp FROM usuarios WHERE id = $1 OR lid = $2 LIMIT 1`, [userId, lid]);
        if (!check.rows.length) {
            return m.reply(`⚠️ No estás registrado. Usa *${prefijo}reg*`);
        }
        const dificultad = (args[0] || '').toLowerCase();
        if (!dificultad || !dificultades[dificultad]) {
            return m.reply(`⚠️ Debes elegir una dificultad válida.\n\n📌 *Ejemplos:*\n${prefijo}math noob\n${prefijo}math easy\n${prefijo}math hard\n\n📊 *Dificultades disponibles:*\n${Object.keys(dificultades).map(k => `• ${k}`).join('\n')}`);
        } //`
        // Verificar si ya tiene un juego activo
        if (mathGames.has(userId)) {
            return m.reply(`⚠️ Ya tienes un juego activo. Termínalo primero.`);
        }
        const nivel = dificultades[dificultad];
        const a = Math.floor(Math.random() * (nivel.max - nivel.min + 1)) + nivel.min;
        const b = Math.floor(Math.random() * (nivel.max - nivel.min + 1)) + nivel.min;
        const op = nivel.ops[Math.floor(Math.random() * nivel.ops.length)];
        let result;
        if (op === '/') {
            result = parseFloat((a / b).toFixed(2));
        }
        else {
            result = eval(`${a}${op}${b}`);
        }
        const recompensa = Math.floor(Math.random() * (nivel.exp[1] - nivel.exp[0] + 1)) + nivel.exp[0];
        mathGames.set(userId, {
            result,
            exp: recompensa,
            intentos: 3,
            chatId: chatId
        });
        // Timeout para eliminar el juego
        setTimeout(() => {
            if (mathGames.has(userId)) {
                const data = mathGames.get(userId);
                mathGames.delete(userId);
                conn.sendMessage(chatId, {
                    text: `⌛ Se acabó el tiempo. La respuesta era: *${data.result}*`
                });
            }
        }, nivel.tiempo);
        const emojiOp = { '+': '➕', '-': '➖', '*': '✖️', '/': '➗' };
        return m.reply(`╭───〔 *🧮 MATEMÁTICAS* 〕───╮
│
│  📝 *Operación:*
│  ${a} ${emojiOp[op] || op} ${b} = ?
│
│  ⏱️ *Tiempo:* ${nivel.tiempo / 1000} segundos
│  🎯 *Intentos:* 3
│  🏆 *Premio:* ${recompensa} XP
│
│  💡 Responde con la respuesta 
╰────────────────────╮`);
    }
};
