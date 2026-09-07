const COOLDOWN = 10 * 60 * 1000; // 10 minutos
const frasesExito = [
    "⛏️ *¡Excelente mina!* Has minado",
    "💎 *¡Encontraste una veta de diamantes!* Obtienes",
    "🌟 *¡Minero profesional!* Has extraído",
    "🪨 *¡La roca se rompió!* Has sacado",
    "🔥 *¡Minando a lo grande!* Consigues",
    "💰 *¡La fortuna te sonríe!* Has minado",
    "🎯 *¡Tiro perfecto al mineral!* Has ganado",
    "🏆 *¡Récord de minería!* Has obtenido",
    "⚡ *¡La mina está activa!* Conseguiste",
    "💪 *¡Esfuerzo recompensado!* Has minado",
    "✨ *¡Los duendes de la mina te bendicen!* Obtienes",
    "🎲 *¡Suerte de principiante!* Has extraído",
    "🔨 *¡Martillazo maestro!* Has sacado",
    "🌈 *¡Arcoíris mineral!* Has minado",
    "🎊 *¡Jackpot de la mina!* Obtienes",
    "🏅 *¡Minero del mes!* Has extraído",
    "⭐ *¡Estrella de la minería!* Consigues",
    "🚀 *¡A toda máquina!* Has minado",
    "🎵 *¡La canción de los mineros!* Obtienes",
    "🍀 *¡Trébol de cuatro hojas mineral!* Has minado",
];
const frasesFracaso = [
    "😤 *¡La mina se derrumbó!* Solo sacaste",
    "💀 *¡Los minerales se escondieron!* Obtienes",
    "😅 *¡Vaya, no fue tu mejor día!* Solo minaste",
    "🤡 *¡El pico se rompió!* Conseguiste",
    "😢 *¡Mala suerte en la mina!* Obtienes",
    "🥴 *¡Te diste un golpe con el pico!* Has minado",
];
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
export default {
    name: ["minar", "miming", "mine"],
    help: ["minar"],
    desc: "Minar XP y ganar recompensas",
    tags: ["econ"],
    register: true,
    run: async ({ conn, m }) => {
        try {
            const now = Date.now();
            const { rows: [user] } = await m.db.query("SELECT exp, lastmiming FROM usuarios WHERE id = $1 OR lid = $2", [m.sender, m.lid || ""]);
            const last = Number(user.lastmiming) || 0;
            const cd = last + COOLDOWN - now;
            if (cd > 0) {
                const min = Math.floor(cd / 60000);
                const seg = Math.floor((cd % 60000) / 1000);
                const tiempo = min > 0 ? `${min}m ${seg}s` : `${seg}s`;
                return m.reply(null, `⏳ *Esperá ${tiempo} para volver a minar, vago* ⛏️`);
            }
            // ===== EVENTOS =====
            const eventType = Math.random();
            let xp = 0;
            let texto = "";
            let esFracaso = false;
            // ===== 1. MINA NORMAL (60%) =====
            if (eventType < 0.60) {
                xp = getRandomInt(500, 5000);
                texto = `${pickRandom(frasesExito)} *${xp.toLocaleString("es-AR")}* XP`;
                // 15% de chance de mina rica (bonus extra)
                if (Math.random() < 0.15) {
                    const bonus = getRandomInt(100, 5000);
                    xp += bonus;
                    texto = `💎 *¡MINA RICA!* ${pickRandom(frasesExito)} *${xp.toLocaleString("es-AR")}* XP\n\n🎁 *¡Bonus!* +${bonus.toLocaleString("es-AR")} XP extra`;
                }
                await m.db.query("UPDATE usuarios SET exp = exp + $1, lastmiming = $2 WHERE id = $3 OR lid = $3", [xp, now, m.sender]);
            }
            // ===== 2. FRACASO (20%) =====
            else if (eventType < 0.80) {
                xp = getRandomInt(50, 500);
                esFracaso = true;
                texto = `${pickRandom(frasesFracaso)} *${xp.toLocaleString("es-AR")}* XP`;
                await m.db.query("UPDATE usuarios SET exp = exp + $1, lastmiming = $2 WHERE id = $3 OR lid = $3", [xp, now, m.sender]);
            }
            // ===== 3. MINA SECRETA (15%) =====
            else if (eventType < 0.95) {
                xp = getRandomInt(8000, 20000);
                texto = `🕵️‍♂️ *¡ENCONTRASTE UNA MINA SECRETA!* 🤯\n${pickRandom(frasesExito)} *${xp.toLocaleString("es-AR")}* XP`;
                await m.db.query("UPDATE usuarios SET exp = exp + $1, lastmiming = $2 WHERE id = $3 OR lid = $3", [xp, now, m.sender]);
            }
            // ===== 4. JACKPOT (5%) =====
            else {
                xp = getRandomInt(25000, 50000);
                texto = `🎰 *¡JACKPOT MINERO!* 💰💰💰\n${pickRandom(frasesExito)} *${xp.toLocaleString("es-AR")}* XP\n\n⭐ *¡ERES UN MINERO LEGENDARIO!* ⭐`;
                await m.db.query("UPDATE usuarios SET exp = exp + $1, lastmiming = $2 WHERE id = $3 OR lid = $3", [xp, now, m.sender]);
            }
            await m.reply(null, texto);
            // ===== REACCIONES =====
            if (xp >= 25000) {
                await m.react("🎰");
            }
            else if (xp >= 8000) {
                await m.react("🕵️");
            }
            else if (xp >= 5000) {
                await m.react("💎");
            }
            else if (xp >= 1000) {
                await m.react("⛏️");
            }
            else if (esFracaso) {
                await m.react("😅");
            }
            else {
                await m.react("✅");
            }
        }
        catch (err) {
            console.error("minar error:", err);
            m.reply("❌ Ocurrió un error al minar.");
            await m.react("🚨");
        }
    }
};
