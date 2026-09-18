// @ts-nocheck
const REQUEST_TIME = 60_000; // 60s
const requests = {};
function onlyNum(v = '') {
    return String(v || '').replace(/[^0-9]/g, '');
}
const declaraciones = [
    "💍 *{from}* se arrodilló frente a *{to}* y le pidió matrimonio 😳",
    "💘 *{from}* le tiró el anillo a *{to}* sin avisar 😱",
    "🌹 *{from}* le regaló 100 rosas a *{to}* y le pidió casarse 🥺",
    "🎻 *{from}* le dedicó una serenata a *{to}* y le propuso matrimonio 🎶",
    "💌 *{from}* le escribió una carta de amor a *{to}* pidiéndole matrimonio 💕",
    "🍫 *{from}* le llevó chocolates a *{to}* y le pidió que se casen 🍫💍",
    "🎤 *{from}* se puso a cantar en el grupo para conquistar a *{to}* 🎵",
    "😳 *{from}* se puso nervioso y tartamudeó pidiéndole matrimonio a *{to}* 💗",
    "🌙 *{from}* esperó la luna llena para pedirle matrimonio a *{to}* ✨",
    "🔥 *{from}* le dijo a *{to}*: 'o te casás conmigo o te robo el corazón' 💘",
    "🚀 *{from}* le propuso a *{to}* irse juntos a la luna 🌕💍",
    "👑 *{from}* le ofreció a *{to}* ser su realeza para toda la vida 💎",
    "🥀 *{from}* le pidió matrimonio a *{to}* con una rosa entre los dientes 🌹",
    "💃 *{from}* le bailó a *{to}* y le pidió que le dé el sí 💃🕺",
    "🎁 *{from}* le regaló un anillo a *{to}* y le pidió matrimonio 💍",
];
function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
export default {
    name: ["marry", "pareja"],
    help: ["marry @tag"],
    desc: "proponer matrimonio a otro usuario",
    tags: ["econ"],
    register: true,
    run: async ({ conn, m, mentionedJid }) => {
        const { rows: [user] } = await m.db.query("SELECT marry, id, lid, num FROM usuarios WHERE id = $1 OR lid = $2 LIMIT 1", [m.sender, m.lid || ""]);
        if (!user)
            return m.reply("⚠️ No estás registrado");
        if (user.marry) {
            return m.reply(`⚠️ Ya estás casado con @${user.marry.split("@")[0]}`, null, [user.marry]);
        }
        // ===== DETECTAR PAREJA =====
        let who = mentionedJid?.[0] ||
            m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
            m.quoted?.sender;
        if (!who)
            return m.reply("⚠️ Etiquetá a la persona con la que te querés casar");
        if (who === m.sender)
            return m.reply("⚠️ No podés casarte con vos mismo");
        // ===== RESOLVER LID =====
        if (who && who.endsWith("@lid")) {
            try {
                const meta = await conn.groupMetadata(m.chat);
                const participant = meta.participants.find(p => p.lid === who || p.id === who);
                if (participant?.id) {
                    who = participant.id;
                }
                else {
                    const number = who.replace(/@lid$/, "");
                    who = number + "@s.whatsapp.net";
                }
            }
            catch (e) {
                console.log("⚠️ No se pudo resolver LID:", e.message);
            }
        }
        const whoNum = onlyNum(who);
        // ===== BUSCAR PAREJA EN DB =====
        let resTarget = await m.db.query(`SELECT id, lid, num, marry FROM usuarios 
       WHERE id = $1 OR lid = $1 OR num = $2 
       LIMIT 1`, [who, whoNum]);
        if (resTarget.rows.length === 0) {
            const fallback = await m.db.query(`SELECT id, lid, num, marry FROM usuarios WHERE num = $1 LIMIT 1`, [whoNum]);
            if (fallback.rows.length === 0) {
                return m.reply("⚠️ Ese usuario no está registrado");
            }
            resTarget.rows = fallback.rows;
        }
        const target = resTarget.rows[0];
        if (target.marry)
            return m.reply(null, "⚠️ Ese usuario ya está casado");
        // ===== KEYS NORMALIZADAS =====
        const targetKey = target.id || target.lid;
        const realNum = target.num || onlyNum(target.id || target.lid || who);
        const targetTimerKey = onlyNum(targetKey) + "@s.whatsapp.net";
        // ===== GUARDAR SOLICITUD =====
        await m.db.query(`UPDATE usuarios SET marry_request = $1 WHERE id = $2 OR lid = $2`, [m.sender, targetKey]);
        // 🔥 Frase random de declaración
        const frase = pickRandom(declaraciones)
            .replace(/{from}/g, `@${onlyNum(m.sender)}`)
            .replace(/{to}/g, `@${realNum}`);
        await m.reply(`${frase}`, `❤️ Escribí *aceptar*\n💔 Escribí *rechazar*\n\n> ⏳ Tenés 60 segundos`);
        if (requests[targetTimerKey]) {
            clearTimeout(requests[targetTimerKey]);
            delete requests[targetTimerKey];
        }
        // ===== TIMEOUT =====
        requests[targetTimerKey] = setTimeout(async () => {
            await m.db.query(`UPDATE usuarios SET marry_request = NULL WHERE id = $1 OR lid = $1`, [targetKey]);
            delete requests[targetTimerKey];
            conn.sendMessage(m.chat, { text: "⏰ La solicitud de matrimonio expiró" }, { quoted: m || null });
        }, REQUEST_TIME);
    },
    before: async (m) => {
        const { rows: [row] } = await m.db.query("SELECT id, lid, marry_request FROM usuarios WHERE id = $1 OR lid = $2 LIMIT 1", [m.sender, m.lid || ""]);
        if (!row)
            return;
        const req = row.marry_request;
        if (!req)
            return;
        const text = (m.text || "").toLowerCase().trim();
        // 🔥 Key normalizada del receptor (yo mismo)
        const senderKey = onlyNum(row.id || row.lid) + "@s.whatsapp.net";
        // ===== RECHAZAR =====
        if (text === "rechazar" || text.startsWith("rechazar")) {
            // Buscar la key del solicitante
            const { rows: [solicitante] } = await m.db.query("SELECT id, lid FROM usuarios WHERE id = $1 OR lid = $1 LIMIT 1", [req]);
            const reqKey = solicitante?.id || solicitante?.lid || req;
            const reqTimerKey = onlyNum(reqKey) + "@s.whatsapp.net";
            // 🔥 Limpiar timer
            clearTimeout(requests[senderKey]);
            delete requests[senderKey];
            await m.db.query("UPDATE usuarios SET marry_request = NULL WHERE id = $1 OR lid = $2", [m.sender, m.lid || ""]);
            return m.reply(`💔 *@${onlyNum(m.sender)}* rechazó la propuesta de *@${onlyNum(req)}*\n\n> F en el chat...`, null, [m.sender, req]);
        }
        // ===== ACEPTAR =====
        if (text === "aceptar" || text.startsWith("aceptar")) {
            const { rows: [solicitante] } = await m.db.query("SELECT id, lid FROM usuarios WHERE id = $1 OR lid = $1 LIMIT 1", [req]);
            const reqKey = solicitante?.id || solicitante?.lid || req;
            // 🔥 Limpiar timer
            clearTimeout(requests[senderKey]);
            delete requests[senderKey];
            // Actualizar ambos cónyuges
            await m.db.query(`UPDATE usuarios SET marry = $1, marry_request = NULL WHERE id = $2 OR lid = $2`, [req, m.sender]);
            await m.db.query(`UPDATE usuarios SET marry = $1 WHERE id = $2 OR lid = $2`, [m.sender, reqKey]);
            // Frases de boda random
            const frasesBoda = [
                `🎉 FELICIDADES 🎉\n*@${onlyNum(req)}* y *@${onlyNum(m.sender)}* ahora están casados 💍`,
                `💒 ¡SE CASARON! 💒\n*@${onlyNum(req)}* y *@${onlyNum(m.sender)}* unieron sus vidas 💕`,
                `💍 ¡BODA EN EL GRUPO! 💍\n*@${onlyNum(req)}* le dio el sí a *@${onlyNum(m.sender)}* 🎊`,
                `🥂 ¡BRINDIS! 🥂\n*@${onlyNum(req)}* y *@${onlyNum(m.sender)}* son marido y mujer 💑`,
                `💐 ¡FELIZ MATRIMONIO! 💐\n*@${onlyNum(m.sender)}* aceptó casarse con *@${onlyNum(req)}* 💖`,
            ];
            const fraseBoda = pickRandom(frasesBoda);
            return m.reply(fraseBoda, null, [req, m.sender]);
        }
    }
};
