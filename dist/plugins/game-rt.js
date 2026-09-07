// plugins/game-rt.ts
const cooldown = 30_000; // 30 segundos
function msToTime(duration) {
    if (isNaN(duration) || duration <= 0)
        return '0s';
    const totalSeconds = Math.floor(duration / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes > 0 ? minutes + 'm ' : ''}${seconds}s`;
}
function formatExp(amount) {
    if (amount >= 1000)
        return `${(amount / 1000).toFixed(1)}k (${amount.toLocaleString()})`;
    return amount.toLocaleString();
}
function getRandomColor() {
    const random = Math.random() * 100;
    if (random < 47.5)
        return 'red';
    if (random < 95)
        return 'black';
    return 'green';
}
export default {
    name: ["rt", "ruleta"],
    help: ["rt <color> <cantidad>"],
    desc: "Jugar a la ruleta rusa con XP",
    tags: ["game"],
    register: true,
    run: async ({ conn, m, args, cmd, prefijo }) => {
        const now = Date.now();
        const res = await m.db.query('SELECT exp, wait FROM usuarios WHERE id = $1 OR lid = $1', [m.sender]);
        const user = res.rows[0];
        const lastWait = Number(user?.wait) || 0;
        const remaining = lastWait + cooldown - now;
        // ✅ COOLDOWN con fakeReply
        if (remaining > 0) {
            return conn.fakeReply(m.chat, `*🕓 Calma crack 🤚, Espera ${msToTime(remaining)} antes de volver a usar el comando*`, m.sender, 'ᴺᵒ ʰᵃᵍᵃⁿ ˢᵖᵃᵐ', 'status@broadcast');
        }
        if (args.length < 2) {
            return m.reply(`⚠️ Formato incorrecto. Usa: ${prefijo + cmd} <color> <cantidad>`, `Ejemplo: ${prefijo + cmd} black 100`);
        }
        const color = args[0].toLowerCase();
        const betAmount = parseInt(args[1]);
        if (!['red', 'black', 'green'].includes(color)) {
            return m.reply(null, '🎯 Color no válido. Usa: "red", "black" o "green".');
        }
        if (isNaN(betAmount) || betAmount <= 0) {
            return m.reply(null, '❌ La cantidad debe ser un número positivo.');
        }
        if (user.exp < betAmount) {
            return m.reply(`❌ No tienes suficiente XP para apostar.`, `Tienes *${formatExp(user.exp)} XP*`);
        }
        const resultColor = getRandomColor();
        const isWin = resultColor === color;
        let winAmount = 0;
        if (isWin) {
            winAmount = color === 'green' ? betAmount * 14 : betAmount * 2;
        }
        const newExp = user.exp - betAmount + winAmount;
        await m.db.query(`UPDATE usuarios SET exp = $1, wait = $2 WHERE id = $3 OR lid = $3`, [newExp, now, m.sender]);
        const emoji = {
            red: '🔴',
            black: '⚫',
            green: '🟢'
        };
        return m.reply(`😱 La ruleta cayó en *${emoji[resultColor]} ${resultColor.toUpperCase()}*`, `${isWin ? `🎉 ¡Ganaste *${formatExp(winAmount)} XP*!` : `💀 Perdiste *${formatExp(betAmount)} XP*`}\n\n▢ *XP Actual:* ${formatExp(newExp)}`);
    }
};
