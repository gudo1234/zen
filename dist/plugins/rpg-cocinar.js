// @ts-nocheck
import { db } from "../lib/db.js";
const COOLDOWN = 30 * 1000; // 30 segundos entre cocciones
// ===== CARNES =====
const CARNES = {
    carne_conejo: {
        name: "🥩 Carne de conejo",
        cocida: "carne_conejo_cocida",
        mal_cocida: "carne_conejo_mal_cocida",
        hp: 15,
        peso: 2,
        hp_mal: 5,
        peso_mal: 1,
    },
    carne_ardilla: {
        name: "🥩 Carne de ardilla",
        cocida: "carne_ardilla_cocida",
        mal_cocida: "carne_ardilla_mal_cocida",
        hp: 10,
        peso: 1,
        hp_mal: 4,
        peso_mal: 1,
    },
    carne_pato: {
        name: "🥩 Carne de pato",
        cocida: "carne_pato_cocida",
        mal_cocida: "carne_pato_mal_cocida",
        hp: 20,
        peso: 2,
        hp_mal: 6,
        peso_mal: 1,
    },
    carne_gallina: {
        name: "🥩 Carne de gallina",
        cocida: "carne_gallina_cocida",
        mal_cocida: "carne_gallina_mal_cocida",
        hp: 18,
        peso: 2,
        hp_mal: 5,
        peso_mal: 1,
    },
    carne_cerdo: {
        name: "🥩 Carne de cerdo",
        cocida: "carne_cerdo_cocida",
        mal_cocida: "carne_cerdo_mal_cocida",
        hp: 35,
        peso: 3,
        hp_mal: 10,
        peso_mal: 2,
    },
    carne_vaca: {
        name: "🥩 Carne de vaca",
        cocida: "carne_vaca_cocida",
        mal_cocida: "carne_vaca_mal_cocida",
        hp: 50,
        peso: 4,
        hp_mal: 12,
        peso_mal: 2,
    },
    carne_zorro: {
        name: "🥩 Carne de zorro",
        cocida: "carne_zorro_cocida",
        mal_cocida: "carne_zorro_mal_cocida",
        hp: 30,
        peso: 3,
        hp_mal: 8,
        peso_mal: 2,
    },
    carne_ciervo: {
        name: "🥩 Carne de ciervo",
        cocida: "carne_ciervo_cocida",
        mal_cocida: "carne_ciervo_mal_cocida",
        hp: 45,
        peso: 4,
        hp_mal: 10,
        peso_mal: 2,
    },
    carne_jabali: {
        name: "🥩 Carne de jabalí",
        cocida: "carne_jabali_cocida",
        mal_cocida: "carne_jabali_mal_cocida",
        hp: 60,
        peso: 5,
        hp_mal: 15,
        peso_mal: 3,
    },
    carne_lobo: {
        name: "🥩 Carne de lobo",
        cocida: "carne_lobo_cocida",
        mal_cocida: "carne_lobo_mal_cocida",
        hp: 70,
        peso: 4,
        hp_mal: 18,
        peso_mal: 2,
    },
    carne_oso: {
        name: "🥩 Carne de oso",
        cocida: "carne_oso_cocida",
        mal_cocida: "carne_oso_mal_cocida",
        hp: 90,
        peso: 6,
        hp_mal: 22,
        peso_mal: 4,
    },
    carne_leon: {
        name: "🥩 Carne de león",
        cocida: "carne_leon_cocida",
        mal_cocida: "carne_leon_mal_cocida",
        hp: 80,
        peso: 5,
        hp_mal: 20,
        peso_mal: 3,
    },
    carne_unicornio: {
        name: "🥩 Carne de unicornio",
        cocida: "carne_unicornio_cocida",
        mal_cocida: "carne_unicornio_mal_cocida",
        hp: 120,
        peso: 3,
        hp_mal: 25,
        peso_mal: 2,
    },
    carne_dragon: {
        name: "🥩 Carne de dragón",
        cocida: "carne_dragon_cocida",
        mal_cocida: "carne_dragon_mal_cocida",
        hp: 200,
        peso: 10,
        hp_mal: 30,
        peso_mal: 5,
    },
};
// ===== FRASES =====
const frasesExito = [
    "🍳 *¡Cocción perfecta!* Quedó en su punto",
    "🔥 *¡Bien cocinado!* Huele riquísimo",
    "👨‍🍳 *¡Chef profesional!* Te quedó espectacular",
    "✨ *¡Carne perfecta!* Bien dorada",
    "🍽️ *¡Cocción ideal!* Se ve deliciosa",
];
const frasesFracaso = [
    "🤢 *¡Se quemó por fuera y cruda por dentro!*",
    "💀 *¡Quedó carbonizada!*",
    "😷 *¡Cruda y fea!* Poco apetitosa",
    "🤮 *¡La cocinaste mal!* Está dudosa",
    "🥴 *¡Quedó horrible!* Pero te la vas a tener que comer igual",
];
function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
function fmt(n) {
    return Number(n || 0).toLocaleString("es-AR");
}
export default {
    name: ["cocinar", "cook", "asar"],
    help: ["cocinar <carne>"],
    desc: "Cocina carne cruda para poder comerla",
    tags: ["econ"],
    register: true,
    run: async ({ conn, m, args, prefijo }) => {
        try {
            const now = Date.now();
            const itemKey = (args[0] || "").toLowerCase();
            if (!itemKey) {
                return m.reply(null, `🍳 *Uso: ${prefijo}cocinar <carne>*\n\n` +
                    `📌 Ejemplo: *${prefijo}cocinar carne_conejo*\n\n` +
                    `> Cazá primero con *${prefijo}cazar*`);
            }
            const carne = CARNES[itemKey];
            if (!carne) {
                return m.reply(null, `❌ *${itemKey}* no es una carne válida.\n\n> Usá *${prefijo}inv* para ver qué tenés`);
            }
            const { rows: [user] } = await db.query("SELECT salud, salud_max, peso, inventario, lastcocinar FROM usuarios WHERE id = $1 OR lid = $2", [m.sender, m.lid || ""]);
            if (!user)
                return m.reply(null, "❌ No estás registrado.");
            // ===== COOLDOWN =====
            const lastCocinar = Number(user.lastcocinar) || 0;
            const cd = lastCocinar + COOLDOWN - now;
            if (cd > 0) {
                const seg = Math.ceil(cd / 1000);
                return m.reply(null, `⏳ Esperá *${seg}s* antes de cocinar otra cosa`);
            }
            // ===== VERIFICAR INVENTARIO =====
            const inventario = user.inventario || {};
            const cantidad = Number(inventario[itemKey]) || 0;
            if (cantidad <= 0) {
                return m.reply(null, `❌ No tenés *${carne.name}* en tu inventario.\n\n> Cazá animales con *${prefijo}cazar*`);
            }
            // ===== CANTIDAD A COCINAR =====
            let count = 1;
            if (args[1] && /all/i.test(args[1])) {
                count = cantidad;
            }
            else if (args[1]) {
                count = Math.min(Number(args[1]) || 1, cantidad);
            }
            // ===== COCINAR CADA UNA =====
            let bienCocidas = 0;
            let malCocidas = 0;
            for (let i = 0; i < count; i++) {
                if (Math.random() < 0.70) {
                    bienCocidas++;
                }
                else {
                    malCocidas++;
                }
            }
            // ===== CONSUMIR CARNES CRUDAS =====
            inventario[itemKey] = cantidad - count;
            if (inventario[itemKey] <= 0)
                delete inventario[itemKey];
            // ===== AGREGAR CARNES COCIDAS =====
            if (bienCocidas > 0) {
                inventario[carne.cocida] = (Number(inventario[carne.cocida]) || 0) + bienCocidas;
            }
            if (malCocidas > 0) {
                inventario[carne.mal_cocida] = (Number(inventario[carne.mal_cocida]) || 0) + malCocidas;
            }
            // ===== UPDATE =====
            await db.query("UPDATE usuarios SET inventario = $1::jsonb, lastcocinar = $2 WHERE id = $3 OR lid = $3", [JSON.stringify(inventario), now, m.sender]);
            // ===== MENSAJE =====
            let msg = `🍳 *COCINANDO...*\n\n`;
            if (bienCocidas > 0 && malCocidas === 0) {
                // Todo bien
                msg += `${pickRandom(frasesExito)}\n\n`;
                msg += `▢ *${bienCocidas}x* ${carne.name} → ✅ Bien cocida\n`;
                msg += `\n🍖 Coméla con *${prefijo}comer ${carne.cocida}*`;
            }
            else if (bienCocidas === 0 && malCocidas > 0) {
                // Todo mal
                msg += `${pickRandom(frasesFracaso)}\n\n`;
                msg += `▢ *${malCocidas}x* ${carne.name} → ❌ Mal cocida\n`;
                msg += `\n▢ Coméla con *${prefijo}comer ${carne.mal_cocida}*`;
            }
            else {
                // Mixto
                msg += `🔥 *Resultado:*\n\n`;
                msg += `▢ *${bienCocidas}x* ✅ Bien cocida\n`;
                msg += `▢ *${malCocidas}x* ❌ Mal cocida\n`;
                msg += `\n👉 Comélas con *${prefijo}comer <tipo>*`;
            }
            await m.reply(null, msg);
            // ===== REACCIONES =====
            if (bienCocidas > 0 && malCocidas === 0) {
                await m.react("🍳");
            }
            else if (bienCocidas === 0) {
                await m.react("🤯");
            }
            else {
                await m.react("🔥");
            }
        }
        catch (err) {
            console.error("cocinar error:", err);
            m.reply("❌ Ocurrió un error al cocinar.");
            await m.react("🚨");
        }
    }
};
