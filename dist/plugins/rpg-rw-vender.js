const pendingSales = new Map();
const COOLDOWN_REPUBLICAR = 60 * 60 * 1000; // 1 hora
function calcMaxPrice(base, votes = 0) {
    if (votes === 0)
        return Math.round(base * 1.05);
    const maxAumento = 0.3;
    return Math.round(base * (1 + maxAumento * votes));
}
function calcMinPrice(base) {
    return Math.round(base * 0.95);
}
export default {
    name: ["vender", "rw-vender", "venderpersonaje"],
    help: ["vender <nombre personaje> <precio> [@tag]"],
    desc: "Vende un personaje que ya reclamaste (a alguien o al mercado)",
    tags: ["gacha"],
    register: true,
    run: async ({ conn, m, args, prefijo }) => {
        if (!m.db)
            return;
        try {
            const { rows: misPersonajes } = await m.db.query('SELECT * FROM characters WHERE claimed_by = $1', [m.sender]);
            if (misPersonajes.length === 0)
                return m.reply(`${m.e.warn} No tenés ningún personaje reclamado todavía.`);
            if (args.length < 2) {
                let lista = "Tus personajes:\n";
                misPersonajes.forEach((c, i) => {
                    lista += `${i + 1}. ${c.name} ─ ${c.price} exp\n`;
                });
                return m.reply(`${m.e.warn} Uso:\n• ${prefijo}vender <nombre> <precio> [@tag]\n• Sin @tag → lo ponés en el mercado general\n\n` + lista);
            }
            let who = m.mentionedJid?.[0] || m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || m.quoted?.sender || null;
            if (who && who.endsWith('@lid')) {
                const meta = await conn.groupMetadata(m.chat);
                const participant = meta.participants.find(p => p.lid === who || p.id === who);
                if (participant && participant.id) {
                    who = participant.id;
                }
                else {
                    const number = who.replace(/@lid$/, '');
                    who = number + '@s.whatsapp.net';
                }
            }
            let precio = NaN;
            let idxPrecio = -1;
            for (let i = args.length - 1; i >= 0; i--) {
                const arg = args[i];
                if (arg.startsWith('@') || (arg.length > 8 && /^\d+$/.test(arg.replace(/[^0-9]/g, '')))) {
                    continue;
                }
                const limpio = arg.replace(/[^0-9]/g, '');
                if (limpio) {
                    const num = parseInt(limpio);
                    if (!isNaN(num) && num > 0 && num < 100000000) { // límite razonable para precio
                        precio = num;
                        idxPrecio = i;
                        break;
                    }
                }
            }
            if (isNaN(precio) || precio <= 0)
                return m.reply(`${m.e.warn} Poné un precio válido (> 0)`);
            let nombreParts = args.slice(0, idxPrecio);
            if (who) {
                const idxAt = args.findIndex(a => a.startsWith('@'));
                if (idxAt !== -1 && idxAt < idxPrecio) {
                    nombreParts.splice(idxAt, 1);
                }
            }
            const nombrePersonaje = nombreParts.join(' ').trim().toLowerCase();
            if (!nombrePersonaje)
                return m.reply(`${m.e.warn} Decime el nombre del personaje boludo`);
            const personaje = misPersonajes.find(c => c.name.toLowerCase() === nombrePersonaje);
            if (!personaje)
                return m.reply(`${m.e.warn} No tenés ningún personaje llamado "${nombrePersonaje}"`);
            if (personaje.for_sale)
                return m.reply(`${m.e.warn} Ese personaje ya está en venta. Retiralo primero con /rf-retirar`);
            if (personaje.last_removed_time) {
                const tiempoPasado = Date.now() - personaje.last_removed_time;
                if (tiempoPasado < COOLDOWN_REPUBLICAR) {
                    const faltan = Math.ceil((COOLDOWN_REPUBLICAR - tiempoPasado) / 60000);
                    return m.reply(`${m.e.warn} Esperá ${faltan} minutos para volver a publicar a ${personaje.name}`);
                }
            }
            const minPrice = calcMinPrice(personaje.price);
            const maxPrice = calcMaxPrice(personaje.price, personaje.votes || 0);
            if (precio < minPrice)
                return m.reply(`${m.e.warn} Precio mínimo: ${minPrice} exp`);
            if (precio > maxPrice)
                return m.reply(`${m.e.warn} Precio máximo: ${maxPrice} exp`);
            if (who && who !== m.sender) {
                if (pendingSales.has(who)) {
                    return m.reply(`${m.e.warn} Ese usuario ya tiene oferta pendiente.`);
                }
                pendingSales.set(who, {
                    seller: m.sender,
                    buyer: who,
                    personaje,
                    precio,
                    timer: setTimeout(() => {
                        pendingSales.delete(who);
                        conn.sendMessage(m.chat, { text: `⏰ @${who.split('@')[0]} no respondió.`, mentions: [who] });
                    }, 60000)
                });
                return m.reply(`📜 @${who.split('@')[0]}, @${m.sender.split('@')[0]} te quiere vender *${personaje.name}* por ${precio} exp\n\nResponde: *aceptar* o *rechazar*`, { mentions: [who, m.sender] });
            }
            const precioAnterior = personaje.price;
            await m.db.query(`UPDATE characters SET price = $1, for_sale = true, seller = $2, previous_price = $3 WHERE id = $4`, [precio, m.sender, precioAnterior, personaje.id]);
            return m.reply(`✅ Pusiste *${personaje.name}* a la venta por ${precio} exp.`);
        }
        catch (err) {
            console.error("Error en /vender:", err);
            m.reply(`${m.e.error} Algo salió mal.`);
        }
    },
    before: async (m, { conn }) => {
        //before: async (m, conn) => {
        if (!m.db)
            return;
        const oferta = pendingSales.get(m.sender);
        if (!oferta)
            return;
        const texto = (m.originalText || "").toLowerCase().trim();
        if (texto === "aceptar") {
            const { seller, buyer, personaje, precio } = oferta;
            try {
                const { rows: [comprador] } = await m.db.query('SELECT exp FROM usuarios WHERE id = $1', [m.sender]);
                if (!comprador || comprador.exp < precio) {
                    clearTimeout(oferta.timer);
                    pendingSales.delete(m.sender);
                    return m.reply(`${m.e.warn} No tenés suficiente exp`);
                }
                const ganancia = Math.round(precio * 0.75);
                await m.db.query('UPDATE usuarios SET exp = exp - $1 WHERE id = $2', [precio, m.sender]);
                await m.db.query('UPDATE usuarios SET exp = exp + $1 WHERE id = $2', [ganancia, seller]);
                await m.db.query('UPDATE characters SET claimed_by = $1, price = $2, for_sale = false, seller = null WHERE id = $3', [m.sender, precio, personaje.id]);
                clearTimeout(oferta.timer);
                pendingSales.delete(m.sender);
                m.reply(`🎉 Compraste *${personaje.name}* por ${precio} exp`, { mentions: [seller] });
            }
            catch (err) {
                clearTimeout(oferta.timer);
                pendingSales.delete(m.sender);
                m.reply(`${m.e.error} Error en compra`);
            }
        }
        else if (texto === "rechazar") {
            clearTimeout(oferta.timer);
            pendingSales.delete(m.sender);
            m.reply(`Rechazaste la oferta`);
        }
    }
};
