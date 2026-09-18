// @ts-nocheck
import { calcularDeudaTotal } from "../lib/rpg-prestamo-utils.js";
function fmt(n) {
    return Number(n || 0).toLocaleString("es-AR");
}
function msToTime(ms) {
    if (!ms || ms <= 0)
        return "0s";
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    const sec = s % 60;
    const min = m % 60;
    const hr = h % 24;
    if (d > 0)
        return `${d}d ${hr}h`;
    if (h > 0)
        return `${h}h ${min}m`;
    if (m > 0)
        return `${m}m`;
    return `${sec}s`;
}
export default {
    name: ["bal", "balance"],
    help: ["bal"],
    desc: "ver tu balance actual de XP",
    tags: ["econ"],
    register: true,
    run: async ({ conn, m, prefijo }) => {
        const who = m.quoted?.sender ||
            m.mentionedJid?.[0] ||
            m.sender;
        const res = await m.db.query(`SELECT limite, money, exp, banco, prestamo_cuotas, prestamo_activo
       FROM usuarios 
       WHERE id = $1 OR lid = $1`, [who]);
        if (res.rowCount === 0) {
            return m.reply(`✳️ Ese usuario no está registrado.`);
        }
        const user = res.rows[0];
        const bank = Number(user.banco || 0);
        // ===== PRÉSTAMO =====
        const prestamoActivo = user.prestamo_activo === true;
        const prestamo = user.prestamo_cuotas || {};
        let prestamoInfo = "";
        if (prestamoActivo && prestamo.cuotas) {
            const deudaTotal = calcularDeudaTotal(prestamo, Date.now());
            const pendientes = prestamo.cuotas.filter(c => !c.pagada);
            const pagadas = prestamo.cuotas.filter(c => c.pagada).length;
            const proxima = pendientes[0];
            const cuotaVencida = pendientes.find(c => c.vence < Date.now());
            prestamoInfo = `\n•──── 《 🏦 *PRÉSTAMO* 》 ────•\n\n`;
            prestamoInfo += `▢ 💸 *Deuda:* ${fmt(deudaTotal)} ${m.e.currency_emoji}\n`;
            prestamoInfo += `▢ 📦 *Cuotas:* ${pagadas}/${prestamo.cantidadCuotas}\n`;
            if (cuotaVencida) {
                const diasVencido = Math.floor((Date.now() - cuotaVencida.vence) / (24 * 60 * 60 * 1000));
                prestamoInfo += `▢ ⚠️ *¡Cuotas vencidas!* (${diasVencido}d)\n`;
            }
            else if (proxima) {
                const falta = proxima.vence - Date.now();
                prestamoInfo += `▢ ⏰ *Próxima:* en ${msToTime(falta)}\n`;
            }
        }
        // ===== DISPLAY NAME =====
        let displayName = who.split('@')[0];
        let mentionJid = who;
        if (m.isGroup) {
            try {
                const metadata = await conn.groupMetadata(m.chat);
                const participant = metadata.participants.find((p) => {
                    const ids = [p.id, p.phoneNumber, p.lid].filter(Boolean);
                    return ids.some(id => id === who || id === who.split('@')[0]);
                });
                if (participant) {
                    if (participant.username) {
                        displayName = participant.username;
                        mentionJid = participant.id || who;
                    }
                    else if (participant.phoneNumber) {
                        displayName = participant.phoneNumber.split('@')[0];
                        mentionJid = participant.phoneNumber;
                    }
                    else if (participant.id) {
                        displayName = participant.id.split('@')[0];
                        mentionJid = participant.id;
                    }
                }
            }
            catch (e) {
                console.log("⚠️ Error obteniendo metadata para bal:", e.message);
            }
        }
        let txt = `
▢ *${m.e.currency_emoji} ${m.e.currency_name}:* ${fmt(user.limite)}
▢ *⬆️ Exp:*  ${fmt(user.exp)}
> Afuera del Banco 

•───── 《 🏦 *BANCO* 》 ─────•

▢ *🏦 Dinero:* ${fmt(bank)} ${m.e.currency_emoji}
> Adentro del Banco 🏦\n`;
        txt += prestamoInfo;
        txt += `\n•───────────────•\n\n`;
        txt += `*𝐍𝐎𝐓𝐀:* puedes comprar ${m.e.currency_emoji} ${m.e.currency_name} usando los comandos\n`;
        txt += `• ${prefijo}buy <cantidad>\n`;
        txt += `• ${prefijo}buyall\n\n`;
        txt += `*Comprar productos y mejorar tu inventario con:*\n`;
        txt += `${prefijo}shop\n`;
        txt += `${prefijo}shop2\n\n`;
        txt += `*Pedir prestamos al banco con:*\n`;
        txt += `${prefijo}prestamo\n`;
        txt += `${prefijo}pagarlo\n\n`;
        txt += `*Guardar tus ${m.e.currency_name} en el banco:*\n`;
        txt += `${prefijo}dep <cantidad>\n\n`;
        txt += `*Retirar tus ${m.e.currency_name} del banco:*\n`;
        txt += `${prefijo}retirar <cantidad>`;
        await m.reply(`*•───⧼⧼⧼ 𝙱𝙰𝙻𝙰𝙽𝙲𝙴 ⧽⧽⧽───•*\n\n@${displayName} Tiene:`, txt);
    }
};
