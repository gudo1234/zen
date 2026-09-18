// @ts-nocheck
function onlyNum(v = '') {
    return String(v || '').replace(/[^0-9]/g, '');
}
const frasesDivorcio = [
    "💔 *{from}* y *{to}* se divorciaron tras una pelea terrible",
    "😭 *{from}* le pidió el divorcio a *{to}* y se fue llorando",
    "🚪 *{from}* echó a *{to}* de la casa y pidió el divorcio",
    "📄 *{from}* firmó los papeles del divorcio con *{to}* sin pensarlo",
    "🔥 *{from}* y *{to}* terminaron a los gritos en el grupo",
    "🍿 *{from}* dejó a *{to}* por otro y pidió el divorcio",
    "💼 *{from}* contrató un abogado y le hizo juicio a *{to}*",
    "🙄 *{from}* ya no aguantaba a *{to}* y pidió el divorcio",
    "🥀 El amor entre *{from}* y *{to}* se marchitó 💀",
    "👋 *{from}* le dijo chau a *{to}* para siempre",
];
function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
export default {
    name: ["divorce", "divorcio"],
    help: ["divorce @tag"],
    desc: "divorciarte de tu pareja actual",
    tags: ["econ"],
    register: true,
    run: async ({ conn, m, mentionedJid }) => {
        const { rows: [user] } = await m.db.query("SELECT marry, id, lid, num FROM usuarios WHERE id = $1 OR lid = $2 LIMIT 1", [m.sender, m.lid || ""]);
        if (!user)
            return m.reply("⚠️ No estás registrado");
        if (!user.marry)
            return m.reply(null, "⚠️ No estás casado con nadie");
        // ===== DETECTAR PAREJA =====
        let who = mentionedJid?.[0] ||
            m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
            m.quoted?.sender;
        if (!who)
            return m.reply(null, "⚠️ Etiquetá a la persona con la que querés divorciarte");
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
        const marryNormalizado = onlyNum(user.marry);
        const targetNormalizado = onlyNum(target.id || target.lid || target.num);
        if (marryNormalizado !== targetNormalizado) {
            return m.reply(null, "⚠️ No estás casado con esa persona");
        }
        // ===== KEYS PARA ACTUALIZAR =====
        const userKey = user.id || user.lid;
        const targetKey = target.id || target.lid;
        const realNum = target.num || onlyNum(target.id || target.lid || who);
        // ===== DIVORCIO =====
        await m.db.query(`UPDATE usuarios SET marry = NULL WHERE id = $1 OR lid = $1`, [userKey]);
        await m.db.query(`UPDATE usuarios SET marry = NULL WHERE id = $1 OR lid = $1`, [targetKey]);
        // ===== MENSAJE =====
        const frase = pickRandom(frasesDivorcio)
            .replace(/{from}/g, `@${onlyNum(userKey)}`)
            .replace(/{to}/g, `@${realNum}`);
        await m.reply(`💔 *DIVORCIO CONFIRMADO* 💔\n\n${frase}`, `Ahora están separados...`);
        await m.react("💔");
    }
};
