// @ts-nocheck
import { db } from "../lib/db.js";
import { MASCOTAS } from "../lib/rpg-utils.js";
// ===== PICOS =====
const PICOS = {
    pico_piedra: { name: "🪨 Pico de piedra", bonus_xp: 0.05, reduce_daño: 0, durabilidad: 20 },
    pico_hierro: { name: "⛏️ Pico de hierro", bonus_xp: 0.25, reduce_daño: 0.20, durabilidad: 50 },
    pico_diamante: { name: "💎 Pico de diamante", bonus_xp: 0.50, reduce_daño: 0.40, durabilidad: 100 },
    pico_infernal: { name: "🔥 Pico infernal", bonus_xp: 1.00, reduce_daño: 0.60, durabilidad: 200 },
    pico_celestial: { name: "⚡ Pico celestial", bonus_xp: 2.00, reduce_daño: 0.80, durabilidad: -1 },
};
// ===== ARMAS DE CAZA =====
const ARMAS_CAZA = {
    arco_basico: { name: "🏹 Arco básico", bonus_caza: 0, durabilidad: 30 },
    arco_cazador: { name: "🏹 Arco de cazador", bonus_caza: 0.25, durabilidad: 60 },
    ballesta: { name: "🏹 Ballesta", bonus_caza: 0.50, durabilidad: 100 },
    rifle_caza: { name: "🔫 Rifle de caza", bonus_caza: 0.75, durabilidad: 200 },
};
// Items usables con .use
const USABLE_ITEMS = {
    venda: { name: "🩹 Venda", category: "cura", heal: 20 },
    inyeccion: { name: "💉 Inyección", category: "cura", heal: 50 },
    pocion_medica: { name: "🧪 Poción médica", category: "cura", heal: 100 },
    seguro: {
        name: "🛡️ Seguro anti-robo",
        category: "rpg",
        effect: "seguro",
        duration: 24 * 60 * 60 * 1000,
    },
    guardian: {
        name: "👮 Guardián",
        category: "rpg",
        effect: "guardian",
        duration: 12 * 60 * 60 * 1000,
    },
    seguro_total: {
        name: "🔐 Seguro total",
        category: "rpg",
        effect: "seguro_total",
        duration: 24 * 60 * 60 * 1000,
    },
    multiplicador: {
        name: "⚡ Boost x2",
        category: "rpg",
        effect: "boost_xp",
        duration: 60 * 60 * 1000,
    },
    suerte: {
        name: "🍀 Poción de suerte",
        category: "rpg",
        effect: "suerte",
        duration: 3,
    },
};
function fmt(n) {
    return Number(n || 0).toLocaleString("es-AR");
}
export default {
    name: ["use", "usar"],
    help: ["use <item>"],
    desc: "Usa un item, equipa un pico, arma o mascota",
    tags: ["econ"],
    register: true,
    run: async ({ conn, m, args, prefijo }) => {
        try {
            const now = Date.now();
            const itemKey = (args[0] || "").toLowerCase();
            if (!itemKey) {
                return m.reply(null, `⚠️ Uso: *${prefijo}use <item>*\n\n📌 Ejemplo: *${prefijo}use seguro*`);
            }
            // ==========================================================
            // 🔥 CHEQUEAR SI ES UN PICO
            // ==========================================================
            const pico = PICOS[itemKey];
            if (pico) {
                const { rows: [user] } = await db.query("SELECT picos, pico_equipado, pico_usos FROM usuarios WHERE id = $1 OR lid = $2", [m.sender, m.lid || ""]);
                if (!user)
                    return m.reply(null, "❌ No estás registrado.");
                const picos = user.picos || {};
                const listaPicos = picos[itemKey] || [];
                if (!Array.isArray(listaPicos) || listaPicos.length === 0) {
                    return m.reply(null, `❌ No tenés *${pico.name}* en tu arsenal.\n\n> Compralo con *${prefijo}buy ${itemKey}*`);
                }
                const picoNuevo = listaPicos.shift();
                if (listaPicos.length === 0)
                    delete picos[itemKey];
                const anteriorKey = user.pico_equipado;
                const anteriorUsos = Number(user.pico_usos) || 0;
                if (anteriorKey && PICOS[anteriorKey] && anteriorUsos > 0) {
                    if (!picos[anteriorKey])
                        picos[anteriorKey] = [];
                    picos[anteriorKey].push({ usos: anteriorUsos });
                }
                await db.query(`UPDATE usuarios 
           SET pico_equipado = $1, pico_usos = $2, picos = $3::jsonb 
           WHERE id = $4 OR lid = $4`, [itemKey, picoNuevo.usos, JSON.stringify(picos), m.sender]);
                const durMax = pico.durabilidad === -1 ? "∞" : pico.durabilidad;
                let msg = `${m.e.ok} *Pico equipado*\n\n`;
                msg += `▢ *${pico.name}*\n`;
                msg += `▢ ✨ Bonus XP: *+${Math.round(pico.bonus_xp * 100)}%*\n`;
                msg += `▢ 🛡️ Reduce daño: *-${Math.round(pico.reduce_daño * 100)}%*\n`;
                msg += `▢ 🔧 Durabilidad: *${picoNuevo.usos}/${durMax}*\n`;
                if (anteriorKey && PICOS[anteriorKey] && anteriorUsos > 0) {
                    msg += `\n♻️ *${PICOS[anteriorKey].name}* (${anteriorUsos} usos) devuelto al arsenal`;
                }
                await m.reply(null, msg);
                return m.react("⛏️");
            }
            // ==========================================================
            // 🔥 CHEQUEAR SI ES UN ARMA DE CAZA
            // ==========================================================
            const arma = ARMAS_CAZA[itemKey];
            if (arma) {
                const { rows: [user] } = await db.query("SELECT armas_caza, arma_caza_equipada, arma_caza_usos FROM usuarios WHERE id = $1 OR lid = $2", [m.sender, m.lid || ""]);
                if (!user)
                    return m.reply(null, "❌ No estás registrado.");
                const armas = user.armas_caza || {};
                const listaArmas = armas[itemKey] || [];
                if (!Array.isArray(listaArmas) || listaArmas.length === 0) {
                    return m.reply(null, `❌ No tenés *${arma.name}* en tu arsenal.\n\n> Comprala con *${prefijo}buy ${itemKey}*`);
                }
                // Sacar la primera arma del array (la más vieja, FIFO)
                const armaNueva = listaArmas.shift();
                if (listaArmas.length === 0)
                    delete armas[itemKey];
                // Devolver el arma anterior al arsenal (con usos intactos)
                const anteriorKey = user.arma_caza_equipada;
                const anteriorUsos = Number(user.arma_caza_usos) || 0;
                if (anteriorKey && ARMAS_CAZA[anteriorKey] && anteriorUsos > 0) {
                    if (!armas[anteriorKey])
                        armas[anteriorKey] = [];
                    armas[anteriorKey].push({ usos: anteriorUsos });
                }
                await db.query(`UPDATE usuarios 
           SET arma_caza_equipada = $1, arma_caza_usos = $2, armas_caza = $3::jsonb 
           WHERE id = $4 OR lid = $4`, [itemKey, armaNueva.usos, JSON.stringify(armas), m.sender]);
                const durMax = arma.durabilidad;
                let msg = `${m.e.ok} *Arma equipada*\n\n`;
                msg += `▢ *${arma.name}*\n`;
                msg += `▢ 🏹 Bonus caza: *+${Math.round(arma.bonus_caza * 100)}%*\n`;
                msg += `▢ 🔧 Durabilidad: *${armaNueva.usos}/${durMax}*\n`;
                if (anteriorKey && ARMAS_CAZA[anteriorKey] && anteriorUsos > 0) {
                    msg += `\n♻️ *${ARMAS_CAZA[anteriorKey].name}* (${anteriorUsos} usos) devuelto al arsenal`;
                }
                await m.reply(null, msg);
                return m.react("🏹");
            }
            // ==========================================================
            // 🔥 CHEQUEAR SI ES UNA MASCOTA
            // ==========================================================
            const mascota = MASCOTAS[itemKey];
            if (mascota) {
                // 🔥 Las mascotas NORMALES ya se equipan al comprar → bloquear .use
                if (mascota.tipo === "normal") {
                    return m.reply(null, `🐾 *${mascota.name}* es una mascota normal.\n\n` +
                        `> Ya está contigo desde que la compraste\n` +
                        `> Verla: *${prefijo}mascotas*`);
                }
                // 🔥 Solo las mascotas de CAZA se equipan con .use
                const { rows: [user] } = await db.query("SELECT inventario, mascotas FROM usuarios WHERE id = $1 OR lid = $2", [m.sender, m.lid || ""]);
                if (!user)
                    return m.reply(null, "❌ No estás registrado.");
                const inventario = user.inventario || {};
                const cantidad = Number(inventario[itemKey]) || 0;
                if (cantidad <= 0) {
                    return m.reply(null, `❌ No tenés *${mascota.name}* en tu inventario.\n\n> Comprala con *${prefijo}buy ${itemKey}*`);
                }
                let mascotas = Array.isArray(user.mascotas) ? user.mascotas : [];
                // Verificar si ya la tiene
                const yaLaTiene = mascotas.some(m => {
                    const key = typeof m === "string" ? m : m.key;
                    return key === itemKey;
                });
                if (yaLaTiene) {
                    return m.reply(null, `⚠️ Ya tenés a *${mascota.name}* equipada`);
                }
                // Sacar del inventario
                inventario[itemKey] = cantidad - 1;
                if (inventario[itemKey] <= 0)
                    delete inventario[itemKey];
                // Agregar a mascotas
                mascotas.push({ key: itemKey, hp: 100, last_feed: Date.now() });
                await db.query(`UPDATE usuarios 
           SET mascotas = $1::jsonb, inventario = $2::jsonb 
           WHERE id = $3 OR lid = $3`, [JSON.stringify(mascotas), JSON.stringify(inventario), m.sender]);
                let msg = `${m.e.ok} *Mascota de caza equipada*\n\n`;
                msg += `▢ *${mascota.name}*\n`;
                msg += `▢ 🎯 Bonus caza: *+${Math.round(mascota.bonus_caza * 100)}%*\n`;
                msg += `\n🐾 Mascotas equipadas: *${mascotas.length}*`;
                await m.reply(null, msg);
                return m.react("🐾");
            }
            // ==========================================================
            // 🔥 ITEMS NORMALES
            // ==========================================================
            const item = USABLE_ITEMS[itemKey];
            if (!item) {
                return m.reply(null, `❌ *${itemKey}* no es un item usable.\n\n> Comidas usan *${prefijo}comer*, items RPG/curas usan *${prefijo}use*`);
            }
            const { rows: [user] } = await db.query("SELECT salud, salud_max, peso, inventario, seguro_hasta, anti_rob, anti_rob2, boost_xp_hasta, suerte_usos FROM usuarios WHERE id = $1 OR lid = $2", [m.sender, m.lid || ""]);
            if (!user)
                return m.reply(null, "❌ No estás registrado.");
            const inventario = user.inventario || {};
            const cantidad = Number(inventario[itemKey]) || 0;
            if (cantidad <= 0) {
                return m.reply(null, `❌ No tenés *${item.name}* en tu inventario.\n\n> Compralo con *${prefijo}buy ${itemKey}*`);
            }
            // ===== CURAS =====
            if (item.category === "cura") {
                const saludActual = Number(user.salud) || 100;
                const saludMax = Number(user.salud_max) || 100;
                if (saludActual >= saludMax) {
                    return m.reply(null, `❤️ Ya tenés la salud al máximo (*${saludActual}/${saludMax}*)\n\n> Guardala para cuando la necesites`);
                }
                const hpCurado = Math.min(item.heal, saludMax - saludActual);
                const nuevaSalud = Math.min(saludActual + item.heal, saludMax);
                inventario[itemKey] = cantidad - 1;
                if (inventario[itemKey] <= 0)
                    delete inventario[itemKey];
                await db.query(`UPDATE usuarios SET salud = $1, inventario = $2::jsonb WHERE id = $3 OR lid = $3`, [nuevaSalud, JSON.stringify(inventario), m.sender]);
                let msg = `${m.e.ok} *${item.name} usada*\n\n`;
                msg += `❤️ Salud: *${saludActual}* → *${nuevaSalud}* (+${hpCurado})\n`;
                msg += `📦 Quedan: *${inventario[itemKey] || 0}* en inventario`;
                await m.reply(null, msg);
                return m.react("💊");
            }
            // ===== SEGURO =====
            if (item.effect === "seguro") {
                const seguroActual = Number(user.seguro_hasta) || 0;
                const seguroActivo = seguroActual > now;
                const baseHasta = seguroActivo ? seguroActual : now;
                const nuevoHasta = baseHasta + item.duration;
                inventario[itemKey] = cantidad - 1;
                if (inventario[itemKey] <= 0)
                    delete inventario[itemKey];
                await db.query(`UPDATE usuarios SET seguro_hasta = $1, inventario = $2::jsonb WHERE id = $3 OR lid = $3`, [nuevoHasta, JSON.stringify(inventario), m.sender]);
                const horas = Math.floor((nuevoHasta - now) / 3600000);
                let msg = `${m.e.ok} *${item.name} activado*\n\n`;
                msg += `🛡️ Protección total: *${horas}h*\n`;
                if (seguroActivo)
                    msg += `_(se sumó al tiempo restante)_\n`;
                msg += `📦 Quedan: *${inventario[itemKey] || 0}* en inventario`;
                await m.reply(null, msg);
                return m.react("🛡️");
            }
            // ===== GUARDIÁN =====
            if (item.effect === "guardian") {
                const actual = Number(user.anti_rob) || 0;
                const activo = actual > now;
                const baseHasta = activo ? actual : now;
                const nuevoHasta = baseHasta + item.duration;
                inventario[itemKey] = cantidad - 1;
                if (inventario[itemKey] <= 0)
                    delete inventario[itemKey];
                await db.query(`UPDATE usuarios SET anti_rob = $1, inventario = $2::jsonb WHERE id = $3 OR lid = $3`, [nuevoHasta, JSON.stringify(inventario), m.sender]);
                const horas = Math.floor((nuevoHasta - now) / 3600000);
                let msg = `${m.e.ok} *¡Guardián contratado!*\n\n`;
                msg += `👮 Protección XP: *${horas}h*\n`;
                if (activo)
                    msg += `_(se sumó al tiempo restante)_\n`;
                msg += `📦 Quedan: *${inventario[itemKey] || 0}* en inventario`;
                await m.reply(null, msg);
                return m.react("👮");
            }
            // ===== SEGURO TOTAL =====
            if (item.effect === "seguro_total") {
                const seguroActual = Number(user.seguro_hasta) || 0;
                const bolsilloActual = Number(user.anti_rob2) || 0;
                const baseSeguro = seguroActual > now ? seguroActual : now;
                const baseBolsillo = bolsilloActual > now ? bolsilloActual : now;
                const nuevoSeguro = baseSeguro + item.duration;
                const nuevoBolsillo = baseBolsillo + item.duration;
                inventario[itemKey] = cantidad - 1;
                if (inventario[itemKey] <= 0)
                    delete inventario[itemKey];
                await db.query(`UPDATE usuarios SET seguro_hasta = $1, anti_rob2 = $2, inventario = $3::jsonb WHERE id = $4 OR lid = $4`, [nuevoSeguro, nuevoBolsillo, JSON.stringify(inventario), m.sender]);
                const horas = Math.floor(item.duration / 3600000);
                let msg = `${m.e.ok} *Seguro total activado*\n\n`;
                msg += `🛡️ Banco protegido: *${horas}h*\n`;
                msg += `👮 XP protegida: *${horas}h*\n`;
                msg += `📦 Quedan: *${inventario[itemKey] || 0}* en inventario`;
                await m.reply(null, msg);
                return m.react("🔐");
            }
            // ===== BOOST XP =====
            if (item.effect === "boost_xp") {
                const boostActual = Number(user.boost_xp_hasta) || 0;
                const boostActivo = boostActual > now;
                const baseHasta = boostActivo ? boostActual : now;
                const nuevoHasta = baseHasta + item.duration;
                inventario[itemKey] = cantidad - 1;
                if (inventario[itemKey] <= 0)
                    delete inventario[itemKey];
                await db.query(`UPDATE usuarios SET boost_xp_hasta = $1, inventario = $2::jsonb WHERE id = $3 OR lid = $3`, [nuevoHasta, JSON.stringify(inventario), m.sender]);
                const mins = Math.floor((nuevoHasta - now) / 60000);
                let msg = `${m.e.ok} *${item.name} activado*\n\n`;
                msg += `⚡ Boost x2 activo: *${mins}min*\n`;
                if (boostActivo)
                    msg += `_(se sumó al tiempo restante)_\n`;
                msg += `📦 Quedan: *${inventario[itemKey] || 0}* en inventario`;
                await m.reply(null, msg);
                return m.react("⚡");
            }
            // ===== SUERTE =====
            if (item.effect === "suerte") {
                const suerteActual = Number(user.suerte_usos) || 0;
                const nuevosUsos = suerteActual + item.duration;
                inventario[itemKey] = cantidad - 1;
                if (inventario[itemKey] <= 0)
                    delete inventario[itemKey];
                await db.query(`UPDATE usuarios SET suerte_usos = $1, inventario = $2::jsonb WHERE id = $3 OR lid = $3`, [nuevosUsos, JSON.stringify(inventario), m.sender]);
                let msg = `${m.e.ok} *${item.name} activada*\n\n`;
                msg += `🍀 Usos acumulados: *${nuevosUsos}*\n`;
                if (suerteActual > 0)
                    msg += `_(se sumaron a los que ya tenías)_\n`;
                msg += `📦 Quedan: *${inventario[itemKey] || 0}* en inventario`;
                await m.reply(null, msg);
                return m.react("🍀");
            }
            return m.reply(null, `❌ *${item.name}* no tiene efecto configurado`);
        }
        catch (e) {
            console.error("❌ Error en use:", e);
            await m.react("🚨");
            m.reply(`❌ Error al usar item: ${e.message || e}`);
        }
    }
};
