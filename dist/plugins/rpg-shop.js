const XP_PER_DIAMANTE = 750;
function onlyNum(v = '') {
    return String(v || '').replace(/[^0-9]/g, '');
}
export default {
    name: ["buy", "buyall"],
    help: ["buy <cantidad>", "buyall"],
    desc: "comprar ítems usando XP",
    tags: ["econ"],
    register: true,
    run: async ({ conn, m, args, cmd, prefijo }) => {
        const senderNum = onlyNum(m.sender);
        const res = await m.db.query("SELECT exp, limite FROM usuarios WHERE id = $1 OR lid = $2", [m.sender, m.lid || ""]);
        const user = res.rows[0];
        let count = 1;
        if (/all/i.test(cmd) || (args[0] && /all/i.test(args[0]))) {
            count = Math.floor(user.exp / XP_PER_DIAMANTE);
        }
        else {
            count = Number(args[0]) || 1;
        }
        count = Math.max(1, count);
        const totalCost = XP_PER_DIAMANTE * count;
        if (user.exp < totalCost) {
            return m.reply(`${m.e.warn} No tienes suficiente *XP*`, `Necesitas: ${totalCost.toLocaleString()} XP\nTienes:   ${user.exp.toLocaleString()} XP\n\nFaltan:   ${(totalCost - user.exp).toLocaleString()} XP`);
        }
        await m.db.query(`UPDATE usuarios 
       SET exp = exp - $1, 
           limite = limite + $2 
       WHERE id = $3 OR lid = $4`, [totalCost, count, m.sender, m.lid || ""]);
        await m.reply(`${m.e.ok} *COMPRA EXITOSA*`, `▢ Compraste: *${count}* ${m.e.currency_emoji} ${m.e.currency_name}\n▢ Gastaste:  *${totalCost.toLocaleString()}* XP\n▢ Ahora tienes: ${user.limite + count} ${m.e.currency_emoji}`);
    }
};
