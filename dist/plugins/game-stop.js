// plugins/slot.ts
import { generateWAMessageFromContent } from "@whiskeysockets/baileys";
import crypto from "crypto";
// Función para enviar HTML interactivo
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
                            sections: [
                                {
                                    __typename: "GenAIUnifiedResponseSection",
                                    view_model: {
                                        __typename: "GenAISingleLayoutViewModel",
                                        primitive: {
                                            __typename: "FOAHtmlPrimitiveDemoDONOTUSE",
                                            trusted_sources: [],
                                            payload: html.trim()
                                        }
                                    }
                                }
                            ]
                        })).toString("base64")
                    },
                    contextInfo: {
                        isForwarded: true,
                        forwardOrigin: 4
                    }
                }
            }
        }
    }, {});
    return sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
}
// Espera el siguiente mensaje de texto del mismo usuario en el mismo chat.
// Se usa cuando el usuario escribe ".slot" sin monto: le preguntamos cuánto
// quiere apostar y esperamos que responda con un número + Enter.
// Nota: esto es un puente por TEXTO, no un botón interactivo real — WhatsApp
// no permite que un botón dentro de un HTML "reenviado" dispare acciones en
// el bot, así que la única forma legítima de capturar la respuesta del
// usuario es escuchando su siguiente mensaje.
function waitForReply(conn, chatId, senderId, timeoutMs = 45000) {
    return new Promise((resolve) => {
        let done = false;
        const finish = (value) => {
            if (done)
                return;
            done = true;
            try {
                conn.ev.off("messages.upsert", handler);
            }
            catch { }
            clearTimeout(timer);
            resolve(value);
        };
        const handler = (update) => {
            const msgs = update?.messages || [];
            for (const msg of msgs) {
                if (!msg?.message)
                    continue;
                if (msg.key?.remoteJid !== chatId)
                    continue;
                const participant = msg.key?.participant || msg.key?.remoteJid;
                if (participant !== senderId)
                    continue;
                const text = msg.message.conversation ||
                    msg.message.extendedTextMessage?.text ||
                    msg.message.imageMessage?.caption ||
                    "";
                if (text && text.trim().length > 0) {
                    finish(text.trim());
                    return;
                }
            }
        };
        try {
            conn.ev.on("messages.upsert", handler);
        }
        catch {
            finish(null);
            return;
        }
        const timer = setTimeout(() => finish(null), timeoutMs);
    });
}
export default {
    name: "slot",
    help: ["slot <apuesta>"],
    desc: "🎰 Juego de tragamonedas. Apuesta tus diamantes y prueba tu suerte.",
    tags: ["game"],
    register: true,
    run: async ({ conn, m, args, prefijo, cmd }) => {
        let apuesta = parseInt(args[0]);
        // Si escribió solo ".slot" sin monto, se lo preguntamos y esperamos su respuesta
        if (!args[0]) {
            await m.reply(`🎰 *TRAGAMONEDAS*\n\n💬 ¿Cuánto quieres apostar?\nEscribe la cantidad y presiona *Enter*.\n\n⏳ Tienes 45 segundos para responder.`);
            const reply = await waitForReply(conn, m.chat, m.sender);
            if (!reply) {
                return m.reply(`⌛ Se acabó el tiempo. Usa *${prefijo + cmd} <cantidad>* cuando quieras jugar.`);
            }
            apuesta = parseInt(reply.replace(/[^\d]/g, ""));
        }
        if (!apuesta || isNaN(apuesta) || apuesta <= 0) {
            return m.reply(`🎰 *TRAGAMONEDAS*\n\n⚠️ Debes especificar una cantidad válida para apostar.\n\n📌 Ejemplo: ${prefijo + cmd} 50`);
        }
        const senderJid = m.sender;
        const lid = m.lid || "";
        // Obtener datos del usuario (money, limite, exp)
        const res = await m.db.query(`SELECT money, limite, exp, premium, premium_until 
       FROM usuarios 
       WHERE id = $1 OR lid = $2 
       LIMIT 1`, [senderJid, lid]);
        if (res.rows.length === 0) {
            return m.reply(`⚠️ *No estás registrado.*\n\nUsa el comando *${prefijo}reg* para registrarte.`);
        }
        const userData = res.rows[0];
        let saldo = userData.money || 0;
        const limite = userData.limite || 10;
        const exp = userData.exp || 0;
        // Verificar si es premium
        const isPremium = userData.premium && (userData.premium_until || 0) > Date.now();
        if (apuesta > saldo) {
            return m.reply(`🎰 *SALDO INSUFICIENTE*\n\n💰 Tu saldo: *${saldo} ${m.e.currency_name}*\n🎰 Apuesta: *${apuesta} ${m.e.currency_name}*\n\n📌 Usa ${prefijo}daily o ${prefijo}work para ganar más.`);
        }
        // === SISTEMA DE PREMIOS DINÁMICOS ===
        const baseMultiplier = Math.min(apuesta / 10, 5) + 1;
        const expBonus = Math.floor(exp / 1000) + 1;
        const limiteBonus = Math.floor(limite / 5) + 1;
        const premiumBonus = isPremium ? 2 : 1;
        const maxMultiplier = Math.min(baseMultiplier * expBonus * limiteBonus * premiumBonus, 50);
        // ===== SÍMBOLOS CON PESOS =====
        const symbols = [
            { icon: "🍒", value: 1, name: "Cerezas", weight: 30 },
            { icon: "🍋", value: 2, name: "Limones", weight: 25 },
            { icon: "🍊", value: 3, name: "Naranjas", weight: 20 },
            { icon: "🍇", value: 4, name: "Uvas", weight: 15 },
            { icon: "🔔", value: 5, name: "Campana", weight: 10 },
            { icon: "💎", value: 8, name: "Diamante", weight: 8 },
            { icon: "⭐", value: 12, name: "Estrella", weight: 5 },
            { icon: "👑", value: 20, name: "Corona", weight: 3 },
            { icon: "7️⃣", value: 25, name: "Siete", weight: 2 }
        ];
        const totalWeight = symbols.reduce((sum, s) => sum + s.weight, 0);
        const getWeightedSymbol = () => {
            let random = Math.random() * totalWeight;
            for (const sym of symbols) {
                random -= sym.weight;
                if (random <= 0)
                    return sym;
            }
            return symbols[0];
        };
        // Generamos 3x3 (fila del medio = resultado real) para efecto visual tipo tragamonedas real
        const reelsGrid = [0, 1, 2].map(() => [getWeightedSymbol(), getWeightedSymbol(), getWeightedSymbol()]);
        const result = [reelsGrid[0][1], reelsGrid[1][1], reelsGrid[2][1]]; // fila central = resultado
        const isThreeOfAKind = result[0].icon === result[1].icon && result[1].icon === result[2].icon;
        const isTwoOfAKind = result[0].icon === result[1].icon ||
            result[1].icon === result[2].icon ||
            result[0].icon === result[2].icon;
        let multiplicador = 0;
        let ganancia = 0;
        let resultadoText = "";
        let cssClass = "";
        if (isThreeOfAKind) {
            const baseMul = result[0].value * 3;
            multiplicador = Math.min(Math.floor(baseMul * (expBonus / 2) * (limiteBonus / 2) * premiumBonus), maxMultiplier);
            ganancia = apuesta * multiplicador;
            resultadoText = "🎉 JACKPOT 🎉";
            cssClass = "jackpot";
        }
        else if (isTwoOfAKind) {
            let repeatedSymbol = result[0];
            if (result[0].icon === result[1].icon)
                repeatedSymbol = result[0];
            else if (result[1].icon === result[2].icon)
                repeatedSymbol = result[1];
            else
                repeatedSymbol = result[0];
            const baseMul = repeatedSymbol.value * 1.5;
            multiplicador = Math.min(Math.floor(baseMul * (expBonus / 3) * (limiteBonus / 3) * premiumBonus), maxMultiplier);
            multiplicador = Math.max(multiplicador, 2);
            ganancia = apuesta * multiplicador;
            resultadoText = `✨ ${repeatedSymbol.name.toUpperCase()} ✨`;
            cssClass = "win";
        }
        else {
            ganancia = 0;
            multiplicador = 0;
            resultadoText = "😅 SIN SUERTE";
            cssClass = "lose";
        }
        const nuevoSaldo = saldo - apuesta + ganancia;
        const expGanada = isThreeOfAKind ? Math.floor(ganancia / 2) : isTwoOfAKind ? Math.floor(ganancia / 4) : Math.floor(apuesta / 10);
        const nuevoExp = exp + expGanada;
        const nuevoLimite = Math.floor(nuevoExp / 1000) + 10;
        await m.db.query(`UPDATE usuarios 
       SET money = $1, exp = $2, limite = $3
       WHERE id = $4 OR lid = $5`, [nuevoSaldo, nuevoExp, nuevoLimite, senderJid, lid]);
        const isWin = ganancia > 0;
        const bestWin = Math.max(ganancia, 0);
        // ===== Tiras de símbolos para el giro real (CSS translateY, sin canvas) =====
        const CELL = 50; // alto de cada símbolo (reelbox = 150px = 3 * 50)
        const EXTRA_ROWS = 16; // símbolos random antes de llegar al resultado final
        function buildStrip(finalCol) {
            const filler = Array.from({ length: EXTRA_ROWS }, () => getWeightedSymbol());
            return [...filler, ...finalCol]; // termina en [top, mid, bot] = resultado real
        }
        const strips = reelsGrid.map(col => buildStrip(col));
        const finalOffset = EXTRA_ROWS * CELL;
        const spinDurations = [1.55, 1.9, 2.25]; // cascada, igual que carretes reales
        const spinDelays = [0, 0.1, 0.2];
        const reelsHtml = strips.map((strip, i) => {
            const cells = strip.map(s => `<div class="sym">${s.icon}</div>`).join('');
            return `
        <div class="reel">
          <div class="strip" style="
            --final:-${finalOffset}px;
            animation: spin${i} ${spinDurations[i]}s cubic-bezier(.13,.85,.2,1) ${spinDelays[i]}s both;
          ">${cells}</div>
        </div>`;
        }).join('');
        const spinKeyframes = strips.map((_, i) => `
      @keyframes spin${i}{
        0%{transform:translateY(0)}
        62%{transform:translateY(calc(var(--final) - ${16 + i * 5}px))}
        80%{transform:translateY(calc(var(--final) + ${5 - i}px))}
        100%{transform:translateY(var(--final))}
      }`).join('');
        const totalSpin = Math.max(...spinDurations) + Math.max(...spinDelays);
        const resultDelay = (totalSpin + 0.12).toFixed(2);
        // ===== HTML — estilo carnaval verde/dorado (mismo lenguaje visual del video de referencia) =====
        const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
*{box-sizing:border-box}
html,body{margin:0;width:100%;overflow:hidden;background:transparent;font-family:Arial,sans-serif;overscroll-behavior:none}
body{padding:6px;background:radial-gradient(circle at 50% 8%,#1d6a50,#0f4938 48%,#07291f)}

.machine{position:relative;overflow:hidden;padding:10px 12px 12px;border:3px solid #071f18;border-radius:22px;
  background:linear-gradient(110deg,#061e17,#1b644b 10%,#0b382a 24%,#15543f 54%,#092f24 82%,#28775a 94%,#071f18);
  box-shadow:inset 0 0 0 2px #b9954d,inset 0 0 0 5px #163f31,inset 0 14px 24px #73d2a31c,0 5px 0 #041a13,0 9px 16px #000c;
  touch-action:none}
.machine:before{content:"";position:absolute;inset:6px;border:2px solid #b59349;border-radius:17px;pointer-events:none;box-shadow:inset 0 0 9px #4fa57a66}

.lights{height:7px;margin:0 12px 5px;border:2px solid #123d2f;border-radius:8px;
  background:repeating-radial-gradient(circle at 6px 50%,#dfffdc 0 2px,#82c878 3px 5px,#164936 6px 12px);
  box-shadow:0 0 9px #67b881;animation:lights .55s steps(2) infinite}
@keyframes lights{50%{filter:brightness(1.7)}}

.title{padding:7px 4px 5px;border:3px solid #b99a54;border-radius:50% 50% 11px 11px/30% 30% 10px 10px;
  color:#e9e3bc;background:radial-gradient(ellipse at 50% 0,#2b8a6c,#11513f 58%,#082a24);
  box-shadow:inset 0 0 0 4px #244f3d,inset 0 -10px 17px #061e19,0 4px 0 #071d16;
  text-align:center;font:21px Impact,Arial Black,sans-serif;letter-spacing:1px;
  text-shadow:0 2px #193f31,2px 0 #193f31,-2px 0 #193f31;position:relative}

.badge-premium{position:absolute;top:-6px;right:-4px;font:700 8px Arial;letter-spacing:.5px;
  color:#12452f;background:linear-gradient(180deg,#ffe9a8,#d8b13a);padding:3px 7px;border-radius:9px;
  border:1px solid #7a5716;z-index:3}

.jackpot{width:80%;margin:3px auto 5px;padding:3px;border:2px solid #a98c4d;border-radius:10px;
  color:#ded7ad;background:linear-gradient(#245d48,#0b3025);box-shadow:inset 0 2px 5px #8ed3a233;
  text-align:center;font:bold 10px monospace;letter-spacing:1px}

.stats{display:flex;margin:0 2px 6px;padding:4px;border:2px solid #537d64;border-radius:9px;
  background:linear-gradient(#102d24,#061812);box-shadow:inset 0 0 9px #000}
.stat{flex:1;border-right:1px solid #416452;color:#91b59f;text-align:center;font:bold 10px monospace}
.stat:last-child{border:0}
.stat b{display:block;margin-top:1px;color:#e3dfbb;font-size:13px;text-shadow:0 0 6px #62a77d}

.frame{position:relative;padding:6px;border:4px solid #315c47;border-radius:14px;
  background:linear-gradient(90deg,#09271e,#b49a59 5%,#174936 10%,#174936 90%,#b49a59 95%,#09271e);
  box-shadow:inset 0 0 0 3px #071b15,0 4px 0 #09271e,0 8px 15px #000a}
.reelbox{position:relative;display:grid;grid-template-columns:repeat(3,1fr);height:150px;overflow:hidden;
  border:3px solid #071c15;border-radius:9px;background:#071a14;
  box-shadow:inset 0 9px 15px #0009,inset 0 -9px 15px #0009}
.reel{position:relative;overflow:hidden;border-right:2px solid #6e421e;
  background:linear-gradient(90deg,#a58149,#fffce4 17%,#fffdf0 50%,#f7e9bd 82%,#8e6a38);
  box-shadow:inset 7px 0 8px #573b1d66,inset -7px 0 8px #573b1d66}
.reel:last-child{border:0}
.reel:after{content:"";position:absolute;z-index:2;inset:0;pointer-events:none;
  background:linear-gradient(#3b1d0fbb 0,transparent 18%,transparent 80%,#281208cc 100%);
  box-shadow:inset 0 9px 11px #0005,inset 0 -9px 11px #0005}
.strip{position:absolute;left:0;right:0;top:0;will-change:transform}
.sym{height:50px;display:grid;place-items:center;border-bottom:1px solid #9f7e4f66;
  font-family:'Apple Color Emoji','Segoe UI Emoji',Arial,sans-serif;font-size:28px;line-height:1;
  filter:drop-shadow(0 2px 1px rgba(0,0,0,.4))}

.payline{position:absolute;z-index:4;left:9px;right:9px;top:50%;height:3px;transform:translateY(-50%) scaleX(.15);
  transform-origin:50% 50%;opacity:0;pointer-events:none;
  background:linear-gradient(90deg,transparent,#dfff8a 18%,#fff5b0 50%,#7fe091 82%,transparent);
  box-shadow:0 0 7px #efffa8,0 0 15px #65c984}
.payline.on{animation:showline .45s ease ${resultDelay}s forwards, jungleLine 1.15s cubic-bezier(.2,.8,.2,1) ${resultDelay}s infinite}
@keyframes showline{to{opacity:1;transform:translateY(-50%) scaleX(1)}}
@keyframes jungleLine{0%{filter:brightness(1)}45%{filter:brightness(1.8)}75%,100%{filter:brightness(1)}}

.message{height:29px;margin:6px 2px 5px;display:grid;place-items:center;border:2px solid #537d64;border-radius:8px;
  color:#e3dfbb;background:linear-gradient(#102d24,#061812);box-shadow:inset 0 0 8px #000;
  text-align:center;font:bold 12px monospace;text-shadow:0 0 6px #62a77d;
  opacity:0;transform:translateY(3px);animation:msgIn .4s ease ${resultDelay}s forwards}
@keyframes msgIn{to{opacity:1;transform:translateY(0)}}
.message.jackpot{animation:msgIn .4s ease ${resultDelay}s forwards, msgGlow 1s ease-in-out ${resultDelay}s infinite alternate}
@keyframes msgGlow{0%{box-shadow:inset 0 0 8px #000}100%{box-shadow:inset 0 0 14px #7ddc8a,0 0 13px #74ce82}}

.console{display:grid;grid-template-columns:1fr 1.7fr;gap:7px;margin:0 3px;padding:7px 8px 9px;
  border:3px solid #416a53;border-radius:9px 9px 17px 17px;
  background:linear-gradient(#9c8c59,#315d48 37%,#0a2e22 39%,#123e2f);
  box-shadow:inset 0 2px #d9c992,0 5px #061d16,0 9px 12px #0008;transform:perspective(300px) rotateX(4deg)}
button{height:44px;border:3px solid #351006;border-radius:13px;color:#fff;font-weight:900}
.bet{background:linear-gradient(#4f9a77,#216348 53%,#103d2d);box-shadow:inset 0 4px 4px #d8ffe055,0 4px #092a20}
.spin{background:radial-gradient(circle at 50% 32%,#a8d96f,#4b8d46 47%,#1e542f 76%);
  box-shadow:inset 0 4px 5px #e8ffd488,0 4px #12351e,0 0 12px #79b85c88;font-size:16px;text-shadow:0 2px #06420d}

.tray{width:49%;height:14px;margin:9px auto 0;border:3px solid #244d3a;border-radius:4px 4px 10px 10px;
  background:#061a13;box-shadow:inset 0 6px 9px #000,0 3px #897945}

.leverTrack{position:absolute;right:8px;top:145px;width:20px;height:150px;overflow:hidden;border-radius:13px;
  background:linear-gradient(90deg,#0d2c21,#c9a556,#0d2c21);box-shadow:inset 0 0 5px #000}
.leverTrack:after{content:"";position:absolute;left:1px;bottom:1px;width:19px;height:19px;z-index:3;
  border:2px solid #5b2509;border-radius:50%;
  background:radial-gradient(circle at 35% 30%,#fff6c8 0 8%,#f7bd3d 9% 25%,#9b3d08 52%,#3a1205 76%);
  box-shadow:inset 0 0 0 2px #ffda67,0 2px 5px #000b}
.lever{position:absolute;left:0;right:0;bottom:9px;width:100%;height:112px}
.leverArm{position:absolute;left:6px;bottom:5px;width:6px;height:88px;border:2px solid #292929;border-radius:5px;
  background:linear-gradient(90deg,#3c3c3c,#fff 43%,#8a8a8a 68%,#252525);box-shadow:0 2px 4px #000b;
  transform:scaleY(1);transform-origin:50% 100%;transition:transform .34s cubic-bezier(.2,.82,.25,1)}
.leverKnob{position:absolute;left:-7px;top:-11px;width:20px;height:20px;border:3px solid #650000;border-radius:50%;
  background:radial-gradient(circle at 35% 25%,#fff,#ff7777 13%,#ed1720 37%,#850007 74%);
  box-shadow:inset -5px -6px 7px #490000,0 4px 5px #000,0 0 9px #f22}
.lever.pull .leverArm{transform:scaleY(.55)}
.lever.pull .leverKnob{transform:scaleY(1.82) scale(1.1)}
</style>
</head>
<body>
  <div class="machine" id="machine">
    <div class="lights"></div>
    <div class="title">TRAGAMONEDAS
      ${isPremium ? `<span class="badge-premium">★ PREMIUM</span>` : ''}
    </div>
    <div class="jackpot">JACKPOT · ${maxMultiplier}× MÁXIMO</div>

    <div class="stats">
      <div class="stat">SALDO<b>${nuevoSaldo}</b></div>
      <div class="stat">APUESTA<b>${apuesta}</b></div>
      <div class="stat">GANANCIA<b>${bestWin}</b></div>
    </div>

    <div class="frame">
      <div class="reelbox">
        ${reelsHtml}
      </div>
      <i class="payline ${isWin ? 'on' : ''}"></i>
    </div>

    <div class="message ${cssClass === 'jackpot' ? 'jackpot' : ''}">${resultadoText}</div>

    <div class="console">
      <button class="bet" disabled>BET ${apuesta}</button>
      <button class="spin" disabled>${isWin ? `+${ganancia} ${m.e.currency_name}` : 'GIRAR'}</button>
    </div>

    <div class="tray"></div>

    <div class="leverTrack">
      <div class="lever pull"><i class="leverArm"><i class="leverKnob"></i></i></div>
    </div>
  </div>

  <style>
    ${spinKeyframes}
  </style>
</body>
</html>`;
        // Enviar SOLO el HTML (sin mensaje de texto extra)
        try {
            await htmlGoon(conn, m.chat, html);
            await m.react(isWin ? "🎰" : "😅");
        }
        catch (error) {
            console.error("❌ Error enviando slot HTML:", error);
            // Fallback: solo texto si falla el HTML
            const msg = isWin
                ? `🎰 *${resultadoText}*\n\n${result.map(s => s.icon).join(' ')}\n\n💰 +${ganancia} ${m.e.currency_name} (×${multiplicador})\n💎 Nuevo saldo: ${nuevoSaldo} ${m.e.currency_name}`
                : `🎰 *${resultadoText}*\n\n${result.map(s => s.icon).join(' ')}\n\n💸 -${apuesta} ${m.e.currency_name}\n💎 Nuevo saldo: ${nuevoSaldo} ${m.e.currency_name}`;
            await m.reply(msg);
        }
    }
};
