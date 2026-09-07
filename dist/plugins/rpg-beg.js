const COOLDOWN = 5 * 60 * 1000; // 5 minutos
const mensajesExito = [
    "🍞 Un alma caritativa te dio",
    "💰 Alguien se apiadó de ti y te dio",
    "😢 Una señora te vio y te regaló",
    "🎁 Un desconocido generoso te dio",
    "🤲 La gente del grupo se compadeció y te dio",
    "🪙 Encontraste una moneda en el piso, son",
    "🍀 Un niño te dio su merienda, son",
    "💸 Un millonario te tiró",
    "🥺 Tu cara de pobre te consiguió",
    "🎊 Es tu día de suerte, recibiste",
];
const mensajesFracaso = [
    "😤 Te ignoraron, no recibiste nada",
    "🤡 Un policía te corrió, perdiste",
    "😅 La gente se rió de ti, ganaste",
    "👮‍♂️ Te arrestaron por mendigar, multa de",
    "💀 Un perro te persiguió, perdiste",
    "😭 Nadie te dio nada, solo",
];
const mensajesEspeciales = [
    "👑 *¡UN REY TE VIO!* Te dio",
    "⭐ *¡UNA CELEBRIDAD!* Te firmó un autógrafo y te dio",
    "🌈 *¡ARCOÍRIS DE LA SUERTE!* Encontraste",
    "🎰 *¡JACKPOT DE MENDIGO!* Te dieron",
];
export default {
    name: ["beg", "mendigar", "pedir"],
    help: ["beg"],
    desc: "Pide limosna para ganar XP",
    tags: ["econ"],
    register: true,
    run: async ({ conn, m }) => {
        try {
            const now = Date.now();
            const { rows: [user] } = await m.db.query("SELECT exp, lastbeg FROM usuarios WHERE id = $1 OR lid = $2", [m.sender, m.lid || ""]);
            // ===== COOLDOWN =====
            const last = Number(user.lastclaim) || 0;
            const cd = last + COOLDOWN - now;
            if (cd > 0) {
                const min = Math.floor(cd / 60000);
                const seg = Math.floor((cd % 60000) / 1000);
                const tiempo = min > 0 ? `${min}m ${seg}s` : `${seg}s`;
                return m.reply(null, `⏳ *Esperá ${tiempo} para volver a mendigar, vago*`);
            }
            // ===== EVENTOS =====
            const eventType = Math.random();
            let texto = "";
            let xpGanado = 0;
            let esFracaso = false;
            // ===== 1. ÉXITO (60%) =====
            if (eventType < 0.60) {
                const xp = Math.floor(Math.random() * 3000) + 100; // 100-3000 XP
                xpGanado = xp;
                // 10% de chance de evento especial
                if (Math.random() < 0.10) {
                    const bonusXp = Math.floor(Math.random() * 5000) + 1000;
                    xpGanado += bonusXp;
                    texto = `${pickRandom(mensajesEspeciales)} *${xpGanado.toLocaleString("es-AR")} XP*\n\n🎁 *¡BONUS!* +${bonusXp.toLocaleString("es-AR")} XP extra`;
                }
                else {
                    texto = `${pickRandom(mensajesExito)} *${xpGanado.toLocaleString("es-AR")} XP*`;
                }
                await m.db.query("UPDATE usuarios SET exp = exp + $1, lastbeg = $2 WHERE id = $3 OR lid = $3", [xpGanado, now, m.sender]);
            }
            // ===== 2. FRACASO (30%) =====
            else if (eventType < 0.90) {
                const perdida = Math.floor(Math.random() * 500) + 50; // 50-500 XP
                xpGanado = -perdida;
                esFracaso = true;
                texto = `${pickRandom(mensajesFracaso)} *${perdida.toLocaleString("es-AR")} XP*`;
                await m.db.query("UPDATE usuarios SET exp = GREATEST(exp - $1, 0), lastbeg = $2 WHERE id = $3 OR lid = $3", [perdida, now, m.sender]);
            }
            // ===== 3. MENDIGO PROFESIONAL (10%) =====
            else {
                const xp = Math.floor(Math.random() * 8000) + 2000; // 2000-10000 XP
                xpGanado = xp;
                texto = `🎩 *¡MENDIGO PROFESIONAL!* 🎩\nTe dieron *${xpGanado.toLocaleString("es-AR")} XP*\n\n🌟 *¡Eres un artista de la mendicidad!*`;
                await m.db.query("UPDATE usuarios SET exp = exp + $1, lastbeg = $2 WHERE id = $3 OR lid = $3", [xpGanado, now, m.sender]);
            }
            await m.reply(null, texto);
            // ===== REACCIONES =====
            if (xpGanado > 5000) {
                await m.react("🎩");
            }
            else if (xpGanado > 1000) {
                await m.react("🤑");
            }
            else if (xpGanado > 0) {
                await m.react("😊");
            }
            else if (esFracaso) {
                await m.react("😢");
            }
        }
        catch (err) {
            console.error("beg error:", err);
            m.reply("❌ Ocurrió un error al mendigar.");
            await m.react("🚨");
        }
    }
};
/* ========= UTILS ========= */
function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}
