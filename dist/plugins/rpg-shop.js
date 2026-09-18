// @ts-nocheck
import { getPriceMultiplier } from "../lib/rpg-utils.js";
const XP_PER_DIAMANTE = 950;
const SHOP_ITEMS = {
    seguro: {
        name: "🛡️ Seguro anti-robo",
        desc: "Protege tu banco de robos durante 24h",
        category: "rpg",
        currency: "limite",
        price: 450,
        stackable: true,
        effect: "seguro",
        duration: 24 * 60 * 60 * 1000,
    },
    guardian: {
        name: "👮 Guardián",
        desc: "Protege tu XP de .rob durante 12h",
        category: "rpg",
        currency: "limite",
        price: 100,
        stackable: true,
        effect: "guardian",
        duration: 12 * 60 * 60 * 1000,
    },
    seguro_total: {
        name: "🔐 Seguro total",
        desc: "Protege banco y XP durante 24h",
        category: "rpg",
        currency: "limite",
        price: 650,
        stackable: true,
        effect: "seguro_total",
        duration: 24 * 60 * 60 * 1000,
    },
    multiplicador: {
        name: "⚡ Boost x2 (1h)",
        desc: "Duplica tu XP durante 1h",
        category: "rpg",
        currency: "limite",
        price: 300,
        stackable: true,
        effect: "boost_xp",
        duration: 60 * 60 * 1000,
    },
    suerte: {
        name: "🍀 Poción de suerte",
        desc: "+20% de éxito en robos por 3 usos",
        category: "rpg",
        currency: "limite",
        price: 150,
        stackable: true,
        effect: "suerte",
        duration: 3,
    },
    // ===== COMIDAS =====  
    chocolate: {
        name: "🍫 Chocolate", desc: "+10 HP · +1 kg",
        category: "comida", currency: "limite", price: 3,
        stackable: true, hp_restore: 10, peso_delta: 1,
    },
    ensalada: {
        name: "🥗 Ensalada", desc: "+15 HP · -1 kg",
        category: "comida", currency: "limite", price: 3,
        stackable: true, hp_restore: 15, peso_delta: -1,
    },
    guisos: {
        name: "🍝 Guisos", desc: "+18 HP · +1 kg",
        category: "comida", currency: "limite", price: 5,
        stackable: true, hp_restore: 18, peso_delta: 1,
    },
    hamburguesa: {
        name: "🍔 Hamburguesa", desc: "+30 HP · +2 kg",
        category: "comida", currency: "limite", price: 7,
        stackable: true, hp_restore: 30, peso_delta: 2,
    },
    milanesa: {
        name: "🍗 Milanesa", desc: "+40 HP · +2 kg",
        category: "comida", currency: "limite", price: 15,
        stackable: true, hp_restore: 40, peso_delta: 2,
    },
    pizza: {
        name: "🍕 Pizza", desc: "+50 HP · +3 kg",
        category: "comida", currency: "limite", price: 25,
        stackable: true, hp_restore: 50, peso_delta: 3,
    },
    sushi: {
        name: "🍣 Sushi", desc: "+60 HP · +1 kg",
        category: "comida", currency: "limite", price: 50,
        stackable: true, hp_restore: 60, peso_delta: 1,
    },
    asado: {
        name: "🥩 Asado", desc: "+100 HP · +5 kg",
        category: "comida", currency: "limite", price: 80,
        stackable: true, hp_restore: 100, peso_delta: 5,
    },
    // ===== CURAS =====
    venda: {
        name: "🩹 Venda", desc: "+20 HP instantáneo",
        category: "cura", currency: "limite", price: 30,
        stackable: true, effect: "heal", heal_amount: 20,
    },
    inyeccion: {
        name: "💉 Inyección", desc: "+50 HP instantáneo",
        category: "cura", currency: "limite", price: 80,
        stackable: true, effect: "heal", heal_amount: 50,
    },
    pocion_medica: {
        name: "🧪 Poción médica", desc: "+100 HP instantáneo",
        category: "cura", currency: "limite", price: 150,
        stackable: true, effect: "heal", heal_amount: 100,
    },
    // ===== PICOS =====
    pico_piedra: {
        name: "🪨 Pico de piedra",
        desc: "+0,05% XP · -0% daño · 20 usos",
        category: "pico",
        currency: "limite",
        price: 10,
        stackable: true,
        bonus_xp: 0.05,
        reduce_daño: 0,
        durabilidad: 20,
    },
    pico_hierro: {
        name: "⛏️ Pico de hierro",
        desc: "+25% XP · -20% daño · 50 usos",
        category: "pico",
        currency: "limite",
        price: 50,
        stackable: true,
        bonus_xp: 0.25,
        reduce_daño: 0.20,
        durabilidad: 50,
    },
    pico_diamante: {
        name: "💎 Pico de diamante",
        desc: "+50% XP · -40% daño · 100 usos",
        category: "pico",
        currency: "limite",
        price: 350,
        stackable: true,
        bonus_xp: 0.50,
        reduce_daño: 0.40,
        durabilidad: 100,
    },
    pico_infernal: {
        name: "🔥 Pico infernal",
        desc: "+100% XP · -60% daño · 200 usos",
        category: "pico",
        currency: "limite",
        price: 1000,
        stackable: true,
        bonus_xp: 1.00,
        reduce_daño: 0.60,
        durabilidad: 200,
    },
    pico_celestial: {
        name: "⚡ Pico celestial",
        desc: "+200% XP · -80% daño · ∞ usos",
        category: "pico",
        currency: "limite",
        price: 3000,
        stackable: false,
        bonus_xp: 2.00,
        reduce_daño: 0.80,
        durabilidad: -1, // -1 = infinito
    },
    // ===== ARMAS DE CAZA (se gastan) =====
    arco_basico: {
        name: "🏹 Arco básico",
        desc: "+0% caza · 30 usos",
        category: "arma_caza",
        currency: "limite",
        price: 15,
        stackable: true,
        bonus_caza: 0,
        durabilidad: 30,
    },
    arco_cazador: {
        name: "🏹 Arco de cazador",
        desc: "+25% caza · 60 usos",
        category: "arma_caza",
        currency: "limite",
        price: 70,
        stackable: true,
        bonus_caza: 0.25,
        durabilidad: 60,
    },
    ballesta: {
        name: "🏹 Ballesta",
        desc: "+50% caza · 100 usos",
        category: "arma_caza",
        currency: "limite",
        price: 300,
        stackable: true,
        bonus_caza: 0.50,
        durabilidad: 100,
    },
    rifle_caza: {
        name: "🔫 Rifle de caza",
        desc: "+75% caza · 200 usos",
        category: "arma_caza",
        currency: "limite",
        price: 1300,
        stackable: true,
        bonus_caza: 0.75,
        durabilidad: 200,
    },
    // ===== MUNICIÓN =====
    flechas: {
        name: "🎯 Flechas",
        desc: "1 flecha por caza",
        category: "municion",
        currency: "limite",
        price: 3,
        stackable: true,
    },
    // ===== MASCOTAS DE CAZA (se equipan con .use) =====
    perro_cazador: {
        name: "🐕 Perro cazador",
        desc: "+10% caza",
        category: "mascota",
        currency: "limite",
        price: 30,
        stackable: false,
    },
    aguila: {
        name: "🦅 Águila",
        desc: "+20% caza",
        category: "mascota",
        currency: "limite",
        price: 50,
        stackable: false,
    },
    lobo_amaestrado: {
        name: "🐺 Lobo amaestrado",
        desc: "+30% caza",
        category: "mascota",
        currency: "limite",
        price: 300,
        stackable: false,
    },
    dragon_caza: {
        name: "🐉 Dragón de caza",
        desc: "+50% caza",
        category: "mascota",
        currency: "limite",
        price: 3000,
        stackable: false,
    },
    // ===== MASCOTAS NORMALES (van directo a `mascotas`) =====
    gato: {
        name: "🐱 Gato",
        desc: "+5% general",
        category: "mascota",
        currency: "limite",
        price: 5,
        stackable: false,
    },
    perro: {
        name: "🐶 Perro",
        desc: "+5% general",
        category: "mascota",
        currency: "limite",
        price: 10,
        stackable: false,
    },
    conejo: {
        name: "🐰 Conejo",
        desc: "+5% general",
        category: "mascota",
        currency: "limite",
        price: 30,
        stackable: false,
    },
    loro: {
        name: "🦜 Loro",
        desc: "+5% general",
        category: "mascota",
        currency: "limite",
        price: 50,
        stackable: false,
    },
    tortuga: {
        name: "🐢 Tortuga",
        desc: "-10% general (mala suerte)",
        category: "mascota",
        currency: "limite",
        price: 70,
        stackable: false,
    },
    serpiente: {
        name: "🐍 Serpiente",
        desc: "+10% general",
        category: "mascota",
        currency: "limite",
        price: 130,
        stackable: false,
    },
    // ===== CARNE CRUDA =====
    carne_conejo: { name: "🥩 Carne de conejo cruda", desc: "Cocinala antes de comer", category: "carne_cruda", currency: "limite", price: 0, stackable: true },
    carne_ardilla: { name: "🥩 Carne de ardilla cruda", desc: "Cocinala antes de comer", category: "carne_cruda", currency: "limite", price: 0, stackable: true },
    carne_pato: { name: "🥩 Carne de pato cruda", desc: "Cocinala antes de comer", category: "carne_cruda", currency: "limite", price: 0, stackable: true },
    carne_gallina: { name: "🥩 Carne de gallina cruda", desc: "Cocinala antes de comer", category: "carne_cruda", currency: "limite", price: 0, stackable: true },
    carne_zorro: { name: "🥩 Carne de zorro cruda", desc: "Cocinala antes de comer", category: "carne_cruda", currency: "limite", price: 0, stackable: true },
    carne_ciervo: { name: "🥩 Carne de ciervo cruda", desc: "Cocinala antes de comer", category: "carne_cruda", currency: "limite", price: 0, stackable: true },
    carne_jabali: { name: "🥩 Carne de jabalí cruda", desc: "Cocinala antes de comer", category: "carne_cruda", currency: "limite", price: 0, stackable: true },
    carne_lobo: { name: "🥩 Carne de lobo cruda", desc: "Cocinala antes de comer", category: "carne_cruda", currency: "limite", price: 0, stackable: true },
    carne_oso: { name: "🥩 Carne de oso cruda", desc: "Cocinala antes de comer", category: "carne_cruda", currency: "limite", price: 0, stackable: true },
    carne_leon: { name: "🥩 Carne de león cruda", desc: "Cocinala antes de comer", category: "carne_cruda", currency: "limite", price: 0, stackable: true },
    carne_unicornio: { name: "🥩 Carne de unicornio cruda", desc: "Cocinala antes de comer", category: "carne_cruda", currency: "limite", price: 0, stackable: true },
    carne_dragon: { name: "🥩 Carne de dragón cruda", desc: "Cocinala antes de comer", category: "carne_cruda", currency: "limite", price: 0, stackable: true },
    // ===== DROPS RAROS =====
    pelaje_lobo: { name: "🐺 Pelaje de lobo", desc: "Drop raro", category: "drop", currency: "limite", price: 0, stackable: true },
    garra_oso: { name: "🐾 Garra de oso", desc: "Drop raro", category: "drop", currency: "limite", price: 0, stackable: true },
    melena_leon: { name: "👑 Melena de león", desc: "Drop raro", category: "drop", currency: "limite", price: 0, stackable: true },
    cuerno_unicornio: { name: "🦄 Cuerno de unicornio", desc: "Drop raro", category: "drop", currency: "limite", price: 0, stackable: true },
    huevo_dragon: { name: "🥚 Huevo de dragón", desc: "Drop raro", category: "drop", currency: "limite", price: 0, stackable: true },
};
function fmt(n) {
    return Number(n || 0).toLocaleString("es-AR");
}
export default {
    name: ["buy", "buyall", "comprar", "shop", "tienda", "items"],
    help: ["buy", "shop"],
    desc: "Tienda y compra de diamantes/items",
    tags: ["econ"],
    register: true,
    run: async ({ conn, m, args, cmd, prefijo }) => {
        try {
            const cmdLower = (cmd || '').toLowerCase();
            const isShopView = ["shop", "tienda", "items"].includes(cmdLower) && args.length === 0;
            // ===== VER TIENDA =====
            if (isShopView) {
                const { rows: [user] } = await m.db.query("SELECT exp, limite, banco, salud, inventario, picos FROM usuarios WHERE id = $1 OR lid = $2", [m.sender, m.lid || ""]);
                if (!user)
                    return m.reply(null, "❌ No estás registrado.");
                const salud = Number(user.salud) || 100;
                const priceMult = getPriceMultiplier(salud);
                const emergencia = priceMult > 1.0;
                let list = `「 🛒 *TIENDA* 」\n\n`;
                list += `*═══ 💱 COMPRAR DIAMANTES ═══*\n`;
                list += `▢ *${m.e.currency_emoji} ${m.e.currency_name}* — ${fmt(XP_PER_DIAMANTE)} XP\n`;
                list += `👉 Usá: *${prefijo}buy <cantidad>*\n`;
                list += `👉 O: *${prefijo}buy all* / *${prefijo}buyall*\n`;
                // ÍTEMS RPG
                list += `\n*═══ 🎮 ÍTEMS RPG ═══*\n`;
                for (const [key, item] of Object.entries(SHOP_ITEMS)) {
                    if (item.category !== "rpg")
                        continue;
                    list += `▢ *${item.name}* — ${fmt(item.price)} ${m.e.currency_emoji}\n`;
                    list += `🆔 \`${key}\` · ${item.desc}\n`;
                }
                // COMIDAS
                list += `\n*═══ 🍔 COMIDAS ═══*\n`;
                for (const [key, item] of Object.entries(SHOP_ITEMS)) {
                    if (item.category !== "comida")
                        continue;
                    const finalPrice = Math.ceil(item.price * priceMult);
                    const priceStr = emergencia
                        ? `~${item.price}~ *${finalPrice}* ${m.e.currency_emoji}`
                        : `${item.price} ${m.e.currency_emoji}`;
                    list += `▢ *${item.name}* — ${priceStr}\n`;
                    list += `🆔 \`${key}\` · ${item.desc}\n`;
                }
                // CURAS
                list += `\n*═══ 💊 CURAS ═══*\n`;
                for (const [key, item] of Object.entries(SHOP_ITEMS)) {
                    if (item.category !== "cura")
                        continue;
                    const finalPrice = Math.ceil(item.price * priceMult);
                    const priceStr = emergencia
                        ? `~${item.price}~ *${finalPrice}* ${m.e.currency_emoji}`
                        : `${item.price} ${m.e.currency_emoji}`;
                    list += `▢ *${item.name}* — ${priceStr}\n`;
                    list += `🆔 \`${key}\` · ${item.desc}\n`;
                }
                // PICOS
                list += `\n*═══ ⛏️ PICOS ═══*\n`;
                for (const [key, item] of Object.entries(SHOP_ITEMS)) {
                    if (item.category !== "pico")
                        continue;
                    list += `▢ *${item.name}* — ${fmt(item.price)} ${m.e.currency_emoji}\n`;
                    list += `🆔 \`${key}\` · ${item.desc}\n`;
                }
                // ARMAS DE CAZA
                list += `\n*═══ 🏹 ARMAS DE CAZA ═══*\n`;
                for (const [key, item] of Object.entries(SHOP_ITEMS)) {
                    if (item.category !== "arma_caza")
                        continue;
                    list += `▢ *${item.name}* — ${fmt(item.price)} ${m.e.currency_emoji}\n`;
                    list += `🆔 \`${key}\` · ${item.desc}\n`;
                }
                // MUNICIÓN
                list += `\n*═══ 🎯 MUNICIÓN ═══*\n`;
                for (const [key, item] of Object.entries(SHOP_ITEMS)) {
                    if (item.category !== "municion")
                        continue;
                    list += `▢ *${item.name}* — ${fmt(item.price)} ${m.e.currency_emoji}\n`;
                    list += `🆔 \`${key}\` · ${item.desc}\n`;
                }
                // MASCOTAS
                list += `\n*═══ 🐾 MASCOTAS ═══*\n`;
                for (const [key, item] of Object.entries(SHOP_ITEMS)) {
                    if (item.category !== "mascota")
                        continue;
                    list += `▢ *${item.name}* — ${fmt(item.price)} ${m.e.currency_emoji}\n`;
                    list += `🆔 \`${key}\` · ${item.desc}\n`;
                }
                list += `\n\n💼 *Tu cartera:*\n`;
                list += `▢ ❤️ Salud: ${salud}/100\n`;
                list += `▢ ⭐ XP: ${fmt(user.exp)}\n`;
                list += `▢ ${m.e.currency_emoji} ${m.e.currency_name}: ${fmt(user.limite)}\n`;
                list += `▢ 🏦 Banco: ${fmt(user.banco)}\n\n`;
                if (emergencia) {
                    list += `⚠️ *Los precios al subidos un (×${priceMult})*\n`;
                }
                list += `👉 Comprar diamantes: *${prefijo}buy <cantidad>*\n`;
                list += `👉 Comprar ítem: *${prefijo}shop <item>*`;
                return m.reply(null, list);
            }
            // ===== COMPRAR =====
            const isBuyAll = cmdLower === "buyall";
            const firstArg = (args[0] || "").toLowerCase();
            const secondArg = (args[1] || "").toLowerCase();
            const item = SHOP_ITEMS[firstArg]; // si existe en el catálogo
            const isDiamanteBuy = !item || isBuyAll || firstArg === "all" || firstArg === "" || /^\d+$/.test(firstArg);
            // ===== COMPRA DE DIAMANTES =====
            if (isDiamanteBuy) {
                const { rows: [user] } = await m.db.query("SELECT exp, limite FROM usuarios WHERE id = $1 OR lid = $2", [m.sender, m.lid || ""]);
                if (!user)
                    return m.reply(null, "❌ No estás registrado.");
                const exp = Number(user.exp) || 0;
                const limiteActual = Number(user.limite) || 0;
                let count = 0;
                if (isBuyAll || firstArg === "all") {
                    count = Math.floor(exp / XP_PER_DIAMANTE);
                    if (count < 1) {
                        return m.reply(`${m.e.warn} No tenés suficiente *XP*`, `▢ Necesitás: *${fmt(XP_PER_DIAMANTE)}* XP\n▢ Tenés: *${fmt(exp)}* XP\n▢ Faltan: ${fmt(XP_PER_DIAMANTE - exp)} XP`);
                    }
                }
                else if (firstArg === "") {
                    count = 1;
                }
                else {
                    count = Number(firstArg);
                    if (isNaN(count) || count < 1) {
                        return m.reply(`⚠️ Poné una cantidad válida mayor a 0`, `\n📌 Ejemplo: *${prefijo}buy 5*`);
                    }
                }
                const totalCost = XP_PER_DIAMANTE * count;
                if (exp < totalCost) {
                    return m.reply(`${m.e.warn} No tenés suficiente *XP*`, `▢ Necesitás: *${fmt(totalCost)}* XP\n▢ Tenés: *${fmt(exp)}* XP\n▢ Faltan:    *${fmt(totalCost - exp)}* XP`);
                }
                // Ejecutar conversión
                await m.db.query(`UPDATE usuarios 
           SET exp = exp - $1,
               limite = limite + $2
           WHERE id = $3 OR lid = $3`, [totalCost, count, m.sender]);
                // Reacción
                if (count >= 10) {
                    await m.react("🤑");
                }
                else if (count >= 5) {
                    await m.react("💰");
                }
                else {
                    await m.react("💎");
                }
                let confirmMsg = `${m.e.ok} *COMPRA EXITOSA*\n\n`;
                confirmMsg += `▢ Compraste: ${count} ${m.e.currency_emoji} ${m.e.currency_name}\n`;
                confirmMsg += `▢ Gastaste: ${fmt(totalCost)} XP\n`;
                confirmMsg += `▢ Ahora tenés: *${fmt(limiteActual + count)}* ${m.e.currency_emoji}`;
                return m.reply(null, confirmMsg);
            }
            // ===== COMPRA DE ÍTEM =====
            const { rows: [user] } = await m.db.query("SELECT exp, limite, banco, salud, inventario, picos FROM usuarios WHERE id = $1 OR lid = $2", [m.sender, m.lid || ""]);
            if (!user)
                return m.reply(null, "❌ No estás registrado.");
            const salud = Number(user.salud) || 100;
            const priceMult = getPriceMultiplier(salud);
            const finalPrice = Math.ceil(item.price * priceMult);
            const walletField = item.currency === "exp" ? "exp" : "limite";
            const walletBalance = Number(user[walletField]) || 0;
            const currencyLabel = item.currency === "exp" ? "XP" : `${m.e.currency_emoji} ${m.e.currency_name}`;
            // Calcular cantidad
            let count = 1;
            if (secondArg === "all" || isBuyAll) {
                count = Math.floor(walletBalance / finalPrice);
                if (count < 1) {
                    return m.reply(null, `❌ No tenés suficiente ${currencyLabel} para comprar ni 1`);
                }
            }
            else if (secondArg) {
                count = Number(secondArg);
                if (isNaN(count) || count < 1) {
                    return m.reply(null, `⚠️ Poné una cantidad válida mayor a 0`);
                }
            }
            const totalCost = finalPrice * count;
            if (walletBalance < totalCost) {
                return m.reply(`${m.e.warn} No tenés suficiente *${currencyLabel}*`, `▢ Necesitás: *${fmt(totalCost)}* ${currencyLabel}\n▢ Tenés:     *${fmt(walletBalance)}* ${currencyLabel}\n▢ Faltan:    *${fmt(totalCost - walletBalance)}* ${currencyLabel}`);
            }
            // ===== SI ES PICO → VA A `picos` =====
            if (item.category === "pico") {
                const picos = user.picos || {};
                if (!picos[firstArg])
                    picos[firstArg] = [];
                const usosInit = item.durabilidad === -1 ? 0 : item.durabilidad;
                for (let i = 0; i < count; i++) {
                    picos[firstArg].push({ usos: usosInit });
                }
                await m.db.query(`UPDATE usuarios 
           SET ${walletField} = ${walletField} - $1,
               picos = $2::jsonb
           WHERE id = $3 OR lid = $3`, [totalCost, JSON.stringify(picos), m.sender]);
                let confirmMsg = `${m.e.ok} *COMPRA EXITOSA*\n\n`;
                confirmMsg += `▢ Pico: *${item.name}*\n`;
                confirmMsg += `▢ Cantidad: *${count}*\n`;
                confirmMsg += `▢ Gastaste: *${fmt(totalCost)}* ${currencyLabel}\n`;
                confirmMsg += `▢ Ahora tenés: *${picos[firstArg].length}* en tu arsenal\n\n`;
                confirmMsg += `👉 Equipalo con: *${prefijo}use ${firstArg}*`;
                return m.reply(null, confirmMsg);
            }
            // ===== SI ES ARMA DE CAZA → VA A `armas_caza` =====
            if (item.category === "arma_caza") {
                const armas = user.armas_caza || {};
                if (!armas[firstArg])
                    armas[firstArg] = [];
                const usosInit = item.durabilidad || 30;
                for (let i = 0; i < count; i++) {
                    armas[firstArg].push({ usos: usosInit });
                }
                await m.db.query(`UPDATE usuarios 
     SET ${walletField} = ${walletField} - $1,
         armas_caza = $2::jsonb
     WHERE id = $3 OR lid = $3`, [totalCost, JSON.stringify(armas), m.sender]);
                let confirmMsg = `${m.e.ok} *COMPRA EXITOSA*\n\n`;
                confirmMsg += `▢ Arma: *${item.name}*\n`;
                confirmMsg += `▢ Cantidad: *${count}*\n`;
                confirmMsg += `▢ Gastaste: *${fmt(totalCost)}* ${currencyLabel}\n`;
                confirmMsg += `▢ Ahora tenés: *${armas[firstArg].length}* en tu arsenal\n\n`;
                confirmMsg += `👉 Equipala con: *${prefijo}use ${firstArg}*`;
                return m.reply(null, confirmMsg);
            }
            // ===== SI ES MASCOTA NORMAL → VA DIRECTO A `mascotas` =====
            const MASCOTAS_NORMALES = ["gato", "perro", "conejo", "loro", "tortuga", "serpiente"];
            if (item.category === "mascota" && MASCOTAS_NORMALES.includes(firstArg)) {
                const mascotas = Array.isArray(user.mascotas) ? user.mascotas : [];
                // Verificar si ya la tiene
                const yaLaTiene = mascotas.some(m => {
                    const key = typeof m === "string" ? m : m.key;
                    return key === firstArg;
                });
                if (yaLaTiene) {
                    return m.reply(null, `⚠️ Ya tenés a *${item.name}*`);
                }
                // Agregar directo
                for (let i = 0; i < count; i++) {
                    mascotas.push({
                        key: firstArg,
                        hp: 100,
                        last_feed: Date.now()
                    });
                }
                await m.db.query(`UPDATE usuarios 
     SET ${walletField} = ${walletField} - $1,
         mascotas = $2::jsonb
     WHERE id = $3 OR lid = $3`, [totalCost, JSON.stringify(mascotas), m.sender]);
                let confirmMsg = `${m.e.ok} *COMPRA EXITOSA*\n\n`;
                confirmMsg += `▢ Mascota: *${item.name}*\n`;
                confirmMsg += `▢ Cantidad: *${count}*\n`;
                confirmMsg += `▢ Gastaste: *${fmt(totalCost)}* ${currencyLabel}\n\n`;
                confirmMsg += `🐾 *¡Ya está contigo!*\n`;
                confirmMsg += `👉 Verla: *${prefijo}mascotas*`;
                return m.reply(null, confirmMsg);
            }
            // ===== RESTO DE ITEMS → VAN AL INVENTARIO =====
            const inventario = user.inventario || {};
            inventario[firstArg] = (inventario[firstArg] || 0) + count;
            await m.db.query(`UPDATE usuarios 
   SET ${walletField} = ${walletField} - $1,
       inventario = $2::jsonb
   WHERE id = $3 OR lid = $3`, [totalCost, JSON.stringify(inventario), m.sender]);
            let confirmMsg = `${m.e.ok} *COMPRA EXITOSA*\n\n`;
            confirmMsg += `▢ Ítem: *${item.name}*\n`;
            confirmMsg += `▢ Cantidad: *${count}*\n`;
            confirmMsg += `▢ Gastaste: *${fmt(totalCost)}* ${currencyLabel}\n`;
            confirmMsg += `▢ Ahora tenés: *${inventario[firstArg]}* en inventario\n\n`;
            // 🔥 Detectar cómo se usa según categoría
            if (item.category === "comida") {
                confirmMsg += `👉 Comélo con: *${prefijo}comer ${firstArg}*`;
            }
            else if (item.category === "cura") {
                confirmMsg += `👉 Usalo con: *${prefijo}use ${firstArg}*`;
            }
            else if (item.category === "rpg") {
                confirmMsg += `👉 Usalo con: *${prefijo}use ${firstArg}*`;
            }
            else if (item.category === "carne_cruda") {
                confirmMsg += `👉 Cociñalo con: *${prefijo}cocinar ${firstArg}*`;
            }
            else if (item.category === "mascota") {
                confirmMsg += `👉 Llegarlo contigo con: *${prefijo}use ${firstArg}*`;
            }
            else if (item.category === "municion") {
                confirmMsg += `🎯 _Ya Equipada_`;
                //} else if (item.category === "drop") {
                // confirmMsg += `🎁 _Item raro, no usable por ahora_`
            }
            else {
                confirmMsg += `👉 Usalo con: *${prefijo}use ${firstArg}*`;
            }
            return m.reply(null, confirmMsg);
        }
        catch (err) {
            console.error("shop error:", err);
            await m.react("🚨");
            m.reply(`❌ Error en la tienda: ${err.message || err}`);
        }
    }
};
