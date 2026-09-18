// @ts-nocheck
import { db } from "../lib/db.js";
import { getCooldownMultiplier } from "../lib/rpg-utils.js";
// ===== PICOS =====
const PICOS_INFO = {
    pico_piedra: { name: "🪨 Pico de piedra", bonus_xp: 0.05, reduce_daño: 0, durabilidad: 20 },
    pico_hierro: { name: "⛏️ Pico de hierro", bonus_xp: 0.25, reduce_daño: 0.20, durabilidad: 50 },
    pico_diamante: { name: "💎 Pico de diamante", bonus_xp: 0.50, reduce_daño: 0.40, durabilidad: 100 },
    pico_infernal: { name: "🔥 Pico infernal", bonus_xp: 1.00, reduce_daño: 0.60, durabilidad: 200 },
    pico_celestial: { name: "⚡ Pico celestial", bonus_xp: 2.00, reduce_daño: 0.80, durabilidad: -1 },
};
// ===== ARMAS DE CAZA =====
const ARMAS_INFO = {
    arco_basico: { name: "🏹 Arco básico", durabilidad: 30 },
    arco_cazador: { name: "🏹 Arco de cazador", durabilidad: 60 },
    ballesta: { name: "🏹 Ballesta", durabilidad: 100 },
    rifle_caza: { name: "🔫 Rifle de caza", durabilidad: 200 },
};
// ===== MASCOTAS (solo nombres) =====
const MASCOTAS_INFO = {
    perro_cazador: { name: "🐕 Perro cazador" },
    aguila: { name: "🦅 Águila" },
    lobo_amaestrado: { name: "🐺 Lobo amaestrado" },
    dragon_caza: { name: "🐉 Dragón de caza" },
    gato: { name: "🐱 Gato" },
    perro: { name: "🐶 Perro" },
    conejo: { name: "🐰 Conejo" },
    loro: { name: "🦜 Loro" },
    tortuga: { name: "🐢 Tortuga" },
    serpiente: { name: "🐍 Serpiente" },
};
// ===== DROGAS =====
const DROGAS_INFO = {
    droga_marihuana: { name: "🌿 Marihuana" },
    droga_cocaina: { name: "❄️ Cocaína" },
    droga_metanfetamina: { name: "💊 Metanfetamina" },
    droga_lsd: { name: "🎨 LSD" },
    droga_heroina: { name: "💉 Heroína" },
};
// ===== ITEMS ILEGALES =====
const ITEMS_ILEGALES_INFO = {
    pistola: { name: "🔫 Pistola" },
    cuchillo: { name: "🔪 Cuchillo" },
    ganzua: { name: "🔓 Ganzúa" },
    disfraz: { name: "🎭 Disfraz" },
    documentos_falsos: { name: "📄 Documentos falsos" },
};
function fmt(n) {
    return Number(n || 0).toLocaleString("es-AR");
}
function barraHP(actual, max) {
    const total = 10;
    const llenos = Math.max(0, Math.min(total, Math.round((actual / max) * total)));
    return "█".repeat(llenos) + "░".repeat(total - llenos);
}
function frasePeso(peso) {
    if (peso < 40)
        return "💀 *¡Tas flaco como un palillo!* Comé algo urgente 🍔";
    if (peso < 55)
        return "🪶 *Tas flaquito*, metele más al asado 🥩";
    if (peso < 70)
        return "🟢 *Tas en tu peso ideal*, seguí así 😎";
    if (peso < 85)
        return "🟡 *Tas rellenito*, tranquilo, no es para tanto 🐷";
    if (peso < 100)
        return "🟠 *¡Tas gordito!* Bajale a las hamburguesas 🍔😅";
    if (peso < 120)
        return "🔴 *¡Tas gordo!* Ya no entrás por la puerta 🚪😂";
    return "🚨 *¡Tas como una casa!* Andá al gym, hermano 🏋️😭";
}
// ==========================================================
// 🔥 TIPO DE ITEM
// ==========================================================
const ITEM_TIPO = {
    // Comidas normales
    chocolate: "comida", ensalada: "comida", guisos: "comida",
    hamburguesa: "comida", milanesa: "comida", pizza: "comida",
    sushi: "comida", asado: "comida",
    // Curas
    venda: "use", inyeccion: "use", pocion_medica: "use",
    // Items RPG
    seguro: "use", guardian: "use", seguro_total: "use",
    multiplicador: "use", suerte: "use",
    // Munición
    flechas: "municion",
    // Carnes crudas
    carne_conejo: "cocinar", carne_ardilla: "cocinar", carne_pato: "cocinar",
    carne_gallina: "cocinar", carne_cerdo: "cocinar", carne_vaca: "cocinar",
    carne_zorro: "cocinar", carne_ciervo: "cocinar", carne_jabali: "cocinar",
    carne_lobo: "cocinar", carne_oso: "cocinar", carne_leon: "cocinar",
    carne_unicornio: "cocinar", carne_dragon: "cocinar",
    // Carnes cocidas
    carne_conejo_cocida: "comida", carne_ardilla_cocida: "comida",
    carne_pato_cocida: "comida", carne_gallina_cocida: "comida",
    carne_cerdo_cocida: "comida", carne_vaca_cocida: "comida",
    carne_zorro_cocida: "comida", carne_ciervo_cocida: "comida",
    carne_jabali_cocida: "comida", carne_lobo_cocida: "comida",
    carne_oso_cocida: "comida", carne_leon_cocida: "comida",
    carne_unicornio_cocida: "comida", carne_dragon_cocida: "comida",
    // Carnes mal cocidas
    carne_conejo_mal_cocida: "comida", carne_ardilla_mal_cocida: "comida",
    carne_pato_mal_cocida: "comida", carne_gallina_mal_cocida: "comida",
    carne_cerdo_mal_cocida: "comida", carne_vaca_mal_cocida: "comida",
    carne_zorro_mal_cocida: "comida", carne_ciervo_mal_cocida: "comida",
    carne_jabali_mal_cocida: "comida", carne_lobo_mal_cocida: "comida",
    carne_oso_mal_cocida: "comida", carne_leon_mal_cocida: "comida",
    carne_unicornio_mal_cocida: "comida", carne_dragon_mal_cocida: "comida",
    // Drops
    pelaje_lobo: "use", garra_oso: "use", melena_leon: "use",
    cuerno_unicornio: "use", huevo_dragon: "use",
    // Items ilegales
    pistola: "ilegal", cuchillo: "ilegal", ganzua: "ilegal",
    disfraz: "ilegal", documentos_falsos: "ilegal",
};
export default {
    name: ["hp", "inv", "inventario"],
    help: ["hp", "inv"],
    desc: "Ver tu salud, estado, inventario",
    tags: ["econ"],
    register: true,
    run: async ({ conn, m, cmd, prefijo }) => {
        try {
            const now = Date.now();
            const cmdLower = (cmd || "").toLowerCase();
            const verInv = ["inv", "inventario"].includes(cmdLower);
            const { rows: [user] } = await db.query(`SELECT salud, salud_max, peso, exp, limite, banco, inventario, picos,
                pico_equipado, pico_usos,
                armas_caza, arma_caza_equipada, arma_caza_usos,
                mascotas, drogas,
                seguro_hasta, boost_xp_hasta, suerte_usos
         FROM usuarios WHERE id = $1 OR lid = $2`, [m.sender, m.lid || ""]);
            if (!user)
                return m.reply(null, "❌ No estás registrado.");
            const mascotas = Array.isArray(user.mascotas) ? user.mascotas : [];
            // ==========================================================
            // 🔥 INVENTARIO
            // ==========================================================
            if (verInv) {
                const inv = user.inventario || {};
                const picos = user.picos || {};
                const armas = user.armas_caza || {};
                const drogas = user.drogas || {};
                const keysInv = Object.keys(inv).filter(k => Number(inv[k]) > 0);
                const keysPicos = Object.keys(picos).filter(k => Array.isArray(picos[k]) && picos[k].length > 0);
                const keysArmas = Object.keys(armas).filter(k => Array.isArray(armas[k]) && armas[k].length > 0);
                const keysDrogas = Object.keys(drogas).filter(k => {
                    const d = drogas[k];
                    if (typeof d === "number")
                        return d > 0;
                    if (typeof d === "object" && d !== null)
                        return Number(d.usos) > 0;
                    return false;
                });
                // Separar items normales de items ilegales
                const keysItemsNormales = keysInv.filter(k => ITEM_TIPO[k] !== "ilegal");
                const keysItemsIlegales = keysInv.filter(k => ITEM_TIPO[k] === "ilegal");
                const vacio = keysItemsNormales.length === 0
                    && keysItemsIlegales.length === 0
                    && keysPicos.length === 0
                    && keysArmas.length === 0
                    && keysDrogas.length === 0
                    && !user.pico_equipado
                    && !user.arma_caza_equipada
                    && mascotas.length === 0;
                if (vacio) {
                    return m.reply(null, `📦 *INVENTARIO VACÍO*\n\n> Comprá items con *${prefijo}shop*`);
                }
                let txt = `╭─「 📦 *INVENTARIO* 」\n`;
                // ===== Items normales / comidas / carnes =====
                if (keysItemsNormales.length > 0) {
                    txt += `│\n│ *— Items y comidas —*\n`;
                    for (const key of keysItemsNormales) {
                        const tipo = ITEM_TIPO[key] || "use";
                        let cmdUsar = "use";
                        let emoji = "🔧";
                        if (tipo === "comida") {
                            cmdUsar = "comer";
                            emoji = "🍽️";
                        }
                        else if (tipo === "cocinar") {
                            cmdUsar = "cocinar";
                            emoji = "🍳";
                        }
                        else if (tipo === "municion") {
                            emoji = "🎯";
                            txt += `│ ${emoji} *${key}* x${inv[key]}\n`;
                            continue;
                        }
                        txt += `│ ${emoji} *${key}* x${inv[key]} → *${prefijo}${cmdUsar} ${key}*\n`;
                    }
                }
                // ===== Drogas =====
                if (keysDrogas.length > 0) {
                    txt += `│\n│ *— 💊 Drogas —*\n`;
                    for (const key of keysDrogas) {
                        const info = DROGAS_INFO[key];
                        const nombre = info?.name || key;
                        const droga = drogas[key];
                        let usos = 0;
                        if (typeof droga === "number")
                            usos = droga;
                        else if (typeof droga === "object" && droga !== null)
                            usos = Number(droga.usos) || 0;
                        txt += `│ 🌿 *${nombre}* (${usos} usos)\n`;
                    }
                    txt += `│   👉 Vender: *${prefijo}traficar*\n`;
                }
                // ===== Items ilegales =====
                if (keysItemsIlegales.length > 0) {
                    txt += `│\n│ *— 🕶️ Items ilegales —*\n`;
                    for (const key of keysItemsIlegales) {
                        const info = ITEMS_ILEGALES_INFO[key];
                        const nombre = info?.name || key;
                        txt += `│ 🔫 *${nombre}* x${inv[key]}\n`;
                    }
                    txt += `│   👉 Vender: *${prefijo}traficar*\n`;
                }
                // ===== Picos =====
                if (keysPicos.length > 0 || user.pico_equipado) {
                    txt += `│\n│ *— ⛏️ Picos —*\n`;
                    if (user.pico_equipado) {
                        const picoInfo = PICOS_INFO[user.pico_equipado];
                        const durMax = picoInfo?.durabilidad === -1 ? "∞" : picoInfo?.durabilidad;
                        txt += `│ ★ *${picoInfo?.name || user.pico_equipado}* (equipado)\n`;
                        txt += `│   🔧 Usos: *${user.pico_usos}/${durMax}*\n`;
                    }
                    for (const key of keysPicos) {
                        const picoInfo = PICOS_INFO[key];
                        const lista = picos[key];
                        const totalUsos = lista.reduce((acc, p) => acc + (Number(p.usos) || 0), 0);
                        txt += `│ ▢ *${picoInfo?.name || key}* x${lista.length}\n`;
                        txt += `│   🔧 Usos totales: *${totalUsos}*\n`;
                    }
                }
                // ===== Armas de caza =====
                if (keysArmas.length > 0 || user.arma_caza_equipada) {
                    txt += `│\n│ *— 🏹 Armas de caza —*\n`;
                    if (user.arma_caza_equipada) {
                        const armaInfo = ARMAS_INFO[user.arma_caza_equipada];
                        const durMax = armaInfo?.durabilidad;
                        txt += `│ ★ *${armaInfo?.name || user.arma_caza_equipada}* (equipada)\n`;
                        txt += `│   🔧 Usos: *${user.arma_caza_usos}/${durMax}*\n`;
                    }
                    for (const key of keysArmas) {
                        const armaInfo = ARMAS_INFO[key];
                        const lista = armas[key];
                        const totalUsos = lista.reduce((acc, p) => acc + (Number(p.usos) || 0), 0);
                        txt += `│ ▢ *${armaInfo?.name || key}* x${lista.length}\n`;
                        txt += `│   🔧 Usos totales: *${totalUsos}*\n`;
                    }
                }
                // ===== Mascotas (solo nombres, sin HP) =====
                if (mascotas.length > 0) {
                    txt += `│\n│ *— 🐾 Mascotas —*\n`;
                    for (const mm of mascotas) {
                        const key = typeof mm === "string" ? mm : mm.key;
                        const mInfo = MASCOTAS_INFO[key];
                        txt += `│ ▢ ${mInfo?.name || key}\n`;
                    }
                    txt += `│   👉 Ver estado: *${prefijo}mascotas*\n`;
                }
                txt += `╰───────────────`;
                txt += `\n\n👉 Equipar: *${prefijo}use <item>*`;
                return m.reply(null, txt);
            }
            // ==========================================================
            // 🔥 HP / ESTADO
            // ==========================================================
            const salud = Number(user.salud) || 100;
            const saludMax = Number(user.salud_max) || 100;
            const peso = Number(user.peso) || 70;
            const multiplier = getCooldownMultiplier(salud);
            const seguroHasta = Number(user.seguro_hasta) || 0;
            const boostHasta = Number(user.boost_xp_hasta) || 0;
            const suerteUsos = Number(user.suerte_usos) || 0;
            let txt = `╭─「 ❤️ *ESTADO* 」\n`;
            txt += `│\n`;
            txt += `│ ❤️ Salud: *${salud}/${saludMax}*\n`;
            txt += `│ [${barraHP(salud, saludMax)}]\n`;
            txt += `│ ⚖️ Peso: *${peso} kg*\n`;
            txt += `│ ${frasePeso(peso)}\n`;
            // Estado salud
            if (salud >= 70) {
                txt += `│\n│ 🟢 Salud óptima\n`;
            }
            else if (salud >= 40) {
                txt += `│ 🟡 Salud moderada (cooldowns ×1.5)\n`;
            }
            else if (salud >= 20) {
                txt += `│ 🟠 Salud baja (cooldowns ×2)\n`;
            }
            else if (salud > 0) {
                txt += `│ 🔴 Salud crítica (cooldowns ×3)\n`;
            }
            else {
                txt += `│ 💀 Desmayado (cooldowns ×5)\n`;
            }
            // Items activos
            const activos = [];
            if (seguroHasta > now) {
                const h = Math.floor((seguroHasta - now) / 3600000);
                activos.push(`🛡️ Seguro (${h}h)`);
            }
            if (boostHasta > now) {
                const mins = Math.floor((boostHasta - now) / 60000);
                activos.push(`⚡ Boost x2 (${mins}min)`);
            }
            if (suerteUsos > 0) {
                activos.push(`🍀 Suerte (${suerteUsos} usos)`);
            }
            if (activos.length > 0) {
                txt += `│\n│ *Activos:*\n`;
                for (const a of activos)
                    txt += `│ ▢ ${a}\n`;
            }
            // Pico equipado
            if (user.pico_equipado) {
                const picoInfo = PICOS_INFO[user.pico_equipado];
                const durMax = picoInfo?.durabilidad === -1 ? "∞" : picoInfo?.durabilidad;
                txt += `│\n│ *⛏️ Pico equipado:*\n`;
                txt += `│ ▢ ${picoInfo?.name || user.pico_equipado}\n`;
                txt += `│   🔧 Usos: *${user.pico_usos}/${durMax}*\n`;
            }
            // Arma de caza equipada
            if (user.arma_caza_equipada) {
                const armaInfo = ARMAS_INFO[user.arma_caza_equipada];
                const durMax = armaInfo?.durabilidad;
                txt += `│\n│ *🏹 Arma equipada:*\n`;
                txt += `│ ▢ ${armaInfo?.name || user.arma_caza_equipada}\n`;
                txt += `│   🔧 Usos: *${user.arma_caza_usos}/${durMax}*\n`;
            }
            txt += `│\n`;
            txt += `│ ${m.e.currency_emoji} ${m.e.currency_name}: ${fmt(user.limite)}\n`;
            txt += `│ 🏦 Banco: ${fmt(user.banco)}\n`;
            txt += `│ ⭐ XP: ${fmt(user.exp)}\n`;
            txt += `╰───────────────`;
            await m.reply(null, txt);
        }
        catch (e) {
            console.error("❌ Error en hp:", e);
            m.reply(`❌ Error: ${e.message || e}`);
        }
    }
};
