export default {
    name: ["rw-retirar", "rf-retirar"],
    help: ["rw-retirar <nombre personaje>"],
    desc: "Retira un personaje del mercado",
    tags: ["gacha"],
    register: true,
    run: async ({ conn, m, args }) => {
        if (!m.db)
            return;
        const nombre = args.join(" ").trim().toLowerCase();
        if (!nombre)
            return m.reply(`${m.e.warn} Decime el nombre del personaje a retirar`);
        try {
            const { rows } = await m.db.query(`SELECT * FROM characters WHERE claimed_by = $1`, [m.sender]);
            if (!rows.length)
                return m.reply(`${m.e.warn} No tenés personajes reclamados`);
            const personaje = rows.find(c => c.name.toLowerCase() === nombre);
            if (!personaje)
                return m.reply(`${m.e.warn} No tenés ningún personaje llamado "${nombre}"`);
            if (!personaje.for_sale)
                return m.reply(`${m.e.warn} Ese personaje no está en venta`);
            await m.db.query(`UPDATE characters 
         SET for_sale = false,
             seller = NULL,
             last_removed_time = $1
         WHERE id = $2`, [Date.now(), personaje.id]);
            return m.reply(`✅ Retiraste *${personaje.name}* del mercado`);
        }
        catch (err) {
            console.error("Error en rw-retirar:", err);
            return m.reply(`${m.e.error} Error al retirar el personaje`);
        }
    }
};
