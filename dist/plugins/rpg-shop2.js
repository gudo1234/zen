// @ts-nocheck
import { db } from "../lib/db.js";
const COOLDOWN = 30 * 60 * 1000; // 30 min entre compras
const DURACION_CATALOGO = 5 * 60 * 1000; // El catálogo cambia cada 5 min
const ITEMS_MERCADO = [
    // ===== PICOS =====
    { key: "pico_piedra", precio_base: 10, categoria: "pico", nombre: "🪨 Pico de piedra" },
    { key: "pico_hierro", precio_base: 50, categoria: "pico", nombre: "⛏️ Pico de hierro" },
    { key: "pico_diamante", precio_base: 350, categoria: "pico", nombre: "💎 Pico de diamante" },
    { key: "pico_infernal", precio_base: 1000, categoria: "pico", nombre: "🔥 Pico infernal" },
    { key: "pico_celestial", precio_base: 3000, categoria: "pico", nombre: "⚡ Pico celestial" },
    // ===== ARMAS =====
    { key: "arco_basico", precio_base: 15, categoria: "arma_caza", nombre: "🏹 Arco básico" },
    { key: "arco_cazador", precio_base: 70, categoria: "arma_caza", nombre: "🏹 Arco de cazador" },
    { key: "ballesta", precio_base: 300, categoria: "arma_caza", nombre: "🏹 Ballesta" },
    { key: "rifle_caza", precio_base: 1300, categoria: "arma_caza", nombre: "🔫 Rifle de caza" },
    // ===== MUNICIÓN =====
    { key: "flechas", precio_base: 30, categoria: "municion", nombre: "🎯 10x Flechas", cantidad: 10 },
    // ===== MASCOTAS NORMALES =====
    { key: "gato", precio_base: 5, categoria: "mascota", nombre: "🐱 Gato" },
    { key: "perro", precio_base: 10, categoria: "mascota", nombre: "🐶 Perro" },
    { key: "conejo", precio_base: 30, categoria: "mascota", nombre: "🐰 Conejo" },
    { key: "loro", precio_base: 50, categoria: "mascota", nombre: "🦜 Loro" },
    { key: "tortuga", precio_base: 70, categoria: "mascota", nombre: "🐢 Tortuga" },
    { key: "serpiente", precio_base: 130, categoria: "mascota", nombre: "🐍 Serpiente" },
    // ===== MASCOTAS DE CAZA =====
    { key: "perro_cazador", precio_base: 30, categoria: "mascota", nombre: "🐕 Perro cazador" },
    { key: "aguila", precio_base: 50, categoria: "mascota", nombre: "🦅 Águila" },
    { key: "lobo_amaestrado", precio_base: 300, categoria: "mascota", nombre: "🐺 Lobo amaestrado" },
    { key: "dragon_caza", precio_base: 3000, categoria: "mascota", nombre: "🐉 Dragón de caza" },
    // ===== CURAS =====
    { key: "venda", precio_base: 30, categoria: "cura", nombre: "🩹 Venda" },
    { key: "inyeccion", precio_base: 80, categoria: "cura", nombre: "💉 Inyección" },
    { key: "pocion_medica", precio_base: 150, categoria: "cura", nombre: "🧪 Poción médica" },
    // ===== RPG =====
    { key: "seguro", precio_base: 450, categoria: "rpg", nombre: "🛡️ Seguro anti-robo" },
    { key: "guardian", precio_base: 100, categoria: "rpg", nombre: "👮 Guardián" },
    { key: "seguro_total", precio_base: 650, categoria: "rpg", nombre: "🔐 Seguro total" },
    { key: "multiplicador", precio_base: 300, categoria: "rpg", nombre: "⚡ Boost x2" },
    { key: "suerte", precio_base: 150, categoria: "rpg", nombre: "🍀 Poción de suerte" },
    // ===== EXCLUSIVOS ILEGALES =====
    { key: "droga_marihuana", precio_base: 50, categoria: "droga", nombre: "🌿 Marihuana", usos: 10, prioridad: 1, ilegal: true },
    { key: "droga_cocaina", precio_base: 100, categoria: "droga", nombre: "❄️ Cocaína", usos: 8, prioridad: 2, ilegal: true },
    { key: "droga_metanfetamina", precio_base: 350, categoria: "droga", nombre: "💊 Metanfetamina", usos: 6, prioridad: 3, ilegal: true },
    { key: "droga_lsd", precio_base: 700, categoria: "droga", nombre: "🎨 LSD", usos: 5, prioridad: 4, ilegal: true },
    { key: "droga_heroina", precio_base: 1000, categoria: "droga", nombre: "💉 Heroína", usos: 4, prioridad: 5, ilegal: true },
    { key: "pistola", precio_base: 800, categoria: "arma_ilegal", nombre: "🔫 Pistola", ilegal: true },
    { key: "cuchillo", precio_base: 300, categoria: "arma_ilegal", nombre: "🔪 Cuchillo", ilegal: true },
    { key: "ganzua", precio_base: 400, categoria: "herramienta_ilegal", nombre: "🔓 Ganzúa", ilegal: true },
    { key: "disfraz", precio_base: 600, categoria: "herramienta_ilegal", nombre: "🎭 Disfraz", ilegal: true },
    { key: "documentos_falsos", precio_base: 900, categoria: "herramienta_ilegal", nombre: "📄 Documentos falsos", ilegal: true },
];
// ===== RIESGOS =====
const RIESGOS = [
    { id: "bajo", nombre: "🟢 Bajo", desc: "Proveedor confiable", descuento: 0.20, probExito: 0.90 },
    { id: "medio", nombre: "🟡 Medio", desc: "Producto dudoso", descuento: 0.35, probExito: 0.70 },
    { id: "alto", nombre: "🟠 Alto", desc: "Muy barato... ¿será real?", descuento: 0.50, probExito: 0.50 },
    { id: "extremo", nombre: "🔴 Extremo", desc: "Casi regalado, o es estafa", descuento: 0.70, probExito: 0.30 },
];
// ===== PROMOS =====
const PROMOS = [
    { id: "pack", nombre: "🎁 Pack x2", desc: "Recibís el doble", prob: 0.15, multiplicador: 2 },
    { id: "pack3", nombre: "🎁 Pack x3", desc: "Recibís el triple", prob: 0.05, multiplicador: 3 },
    { id: "normal", nombre: "", desc: "", prob: 0.80, multiplicador: 1 },
];
// ===== FRASES =====
const frasesExito = [
    "✅ *¡Producto legítimo!* El vendedor cumplió",
    "🎉 *¡Buena compra!* Todo salió bien",
    "✨ *¡El vendedor era honesto!* Recibiste lo que pagaste",
    "💎 *¡Buena mercancía!* Sin problemas",
    "🤝 *Trato cerrado en el callejón*",
];
const frasesFracaso = [
    "🚨 *¡TE ESTAFARON!* El vendedor escapó con tu dinero",
    "💀 *¡Era falso!* Perdiste todo",
    "🤡 *El vendedor era un estafador conocido*",
    "😭 *Producto robado, te quedaste sin nada*",
    "🏃 *Salió corriendo con tu plata y no volvió más*",
];
const frasesIlegal = [
    "\n\n🕶️ _Producto ilegal, cuidado con la policía..._",
    "\n\n🚔 _Si te agarran con esto, estás frito..._",
    "\n\n😈 _Solo para criminales de verdad..._",
];
// ===== HELPERS =====
function fmt(n) {
    return Number(n || 0).toLocaleString("es-AR");
}
function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
function generarCatalogo(seed) {
    const rng = (() => {
        let a = seed;
        return function () {
            a |= 0;
            a = a + 0x6D2B79F5 | 0;
            let t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    })();
    const itemsDisponibles = [...ITEMS_MERCADO];
    const catalogo = [];
    for (let i = 0; i < 6; i++) {
        if (itemsDisponibles.length === 0)
            break;
        const idx = Math.floor(rng() * itemsDisponibles.length);
        const item = itemsDisponibles.splice(idx, 1)[0];
        const riesgoIdx = Math.floor(rng() * RIESGOS.length);
        const riesgo = RIESGOS[riesgoIdx];
        let promo = PROMOS[PROMOS.length - 1];
        const promoRand = rng();
        let acum = 0;
        for (const p of PROMOS) {
            acum += p.prob;
            if (promoRand < acum) {
                promo = p;
                break;
            }
        }
        const cantidadBase = item.cantidad || 1;
        const cantidadFinal = cantidadBase * promo.multiplicador;
        const precioFinal = Math.ceil(item.precio_base * (1 - riesgo.descuento));
        catalogo.push({
            ...item,
            riesgo,
            promo,
            precioFinal,
            precioBase: item.precio_base,
            cantidadFinal,
        });
    }
    return catalogo;
}
function getEventoActivo(now) {
    const minutos = new Date(now).getMinutes();
    const horas = new Date(now).getHours();
    if (horas % 2 === 0 && minutos < 5) {
        return { tipo: "oferta", nombre: "⚡ ¡OFERTA RELÁMPAGO! -50% EXTRA", descuentoExtra: 0.5 };
    }
    if (horas % 2 === 1 && minutos >= 30 && minutos < 35) {
        return { tipo: "redada", nombre: "🚔 ¡REDADA POLICIAL! Mercado cerrado" };
    }
    return null;
}
export default {
    name: ["shop2", "blackmarket", "mercadonegro", "bm"],
    help: ["blackmarket", "shop2"],
    desc: "Mercado negro con productos baratos",
    tags: ["econ"],
    register: true,
    run: async ({ conn, m, args, prefijo }) => {
        try {
            const now = Date.now();
            const firstArg = (args[0] || "").toLowerCase();
            // ===== EVENTO ACTIVO =====
            const evento = getEventoActivo(now);
            // Si hay redada y NO es "info", bloquear
            if (evento?.tipo === "redada" && firstArg !== "info") {
                return m.reply(null, `🚔 *¡REDADA POLICIAL!*\n\n` +
                    `El mercado negro está cerrado por la policía.\n\n` +
                    `> Volvé en unos minutos...`);
            }
            // ==========================================================
            // 🔥 DETECTAR COMPRA
            // ==========================================================
            // Casos:
            // - .blackmarket 1        → comprar 1
            // - .blackmarket 2        → comprar 2
            // - .blackmarket comprar 1 → comprar 1 (compatibilidad)
            // - .blackmarket buy 1     → comprar 1 (compatibilidad)
            let idStr = null;
            if (firstArg === "comprar" || firstArg === "buy") {
                idStr = args[1];
            }
            else if (/^\d+$/.test(firstArg)) {
                idStr = firstArg;
            }
            if (idStr) {
                const idx = Number(idStr) - 1;
                if (isNaN(idx) || idx < 0 || idx > 3) {
                    return m.reply(null, `❌ Número inválido. Elegí del 1 al 4.`);
                }
                const seed = Math.floor(now / DURACION_CATALOGO);
                const catalogo = generarCatalogo(seed);
                const item = catalogo[idx];
                if (!item) {
                    return m.reply(null, `❌ Ese ítem ya no está disponible.`);
                }
                let precioFinal = item.precioFinal;
                if (evento?.tipo === "oferta") {
                    precioFinal = Math.ceil(precioFinal * (1 - evento.descuentoExtra));
                }
                const { rows: [user] } = await db.query("SELECT limite, inventario, picos, armas_caza, mascotas, drogas, lastmercado FROM usuarios WHERE id = $1 OR lid = $2", [m.sender, m.lid || ""]);
                if (!user)
                    return m.reply(null, "❌ No estás registrado.");
                const lastMercado = Number(user.lastmercado) || 0;
                const cd = lastMercado + COOLDOWN - now;
                if (cd > 0) {
                    const min = Math.floor(cd / 60000);
                    const seg = Math.floor((cd % 60000) / 1000);
                    const tiempo = min > 0 ? `${min}m ${seg}s` : `${seg}s`;
                    return m.reply(null, `⏳ *La policía está vigilando, volvé en ${tiempo}*`);
                }
                const wallet = Number(user.limite) || 0;
                if (wallet < precioFinal) {
                    return m.reply(null, `${m.e.warn} No tenés suficiente *${m.e.currency_emoji} ${m.e.currency_name}*\n\n` +
                        `▢ Necesitás: *${fmt(precioFinal)}*\n` +
                        `▢ Tenés: *${fmt(wallet)}*`);
                }
                // 🔥 Resolver riesgo
                const exito = Math.random() < item.riesgo.probExito;
                if (!exito) {
                    await db.query("UPDATE usuarios SET limite = limite - $1, lastmercado = $2 WHERE id = $3 OR lid = $3", [precioFinal, now, m.sender]);
                    let msg = `${pickRandom(frasesFracaso)}\n\n`;
                    msg += `▢ Intentaste comprar: *${item.nombre}*\n`;
                    msg += `▢ Pagaste: *${fmt(precioFinal)}* ${m.e.currency_emoji}\n`;
                    msg += `▢ Recibiste: *NADA* 💀\n\n`;
                    msg += `📉 Perdiste *${fmt(precioFinal)}* ${m.e.currency_emoji}`;
                    await m.reply(null, msg);
                    await m.react("🚨");
                    return;
                }
                // Éxito → entregar item
                const cantidad = item.cantidadFinal;
                let msg = `${pickRandom(frasesExito)}\n\n`;
                msg += `▢ Compraste: *${item.nombre}*\n`;
                msg += `▢ Cantidad: *${cantidad}*\n`;
                msg += `▢ Pagaste: *${fmt(precioFinal)}* ${m.e.currency_emoji}\n`;
                if (evento?.tipo === "oferta")
                    msg += `⚡ _Oferta relámpago aplicada_\n`;
                msg += `\n`;
                // ===== PICO =====
                if (item.categoria === "pico") {
                    const picos = user.picos || {};
                    if (!picos[item.key])
                        picos[item.key] = [];
                    for (let i = 0; i < cantidad; i++) {
                        picos[item.key].push({ usos: item.key === "pico_celestial" ? 0 : 20 });
                    }
                    await db.query("UPDATE usuarios SET picos = $1::jsonb, limite = limite - $2, lastmercado = $3 WHERE id = $4 OR lid = $4", [JSON.stringify(picos), precioFinal, now, m.sender]);
                    msg += `👉 Equipalo con: *${prefijo}use ${item.key}*`;
                }
                // ===== ARMA DE CAZA =====
                else if (item.categoria === "arma_caza") {
                    const armas = user.armas_caza || {};
                    if (!armas[item.key])
                        armas[item.key] = [];
                    for (let i = 0; i < cantidad; i++) {
                        armas[item.key].push({ usos: 30 });
                    }
                    await db.query("UPDATE usuarios SET armas_caza = $1::jsonb, limite = limite - $2, lastmercado = $3 WHERE id = $4 OR lid = $4", [JSON.stringify(armas), precioFinal, now, m.sender]);
                    msg += `👉 Equipala con: *${prefijo}use ${item.key}*`;
                }
                // ===== MASCOTA =====
                else if (item.categoria === "mascota") {
                    const MASCOTAS_NORMALES = ["gato", "perro", "conejo", "loro", "tortuga", "serpiente"];
                    const mascotas = Array.isArray(user.mascotas) ? user.mascotas : [];
                    const yaLaTiene = mascotas.some(x => (typeof x === "string" ? x : x.key) === item.key);
                    if (yaLaTiene) {
                        const pctReembolso = {
                            bajo: 1.00,
                            medio: 0.75,
                            alto: 0.50,
                            extremo: 0.25,
                        }[item.riesgo.id] || 1.00;
                        const reembolso = Math.floor(precioFinal * pctReembolso);
                        const perdido = precioFinal - reembolso;
                        await db.query("UPDATE usuarios SET limite = limite + $1, lastmercado = $2 WHERE id = $3 OR lid = $3", [reembolso, now, m.sender]);
                        let m2 = `⚠️ Ya tenés a *${item.nombre}*\n\n`;
                        m2 += `💸 *Devolución parcial:*\n`;
                        m2 += `▢ Pagaste: *${fmt(precioFinal)}* ${m.e.currency_emoji}\n`;
                        m2 += `▢ Te devolvieron: *${fmt(reembolso)}* ${m.e.currency_emoji} (${Math.round(pctReembolso * 100)}%)\n`;
                        if (perdido > 0) {
                            m2 += `▢ Perdiste: *${fmt(perdido)}* ${m.e.currency_emoji}\n\n`;
                            m2 += `😈 _El vendedor se quedó con una comisión..._`;
                        }
                        else {
                            m2 += `\n✅ _El vendedor fue honesto y te devolvió todo_`;
                        }
                        await m.reply(null, m2);
                        await m.react(perdido > 0 ? "😈" : "✅");
                        return;
                    }
                    mascotas.push({ key: item.key, hp: 100, last_feed: now });
                    await db.query("UPDATE usuarios SET mascotas = $1::jsonb, limite = limite - $2, lastmercado = $3 WHERE id = $4 OR lid = $4", [JSON.stringify(mascotas), precioFinal, now, m.sender]);
                    if (MASCOTAS_NORMALES.includes(item.key)) {
                        msg += `🐾 *¡Ya está contigo!*\n👉 Verla: *${prefijo}mascotas*`;
                    }
                    else {
                        msg += `👉 Equipala con: *${prefijo}use ${item.key}*`;
                    }
                }
                // ===== DROGA =====
                else if (item.categoria === "droga") {
                    const drogas = user.drogas || {};
                    const usosPorUnidad = Number(item.usos) || 10;
                    const usosNuevos = usosPorUnidad * cantidad;
                    // 🔥 Soportar formato viejo (número) y nuevo (objeto)
                    const drogaActual = drogas[item.key];
                    let usosActuales = 0;
                    if (typeof drogaActual === "number") {
                        usosActuales = drogaActual;
                    }
                    else if (typeof drogaActual === "object" && drogaActual !== null) {
                        usosActuales = Number(drogaActual.usos) || 0;
                    }
                    const usosFinales = usosActuales + usosNuevos;
                    drogas[item.key] = { usos: usosFinales };
                    await db.query("UPDATE usuarios SET drogas = $1::jsonb, limite = limite - $2, lastmercado = $3 WHERE id = $4 OR lid = $4", [JSON.stringify(drogas), precioFinal, now, m.sender]);
                    msg += pickRandom(frasesIlegal);
                    msg += `\n📦 Ahora tenés: *${usosFinales}* usos de ${item.nombre}`;
                    if (cantidad > 1) {
                        msg += ` _(+${usosNuevos} usos)_`;
                    }
                }
                // ===== RESTO =====
                else {
                    const inventario = user.inventario || {};
                    inventario[item.key] = (Number(inventario[item.key]) || 0) + cantidad;
                    await db.query("UPDATE usuarios SET inventario = $1::jsonb, limite = limite - $2, lastmercado = $3 WHERE id = $4 OR lid = $4", [JSON.stringify(inventario), precioFinal, now, m.sender]);
                    if (item.categoria === "cura")
                        msg += `👉 Usalo con: *${prefijo}use ${item.key}*`;
                    else if (item.categoria === "rpg")
                        msg += `👉 Usalo con: *${prefijo}use ${item.key}*`;
                    else if (item.categoria === "municion")
                        msg += `🎯 _Se consume al cazar_`;
                    else
                        msg += `👉 Ahora tenés: *${inventario[item.key]}* en inventario`;
                }
                await m.reply(null, msg);
                await m.react(item.ilegal ? "😈" : "🕶️");
                return;
            }
            // ==========================================================
            // 🔥 VER CATÁLOGO (sin args)
            // ==========================================================
            const seed = Math.floor(now / DURACION_CATALOGO);
            const catalogo = generarCatalogo(seed);
            const proximaRotacion = (seed + 1) * DURACION_CATALOGO;
            const minRestantes = Math.ceil((proximaRotacion - now) / 60000);
            let list = `🕶️ 「 *MERCADO NEGRO* 」\n`;
            list += `_Productos baratos, vendedores dudosos..._\n\n`;
            if (evento) {
                list += `${evento.nombre}\n\n`;
            }
            for (let i = 0; i < catalogo.length; i++) {
                const item = catalogo[i];
                let precio = item.precioFinal;
                if (evento?.tipo === "oferta") {
                    precio = Math.ceil(precio * (1 - evento.descuentoExtra));
                }
                const ahorro = item.precioBase - precio;
                const pctAhorro = Math.round((ahorro / item.precioBase) * 100);
                list += `*${i + 1}.* ${item.nombre}\n`;
                list += `💰 *${fmt(precio)}* ${m.e.currency_emoji} `;
                list += `_(antes ${fmt(item.precioBase)}, -${pctAhorro}%)_\n`;
                if (item.promo.multiplicador > 1) {
                    list += `🎁 *${item.promo.nombre}* · ${item.promo.desc}\n`;
                }
                if (item.ilegal)
                    list += `⚠️ *ILEGAL*\n`;
                list += `${item.riesgo.nombre} · ${item.riesgo.desc}\n`;
                list += `📊 Éxito: *${Math.round(item.riesgo.probExito * 100)}%*\n`;
                list += `\n`;
            }
            list += `👉 Comprar: *${prefijo}blackmarket <número>*\n`;
            list += `📌 Ej: *${prefijo}blackmarket 1*\n`;
            list += `🔄 Rotación en: *${minRestantes} min*`;
            await m.reply(null, list);
        }
        catch (err) {
            console.error("mercado error:", err);
            m.reply("❌ Ocurrió un error en el mercado.");
            await m.react("🚨");
        }
    }
};
