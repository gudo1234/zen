export default {
    name: ["dep", "depositar", "d", "ret", "retirar", "toremove"],
    help: ["dep <cantidad>", "dep all", "ret <cantidad>", "ret all"],
    desc: "depositar o retirar monedas entre tu balance y el banco",
    tags: ["econ"],
    register: true,
    run: async ({ conn, m, args, cmd, prefijo }) => {
        const res = await m.db.query("SELECT limite, banco FROM usuarios WHERE id = $1 OR lid = $2", [m.sender, m.lid || ""]);
        const user = res.rows[0];
        const diamantes = Number(user.limite ?? 0);
        const banco = Number(user.banco ?? 0);
        // ←←← ESTA ES LA LÍNEA QUE FALLABA
        const cmdLower = (cmd || '').toLowerCase();
        const isDep = ["dep", "depositar", "d"].includes(cmdLower);
        const isAll = args[0] && /all/i.test(args[0]);
        let amount = 0;
        if (isAll) {
            amount = isDep ? diamantes : banco;
        }
        else {
            if (!args[0]) {
                return m.reply(null, `${m.e.warn} Ingresa una cantidad o usa *${prefijo}${cmd || 'dep'} all*`);
            }
            amount = Number(args[0]);
            if (isNaN(amount) || amount < 1) {
                return m.reply(null, `${m.e.warn} Pon un número válido mayor a 0`);
            }
        }
        if (isDep) {
            if (diamantes < amount) {
                return m.reply(`${m.e.warn} No tenés ni ${amount} ${m.e.currency_name} en la cartera.`, `Tienes: ${diamantes}`);
            }
            await m.db.query("UPDATE usuarios SET limite = limite - $1, banco = banco + $1 WHERE id = $2 OR lid = $3", [amount, m.sender, m.lid || ""]);
            return m.reply(`${m.e.ok} Depositaste ${amount} ${m.e.currency_emoji} al banco.`, `Ahora: ${diamantes - amount} cartera / ${banco + amount} banco`);
        }
        else { // retirar
            if (banco < amount) {
                return m.reply(`${m.e.warn} No tenés ni ${amount} en el banco.`, `Saldo banco: ${banco}`);
            }
            await m.db.query("UPDATE usuarios SET banco = banco - $1, limite = limite + $1 WHERE id = $2 OR lid = $3", [amount, m.sender, m.lid || ""]);
            return m.reply(`${m.e.ok} Retiraste ${amount} ${m.e.currency_emoji} del banco.`, `Ahora: ${diamantes + amount} cartera / ${banco - amount} banco`);
        }
    }
};
