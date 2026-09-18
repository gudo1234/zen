// @ts-nocheck
import { db } from "../lib/db.js";
import { INTERES_BASE, getCantidadCuotas, getLimitePrestamo, crearCuotas, calcularDeudaTotal, calcularMontoCuota, msToTime, DIA_MS, } from "../lib/rpg-prestamo-utils.js";
function fmt(n) {
    return Number(n || 0).toLocaleString("es-AR");
}
export default {
    name: ["prestamo", "prestamos", "loan", "pagarlo", "pay"],
    help: ["prestamo <cantidad>", "prestamo", "pagarlo <cuotas>"],
    desc: "Préstamos al banco con cuotas",
    tags: ["econ"],
    register: true,
    run: async ({ conn, m, args, prefijo, cmd }) => {
        try {
            const now = Date.now();
            const cmdLower = (cmd || "").toLowerCase();
            const { rows: [user] } = await db.query(`SELECT banco, prestamo_cuotas, prestamo_activo, prestamo_historial
         FROM usuarios WHERE id = $1 OR lid = $2`, [m.sender, m.lid || ""]);
            if (!user)
                return m.reply(null, "❌ No estás registrado.");
            const activo = user.prestamo_activo === true;
            const prestamo = user.prestamo_cuotas || {};
            const historial = Number(user.prestamo_historial) || 0;
            const limiteActual = getLimitePrestamo(historial);
            const banco = Number(user.banco) || 0;
            // ==========================================================
            // 🔥 .pagarlo → PAGAR CUOTAS
            // ==========================================================
            if (cmdLower === "pagarlo" || cmdLower === "pay") {
                if (!activo) {
                    return m.reply(null, `✅ *No tenés préstamo activo*`);
                }
                if (banco <= 0) {
                    return m.reply(null, `❌ No tenés diamantes en el banco.\n\n> Depositá con *${prefijo}dep*`);
                }
                const cuotasPendientes = prestamo.cuotas.filter(c => !c.pagada);
                if (cuotasPendientes.length === 0) {
                    return m.reply(null, `✅ No tenés cuotas pendientes`);
                }
                let cantidadPagar = 0;
                if (args[0] && /all/i.test(args[0])) {
                    cantidadPagar = cuotasPendientes.length;
                }
                else if (args[0] && /^\d+$/.test(args[0])) {
                    cantidadPagar = Math.min(Number(args[0]), cuotasPendientes.length);
                }
                else {
                    return m.reply(null, `⚠️ *Uso: ${prefijo}pagarlo <cuotas>*\n\n` +
                        `▢ *${prefijo}pagarlo 1* → 1 cuota\n` +
                        `▢ *${prefijo}pagarlo 3* → 3 cuotas\n` +
                        `▢ *${prefijo}pagarlo all* → todas\n\n` +
                        `👉 Pendientes: *${cuotasPendientes.length}* cuotas`);
                }
                let totalPagar = 0;
                const cuotasAPagar = [];
                for (let i = 0; i < cantidadPagar; i++) {
                    const cuota = cuotasPendientes[i];
                    if (!cuota)
                        break;
                    const monto = calcularMontoCuota(cuota, now);
                    totalPagar += monto;
                    cuotasAPagar.push({ num: cuota.num, monto });
                }
                if (banco < totalPagar) {
                    return m.reply(null, `❌ *No tenés suficiente en el banco*\n\n` +
                        `▢ Necesitás: *${fmt(totalPagar)}* 💎\n` +
                        `▢ Tenés: *${fmt(banco)}* 💎`);
                }
                const numerosPagados = cuotasAPagar.map(c => c.num);
                const nuevasCuotas = prestamo.cuotas.map(c => {
                    if (numerosPagados.includes(c.num))
                        return { ...c, pagada: true };
                    return c;
                });
                const restantes = nuevasCuotas.filter(c => !c.pagada);
                const terminado = restantes.length === 0;
                const nuevoHistorial = terminado ? historial + 1 : historial;
                await db.query(`UPDATE usuarios 
           SET banco = banco - $1, 
               prestamo_cuotas = $2::jsonb, 
               prestamo_activo = $3,
               prestamo_historial = $4
           WHERE id = $5 OR lid = $5`, [totalPagar, JSON.stringify({ ...prestamo, cuotas: nuevasCuotas }), !terminado, nuevoHistorial, m.sender]);
                let msg = `✅ *PAGO EXITOSO*\n\n`;
                msg += `▢ Pagaste: *${fmt(totalPagar)}* 💎\n`;
                msg += `▢ Cuotas: *${cuotasAPagar.length}*\n\n`;
                msg += `📋 *Detalle:*\n`;
                for (const c of cuotasAPagar) {
                    msg += `▢ Cuota ${c.num}: *${fmt(c.monto)}* 💎\n`;
                }
                if (terminado) {
                    msg += `\n🎉 *¡PRÉSTAMO LIQUIDADO!*\n`;
                    msg += `▢ Nuevo límite: *${fmt(getLimitePrestamo(nuevoHistorial))}* 💎`;
                    await m.react("🎉");
                }
                else {
                    msg += `\n📦 Restantes: *${restantes.length}*`;
                    await m.react("💵");
                }
                return m.reply(null, msg);
            }
            // ==========================================================
            // 🔥 .prestamo <cantidad> → PEDIR
            // ==========================================================
            if (args[0] && /^\d+$/.test(args[0])) {
                if (activo) {
                    const deudaTotal = calcularDeudaTotal(prestamo, now);
                    return m.reply(null, `⚠️ *Ya tenés un préstamo activo*\n\n` +
                        `▢ Deuda: *${fmt(deudaTotal)}* 💎\n` +
                        `▢ Cuotas: *${prestamo.cuotas.filter(c => !c.pagada).length}* pendientes\n\n` +
                        `> Pagalo con *${prefijo}pagarlo*`);
                }
                const cantidad = Number(args[0]);
                if (cantidad < 100) {
                    return m.reply(null, `⚠️ El mínimo es *100* ${m.e.currency_emoji}`);
                }
                if (cantidad > limiteActual) {
                    return m.reply(null, `❌ *Excede tu límite*\n\n` +
                        `▢ Tu límite: *${fmt(limiteActual)}* 💎\n` +
                        `▢ Pediste: *${fmt(cantidad)}* 💎`);
                }
                const interes = Math.floor(cantidad * INTERES_BASE);
                const montoTotal = cantidad + interes;
                const cantidadCuotas = getCantidadCuotas(cantidad);
                const cuotas = crearCuotas(cantidad, interes, cantidadCuotas, now);
                await db.query(`UPDATE usuarios 
           SET banco = banco + $1, 
               prestamo_cuotas = $2::jsonb, 
               prestamo_activo = true
           WHERE id = $3 OR lid = $3`, [cantidad, JSON.stringify({
                        montoOriginal: cantidad,
                        interesBase: interes,
                        montoTotal,
                        cantidadCuotas,
                        cuotas,
                        fechaCreacion: now,
                    }), m.sender]);
                let msg = `🏦 *¡PRÉSTAMO APROBADO!*\n\n`;
                msg += `▢ Recibiste: *${fmt(cantidad)}* ${m.e.currency_emoji} (al banco)\n`;
                msg += `▢ Interés: *${fmt(interes)}* ${m.e.currency_emoji} (10%)\n`;
                msg += `▢ Total a pagar: *${fmt(montoTotal)}* ${m.e.currency_emoji}\n`;
                msg += `▢ Cuotas: *${cantidadCuotas}*\n\n`;
                msg += `📅 *Calendario:*\n`;
                for (const c of cuotas) {
                    const dias = Math.floor((c.vence - now) / DIA_MS);
                    msg += `▢ Cuota ${c.num}: *${fmt(c.monto)}* 💎 (en ${dias} día${dias > 1 ? "s" : ""})\n`;
                }
                msg += `\n⚠️ _Si pasan 3 días sin pagar, el banco cobra automático + interés_`;
                await m.reply(null, msg);
                await m.react("🏦");
                return;
            }
            // ==========================================================
            // 🔥 .prestamo → VER ESTADO
            // ==========================================================
            let txt = `╭─「 🏦 *PRÉSTAMOS* 」\n│\n`;
            if (!activo) {
                txt += `│ ✅ *No tenés préstamo activo*\n│\n`;
                txt += `│ 💼 *Tu límite:* ${fmt(limiteActual)} ${m.e.currency_emoji}\n`;
                txt += `│ 📊 *Historial:* ${historial} pagados\n│\n`;
                txt += `│ 💰 *Interés:* 10%\n`;
                txt += `│ 📅 *Cuotas:* según monto (6 a 12)\n`;
                txt += `│ ⏰ *1 cuota cada 24h*\n`;
                txt += `╰───────────────\n\n`;
                txt += `👉 Pedir: *${prefijo}prestamo <cantidad>*\n`;
                txt += `📌 Ej: *${prefijo}prestamo 500*`;
            }
            else {
                const deudaTotal = calcularDeudaTotal(prestamo, now);
                const pagadas = prestamo.cuotas.filter(c => c.pagada).length;
                txt += `│ 💸 *PRÉSTAMO ACTIVO*\n│\n`;
                txt += `│ ▢ Pediste: ${fmt(prestamo.montoOriginal)} ${m.e.currency_emoji}\n`;
                txt += `│ ▢ Total original: ${fmt(prestamo.montoTotal)} ${m.e.currency_emoji}\n`;
                txt += `│ ▢ Pagado: *${fmt(prestamo.montoTotal - deudaTotal)}* ${m.e.currency_emoji}\n`;
                txt += `│ ▢ Deuda actual: *${fmt(deudaTotal)}* ${m.e.currency_emoji}\n`;
                txt += `│ ▢ Cuotas: *${pagadas}/${prestamo.cantidadCuotas}*\n│\n`;
                txt += `│ 📋 *Cuotas:*\n`;
                for (const c of prestamo.cuotas) {
                    if (c.pagada) {
                        txt += `│ ✅ Cuota ${c.num}: ${fmt(c.monto)} 💎\n`;
                    }
                    else {
                        const montoActual = calcularMontoCuota(c, now);
                        const vencido = c.vence < now;
                        const diasVencido = Math.floor((now - c.vence) / DIA_MS);
                        if (vencido && diasVencido > 3) {
                            txt += `│ ⚠️ Cuota ${c.num}: *${fmt(montoActual)}* 💎 (vencida ${diasVencido}d)\n`;
                        }
                        else if (vencido) {
                            txt += `│ ⏰ Cuota ${c.num}: ${fmt(montoActual)} 💎 (gracia ${3 - diasVencido}d)\n`;
                        }
                        else {
                            const falta = msToTime(c.vence - now);
                            txt += `│ ⬜ Cuota ${c.num}: ${fmt(c.monto)} 💎 (en ${falta})\n`;
                        }
                    }
                }
                txt += `╰───────────────\n\n`;
                txt += `👉 Pagar: *${prefijo}pagarlo <cuotas>*`;
            }
            return m.reply(null, txt);
        }
        catch (e) {
            console.error("❌ Error en prestamo:", e);
            m.reply(`❌ Error: ${e.message || e}`);
        }
    }
};
