import { generateWAMessageFromContent } from "@whiskeysockets/baileys";
import crypto from "crypto";
async function htmlGoon(sock, jid, html) {
    const msg = generateWAMessageFromContent(jid, {
        botForwardedMessage: {
            message: {
                richResponseMessage: {
                    messageType: 1,
                    unifiedResponse: {
                        data: Buffer.from(JSON.stringify({
                            __typename: "GenAIUnifiedResponse",
                            response_id: crypto.randomUUID(),
                            sections: [{
                                    __typename: "GenAIUnifiedResponseSection",
                                    view_model: {
                                        __typename: "GenAISingleLayoutViewModel",
                                        primitive: {
                                            __typename: "FOAHtmlPrimitiveDemoDONOTUSE",
                                            trusted_sources: [],
                                            payload: html.trim()
                                        }
                                    }
                                }]
                        })).toString("base64")
                    },
                    contextInfo: { isForwarded: true, forwardOrigin: 4 }
                }
            }
        }
    }, {});
    return sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
}
const SYMBOLS = [
    { icon: "🍒", value: 2, weight: 30 },
    { icon: "🍋", value: 3, weight: 25 },
    { icon: "🔔", value: 5, weight: 18 },
    { icon: "💎", value: 8, weight: 12 },
    { icon: "7️⃣", value: 12, weight: 8 },
    { icon: "⭐", value: 20, weight: 7 }
];
function pickSymbol() {
    const total = SYMBOLS.reduce((s, x) => s + x.weight, 0);
    let r = Math.random() * total;
    for (const s of SYMBOLS) {
        r -= s.weight;
        if (r <= 0)
            return s;
    }
    return SYMBOLS[0];
}
function computeSpin(apuesta) {
    const result = [pickSymbol(), pickSymbol(), pickSymbol()];
    const isThree = result[0].icon === result[1].icon && result[1].icon === result[2].icon;
    const isTwo = result[0].icon === result[1].icon || result[1].icon === result[2].icon || result[0].icon === result[2].icon;
    let ganancia = 0;
    let multiplicador = 0;
    if (isThree) {
        // TRES IGUALES: multiplicador = valor del símbolo * 3 (redondeado)
        multiplicador = Math.floor(result[0].value * 3);
        ganancia = apuesta * multiplicador;
    }
    else if (isTwo) {
        // DOS IGUALES: multiplicador = valor del símbolo * 2 (redondeado)
        let rep = result[0];
        if (result[0].icon === result[1].icon)
            rep = result[0];
        else if (result[1].icon === result[2].icon)
            rep = result[1];
        else
            rep = result[0];
        multiplicador = Math.floor(rep.value * 2);
        ganancia = apuesta * multiplicador;
    }
    return { result, isThree, isTwo, ganancia, multiplicador };
}
export default {
    name: "slot",
    help: ["slot"],
    desc: "Apuesta EXP o diamantes",
    tags: ["game"],
    register: true,
    run: async ({ conn, m, args, prefijo }) => {
        if (!args[0]) {
            return m.reply(`🎰 *Ingresa que quiere apostar*\n\nUso:\n• ${prefijo}slot exp 100      → Apuesta EXP\n• ${prefijo}slot limite 100   → Apuesta diamantes\n\nEjemplo: ${prefijo}slot exp 100`);
        }
        let tipo = 'exp';
        let cantidad = 0;
        if (args[0].toLowerCase() === 'exp' || args[0].toLowerCase() === 'limite') {
            tipo = args[0].toLowerCase();
            cantidad = parseInt(args[1]);
        }
        else {
            cantidad = parseInt(args[0]);
        }
        if (!cantidad || isNaN(cantidad) || cantidad <= 0) {
            return m.reply(`❌ Cantidad inválida\n\nEjemplo: ${prefijo}slot 100`);
        }
        const senderJid = m.sender;
        const lid = m.lid || "";
        const check = await m.db.query(`SELECT limite, exp FROM usuarios WHERE id = $1 OR lid = $2 LIMIT 1`, [senderJid, lid]);
        if (!check.rows.length) {
            return m.reply("⚠️ No estás registrado. Usa *" + prefijo + "reg* para registrarte.");
        }
        const saldoActual = tipo === 'limite' ? check.rows[0].limite : check.rows[0].exp;
        if (cantidad > saldoActual) {
            const label = tipo === 'limite' ? '💎 Diamantes' : '⭐ EXP';
            return m.reply(`${label} insuficientes\n\nTu saldo: *${saldoActual}*\nApuesta: *${cantidad}*`);
        }
        const outcome = computeSpin(cantidad);
        const gananciaMostrar = outcome.ganancia;
        let query, params;
        if (tipo === 'limite') {
            query = `UPDATE usuarios SET limite = limite - $1 + $2 WHERE (id = $3 OR lid = $4) AND limite >= $1 RETURNING limite, exp`;
            params = [cantidad, gananciaMostrar, senderJid, lid];
        }
        else {
            query = `UPDATE usuarios SET exp = exp - $1 + $2 WHERE (id = $3 OR lid = $4) AND exp >= $1 RETURNING limite, exp`;
            params = [cantidad, gananciaMostrar, senderJid, lid];
        }
        const res = await m.db.query(query, params);
        if (!res.rows.length) {
            const label = tipo === 'limite' ? '💎 Diamantes' : '⭐ EXP';
            return m.reply(`${label} insuficientes`);
        }
        const saldos = res.rows[0];
        const saldoMostrar = tipo === 'limite' ? saldos.limite : saldos.exp;
        const label = tipo === 'limite' ? '💎' : '⭐';
        const labelNombre = tipo === 'limite' ? 'DIAMANTES' : 'EXP';
        // Generar strips para animación de carretes
        const strip1 = [];
        const strip2 = [];
        const strip3 = [];
        for (let i = 0; i < 20; i++) {
            strip1.push(pickSymbol());
            strip2.push(pickSymbol());
            strip3.push(pickSymbol());
        }
        strip1.push(outcome.result[0]);
        strip2.push(outcome.result[1]);
        strip3.push(outcome.result[2]);
        const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;background:transparent;font-family:Arial,sans-serif;overflow:hidden}
body{padding:8px;background:radial-gradient(circle at 50% 8%,#1d6a50,#0f4938 48%,#07291f)}
.machine{position:relative;overflow:hidden;padding:12px;border:3px solid #071f18;border-radius:22px;background:linear-gradient(110deg,#061e17,#1b644b 10%,#0b382a 24%,#15543f 54%,#092f24 82%,#28775a 94%,#071f18);box-shadow:inset 0 0 0 2px #b9954d,inset 0 0 0 5px #163f31,inset 0 14px 24px #73d2a31c,0 5px 0 #041a13,0 9px 16px #000c}
.machine:before{content:"";position:absolute;inset:6px;border:2px solid #b59349;border-radius:17px;pointer-events:none;box-shadow:inset 0 0 9px #4fa57a66}
.lights{height:7px;margin:0 12px 5px;border:2px solid #123d2f;border-radius:8px;background:repeating-radial-gradient(circle at 6px 50%,#dfffdc 0 2px,#82c878 3px 5px,#164936 6px 12px);box-shadow:0 0 9px #67b881;animation:lights .55s steps(2) infinite}
@keyframes lights{50%{filter:brightness(1.7)}}
.title{padding:7px 4px 5px;border:3px solid #b99a54;border-radius:12px;color:#e9e3bc;background:radial-gradient(ellipse at 50% 0,#2b8a6c,#11513f 58%,#082a24);box-shadow:inset 0 0 0 4px #244f3d,inset 0 -10px 17px #061e19,0 4px 0 #071d16;text-align:center;font:21px Impact,Arial Black,sans-serif;letter-spacing:1px;text-shadow:0 2px #193f31,2px 0 #193f31,-2px 0 #193f31}
.stats{display:flex;margin:0 2px 6px;padding:4px;border:2px solid #537d64;border-radius:9px;background:linear-gradient(#102d24,#061812);box-shadow:inset 0 0 9px #000}
.stat{flex:1;border-right:1px solid #416452;color:#91b59f;text-align:center;font:bold 10px monospace}
.stat:last-child{border:0}
.stat b{display:block;margin-top:1px;color:#e3dfbb;font-size:13px;text-shadow:0 0 6px #62a77d}
.frame{position:relative;padding:6px;border:4px solid #315c47;border-radius:14px;background:linear-gradient(90deg,#09271e,#b49a59 5%,#174936 10%,#174936 90%,#b49a59 95%,#09271e);box-shadow:inset 0 0 0 3px #071b15,0 4px 0 #09271e,0 8px 15px #000a}
.reelbox{position:relative;display:flex;gap:4px;height:150px;overflow:hidden;border:3px solid #071c15;border-radius:9px;background:#071a14;box-shadow:inset 0 9px 15px #0009,inset 0 -9px 15px #0009}
.reel{flex:1;overflow:hidden;position:relative;border-right:2px solid #6e421e;background:linear-gradient(90deg,#a58149,#fffce4 17%,#fffdf0 50%,#f7e9bd 82%,#8e6a38);box-shadow:inset 7px 0 8px #573b1d66,inset -7px 0 8px #573b1d66}
.reel:last-child{border:0}
.reel:after{content:"";position:absolute;z-index:2;inset:0;pointer-events:none;background:linear-gradient(#3b1d0fbb 0,transparent 18%,transparent 80%,#281208cc 100%);box-shadow:inset 0 9px 11px #0005,inset 0 -9px 11px #0005}
.strip{position:absolute;left:0;right:0;top:0;display:flex;flex-direction:column;will-change:transform}
.sym{height:50px;display:flex;align-items:center;justify-content:center;border-bottom:1px solid #9f7e4f66;font-family:'Apple Color Emoji','Segoe UI Emoji',Arial,sans-serif;font-size:28px;line-height:1;filter:drop-shadow(0 2px 1px rgba(0,0,0,.4))}
.payline{position:absolute;z-index:4;left:9px;right:9px;top:50%;height:3px;opacity:0;background:linear-gradient(90deg,transparent,#dfff8a 18%,#fff5b0 50%,#7fe091 82%,transparent);box-shadow:0 0 7px #efffa8,0 0 15px #65c984;pointer-events:none;transform:translateY(-50%) scaleX(.15);transform-origin:50% 50%}
.payline.on{opacity:1;animation:showline 0.45s ease forwards, jungleLine 1.15s cubic-bezier(.2,.8,.2,1) infinite}
@keyframes showline{to{opacity:1;transform:translateY(-50%) scaleX(1)}}
@keyframes jungleLine{0%{filter:brightness(1)}45%{filter:brightness(1.8)}75%,100%{filter:brightness(1)}}
.message{height:29px;margin:6px 2px 5px;display:flex;align-items:center;justify-content:center;border:2px solid #537d64;border-radius:8px;color:#e3dfbb;background:linear-gradient(#102d24,#061812);box-shadow:inset 0 0 8px #000;text-align:center;font:bold 12px monospace;text-shadow:0 0 6px #62a77d}
.message.win{color:#4ade80;border-color:#4ade80}
.message.jackpot{color:#facc15;border-color:#facc15;animation:glow 0.8s infinite alternate}
.message.lose{color:#f87171;border-color:#f87171}
@keyframes glow{0%{box-shadow:inset 0 0 8px #000}100%{box-shadow:inset 0 0 14px #7ddc8a,0 0 13px #74ce82}}
.tray{width:49%;height:14px;margin:9px auto 0;border:3px solid #244d3a;border-radius:4px 4px 10px 10px;background:#061a13;box-shadow:inset 0 6px 9px #000,0 3px #897945}
.footer{text-align:center;font-size:9px;color:#5a8a7a;margin-top:6px}
</style>
</head>
<body>
<div class="machine">
  <div class="lights"></div>
  <div class="title">🎰 TRAGAMONEDAS</div>
  <div class="stats">
    <div class="stat">💰 APUESTA<b>${cantidad}</b></div>
    <div class="stat">${labelNombre}<b>${saldoMostrar}</b></div>
    <div class="stat">🏆 GANANCIA<b>${gananciaMostrar}</b></div>
  </div>
  <div class="frame">
    <div class="reelbox" id="reelbox">
      <div class="reel" id="reel1"><div class="strip" id="strip1">${strip1.map(s => `<div class="sym">${s.icon}</div>`).join('')}</div></div>
      <div class="reel" id="reel2"><div class="strip" id="strip2">${strip2.map(s => `<div class="sym">${s.icon}</div>`).join('')}</div></div>
      <div class="reel" id="reel3"><div class="strip" id="strip3">${strip3.map(s => `<div class="sym">${s.icon}</div>`).join('')}</div></div>
      <i class="payline ${outcome.isThree || outcome.isTwo ? 'on' : ''}"></i>
    </div>
  </div>
  <div class="message ${outcome.isThree ? 'jackpot' : outcome.isTwo ? 'win' : 'lose'}">
    ${outcome.isThree ? '🎉 JACKPOT! +' + gananciaMostrar : outcome.isTwo ? '✨ Ganaste +' + gananciaMostrar : '😅 Sin suerte -' + cantidad}
    ${outcome.multiplicador > 0 ? ' (×' + outcome.multiplicador + ')' : ''}
  </div>
  <div class="tray"></div>
  <div class="footer">${label} ${tipo === 'limite' ? 'Diamantes' : 'EXP'} | Usa .slot ${cantidad} para jugar de nuevo</div>
</div>
<script>
(function(){
  const strip1 = document.getElementById('strip1');
  const strip2 = document.getElementById('strip2');
  const strip3 = document.getElementById('strip3');
  
  const totalItems = ${strip1.length};
  const itemHeight = 50;
  const visibleItems = 3;
  
  const finalPos1 = (totalItems - visibleItems) * itemHeight;
  const finalPos2 = (totalItems - visibleItems) * itemHeight;
  const finalPos3 = (totalItems - visibleItems) * itemHeight;
  
  const duration = 4000;
  
  setTimeout(() => {
    strip1.style.transition = 'transform ' + duration + 'ms cubic-bezier(0.08,0.82,0.17,1)';
    strip1.style.transform = 'translateY(-' + finalPos1 + 'px)';
  }, 100);
  
  setTimeout(() => {
    strip2.style.transition = 'transform ' + duration + 'ms cubic-bezier(0.08,0.82,0.17,1)';
    strip2.style.transform = 'translateY(-' + finalPos2 + 'px)';
  }, 400);
  
  setTimeout(() => {
    strip3.style.transition = 'transform ' + duration + 'ms cubic-bezier(0.08,0.82,0.17,1)';
    strip3.style.transform = 'translateY(-' + finalPos3 + 'px)';
  }, 700);
  
  document.addEventListener('click', function() {
    window.location.href = 'whatsapp://send?text=${encodeURIComponent(prefijo + 'slot ' + (tipo === 'limite' ? 'limite ' : '') + cantidad)}';
  });
})();
</script>
</body>
</html>`;
        try {
            await htmlGoon(conn, m.chat, html);
            await m.react(outcome.ganancia > 0 ? "🎰" : "😅");
        }
        catch (error) {
            console.error("❌ Error enviando HTML:", error);
            const emojis = outcome.result.map(s => s.icon).join(' ');
            const msgText = outcome.ganancia > 0
                ? `🎰 *${outcome.isThree ? 'JACKPOT!' : 'Ganaste!'}*\n\n${emojis}\n\n${label} +${outcome.ganancia} (×${outcome.multiplicador})\n${label} ${tipo === 'limite' ? 'Diamantes' : 'EXP'}: ${saldoMostrar}`
                : `🎰 *Sin suerte*\n\n${emojis}\n\n${label} -${cantidad}\n${label} ${tipo === 'limite' ? 'Diamantes' : 'EXP'}: ${saldoMostrar}`;
            await m.reply(msgText);
        }
    }
};
