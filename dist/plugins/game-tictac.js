import { generateWAMessageFromContent } from "@whiskeysockets/baileys";
import crypto from "crypto";
// ========== ESTADO DE JUEGOS ==========
export const juegos = new Map();
const SYMBOLS = ['❌', '⭕'];
const NUMEROS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
// ========== HTML PARA VS BOT ==========
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
// ========== RENDER TABLERO (VS USUARIO) ==========
function renderTablero(tablero) {
    const display = tablero.map((v, i) => v || NUMEROS[i]);
    return `
┌───┬───┬───┐
│ ${display[0]} │ ${display[1]} │ ${display[2]} │
├───┼───┼───┤
│ ${display[3]} │ ${display[4]} │ ${display[5]} │
├───┼───┼───┤
│ ${display[6]} │ ${display[7]} │ ${display[8]} │
└───┴───┴───┘`;
}
// ========== VERIFICAR GANADOR ==========
function verificarGanador(tablero) {
    const combinaciones = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    for (const [a, b, c] of combinaciones) {
        if (tablero[a] && tablero[a] === tablero[b] && tablero[b] === tablero[c]) {
            return tablero[a];
        }
    }
    return tablero.every(x => x === '❌' || x === '⭕') ? 'empate' : null;
}
// ========== ENVIAR ESTADO VS USUARIO ==========
async function enviarEstado(conn, sala, textoExtra = '') {
    const j1 = sala.jugador1;
    const j2 = sala.jugador2;
    const simboloJ1 = SYMBOLS[0]; // ❌
    const simboloJ2 = SYMBOLS[1]; // ⭕
    const turnoMsg = sala.terminado
        ? '🏁 *Juego terminado*'
        : `🎯 *Turno de:* @${sala.turno.split('@')[0]}`;
    const msg = `💖 𝙅𝙪𝙚𝙜𝙤 𝙩𝙖𝙩𝙚𝙩𝙞
🫂 𝙅𝙪𝙜𝙖𝙙𝙤𝙧𝙚𝙨:
*┈┈┈┈┈┈┈┈┈*
${simboloJ1} = @${j1?.split('@')[0] || '???'}
${simboloJ2} = @${j2?.split('@')[0] || 'esperando...'}
*┈┈┈┈┈┈┈┈┈*
${renderTablero(sala.tablero)}

*┈┈┈┈┈┈┈┈┈*
${textoExtra || turnoMsg}`;
    const mentions = [j1, j2].filter(Boolean);
    await conn.sendMessage(sala.chatId, { text: msg, mentions });
}
// ========== BEFORE - DETECTA MOVIMIENTOS VS USUARIO ==========
export async function before(m, { conn }) {
    if (!m.chat?.endsWith("@g.us"))
        return;
    const texto = m.originalText?.trim() || m.text?.trim() || "";
    if (!texto)
        return;
    if (texto.startsWith("/") || texto.startsWith(".") || texto.startsWith("!"))
        return;
    const pos = parseInt(texto);
    if (isNaN(pos) || pos < 1 || pos > 9)
        return;
    const juegoKey = `${m.chat}_${m.sender}`;
    const juego = juegos.get(juegoKey);
    if (!juego || juego.terminado)
        return;
    if (juego.modo !== 'usuario')
        return;
    if (juego.turno !== m.sender) {
        await m.reply(`⏳ No es tu turno! Espera a que @${juego.turno.split('@')[0]} juegue.`, true, { mentions: [juego.turno] });
        return;
    }
    const idx = pos - 1;
    if (juego.tablero[idx] !== null) {
        await m.reply(`❌ La casilla *${pos}* ya está ocupada!`);
        return;
    }
    const esJugador1 = juego.jugador1 === m.sender;
    juego.tablero[idx] = esJugador1 ? SYMBOLS[0] : SYMBOLS[1];
    const resultado = verificarGanador(juego.tablero);
    if (resultado) {
        juego.terminado = true;
        await finalizarJuegoUsuario(conn, m, juego, resultado);
        return;
    }
    juego.turno = juego.jugador1 === m.sender ? juego.jugador2 : juego.jugador1;
    await enviarEstado(conn, juego);
}
// ========== FINALIZAR JUEGO VS USUARIO ==========
async function finalizarJuegoUsuario(conn, m, juego, resultado) {
    const expGanada = Math.floor(Math.random() * 2500) + 500;
    let mensajeFinal = '';
    let mentions = [];
    if (resultado === '❌' || resultado === '⭕') {
        const ganador = resultado === '❌' ? juego.jugador1 : juego.jugador2;
        await m.db.query(`UPDATE usuarios SET exp = exp + $1 WHERE id = $2`, [expGanada, ganador]);
        mensajeFinal = `🎉 *${resultado} GANASTE!*\n\n🏆 Has ganado *${expGanada} EXP*!\n\n@${ganador.split('@')[0]} eres un crack! 🥳`;
        mentions = [ganador];
    }
    else if (resultado === 'empate') {
        mensajeFinal = `🤝 *EMPATE*\n\nNadie gana esta vez.\n\n¡Inténtalo de nuevo! 🎯`;
    }
    await enviarEstado(conn, juego, mensajeFinal);
    const key1 = `${m.chat}_${juego.jugador1}`;
    const key2 = `${m.chat}_${juego.jugador2}`;
    juegos.delete(key1);
    juegos.delete(key2);
    const salaKey = `sala_${m.chat}_${juego.nombre}`;
    juegos.delete(salaKey);
}
// ========== HTML PARA VS BOT (IGUAL A _game-tictac.js SIN DIFICULTAD) ==========
function generarHTMLBot() {
    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Tic-Tac-Toe — Dark</title>
<style>
:root {
  --bg: transparent;
  --card: transparent;
  --card-2: #2a3942;
  --ink: #e9edef;
  --ink-soft: #aebac1;
  --muted: #8696a0;
  --accent: #00a884;
  --accent-2: #008069;
  --line: #2a3942;
  --line-strong: #374248;
  --cell-bg: #111b21;
  --o: #00a884;
  --x: #e9edef;
  --sys: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
}
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:transparent;color:var(--ink);font-family:var(--sys);min-height:100vh;overflow-x:hidden;-webkit-font-smoothing:antialiased}
.stage{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px 16px}
.card{width:100%;max-width:360px}
.header{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--line);gap:8px}
.header__title{font-size:17px;font-weight:600;color:var(--ink);letter-spacing:-.005em}
.header__sub{font-size:12px;color:var(--muted)}
.status{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;font-size:13px;gap:8px}
.status__turn{display:flex;align-items:center;gap:8px;color:var(--ink-soft)}
.status__indicator{width:9px;height:9px;border-radius:50%;background:var(--x);position:relative;flex-shrink:0;transition:background .2s ease}
.status__indicator.is-o{background:var(--o)}
.status__indicator.is-thinking::after{content:'';position:absolute;inset:-3px;border-radius:50%;border:1.5px solid var(--o);animation:ring 1.1s ease-out infinite}
@keyframes ring{0%{transform:scale(.7);opacity:1}100%{transform:scale(2.2);opacity:0}}
.status__score{display:flex;gap:12px;font-variant-numeric:tabular-nums;color:var(--muted);font-size:12px}
.status__score b{color:var(--ink);font-weight:600;margin-left:3px}
.board{width:100%;aspect-ratio:1;position:relative;display:grid;grid-template-columns:1fr 1fr 1fr;grid-template-rows:1fr 1fr 1fr;background:var(--cell-bg);border-radius:8px;overflow:hidden;border:1px solid var(--line)}
.cell{position:relative;background:transparent;border:none;cursor:pointer;padding:0;font-family:inherit;color:inherit}
.cell:disabled{cursor:default}
.cell:focus-visible{outline:2px solid var(--accent);outline-offset:-3px}
.cell::before{content:'';position:absolute;right:0;top:6%;bottom:6%;width:1px;background:var(--line-strong)}
.cell:nth-child(3n)::before{display:none}
.cell::after{content:'';position:absolute;bottom:0;left:6%;right:6%;height:1px;background:var(--line-strong)}
.cell:nth-last-child(-n+3)::after{display:none}
.cell.is-winning{background:rgba(0,168,132,0.14)}
.cell.is-winning-x{background:rgba(233,237,239,0.07)}
.mark{position:absolute;inset:22%;pointer-events:none}
.mark__svg{width:100%;height:100%;overflow:visible}
.mark__svg path,.mark__svg circle{fill:none;stroke:var(--x);stroke-width:9;stroke-linecap:round}
.mark--o .mark__svg path,.mark--o .mark__svg circle{stroke:var(--o)}
.mark__svg path{stroke-dasharray:120;stroke-dashoffset:120;animation:draw .3s ease-out forwards}
.mark__svg path:nth-child(2){animation-delay:.12s}
.mark__svg circle{stroke-dasharray:220;stroke-dashoffset:220;animation:draw .4s ease-out forwards}
@keyframes draw{to{stroke-dashoffset:0}}
.winning-line{position:absolute;height:4px;background:var(--o);transform-origin:left center;z-index:5;pointer-events:none;border-radius:2px}
.winning-line.is-x{background:var(--x)}
.footer{margin-top:12px;display:flex;justify-content:center}
.footer__reset{background:none;border:none;color:var(--accent);font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;padding:8px 16px;transition:color .15s ease}
.footer__reset:hover{color:var(--ink)}
.footer__reset:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.modal{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:24px;opacity:0;pointer-events:none;transition:opacity .3s ease}
.modal.is-open{opacity:1;pointer-events:auto}
.modal__backdrop{position:absolute;inset:0;background:transparent}
.modal__card{position:relative;background:var(--card-2);border-radius:12px;padding:24px 24px 0;text-align:center;max-width:320px;width:100%;box-shadow:0 24px 50px -12px rgba(0,0,0,0.6);transform:translateY(8px) scale(.96);transition:transform .35s cubic-bezier(.34,1.56,.64,1);overflow:hidden}
.modal.is-open .modal__card{transform:translateY(0) scale(1)}
.modal__title{font-size:20px;font-weight:700;letter-spacing:-.015em;color:var(--ink);margin-bottom:8px;line-height:1.25}
.modal__title.is-o{color:var(--o)}
.modal__sub{font-size:14px;color:var(--muted);margin-bottom:20px;line-height:1.4}
.modal__retry{background:transparent;border:none;color:var(--accent);font-family:inherit;font-size:16px;font-weight:600;letter-spacing:-.005em;cursor:pointer;padding:14px 24px;width:100%;border-top:1px solid var(--line-strong);transition:color .15s ease}
.modal__retry:hover{color:var(--ink)}
.modal__retry:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
@media (max-width:380px){.stage{padding:16px 12px}}
</style>
</head>
<body>
<main class="stage">
<div class="card">
<div class="header">
<div class="header__title">Tic-Tac-Toe</div>
<div class="header__sub">vs Bot</div>
</div>
<div class="status" aria-live="polite">
<div class="status__turn">
<span class="status__indicator" id="indicator"></span>
<span id="status-text">Tu turno</span>
</div>
<div class="status__score">
<span>Tu<b id="score-x">0</b></span>
<span>Empate<b id="score-d">0</b></span>
<span>Bot<b id="score-o">0</b></span>
</div>
</div>
<div class="board" id="board" role="grid" aria-label="Tablero de juego"></div>
<div class="footer">
<button class="footer__reset" id="reset">Mitzuki</button>
</div>
</div>
</main>
<div class="modal" id="modal" hidden>
<div class="modal__backdrop" id="modal-backdrop"></div>
<div class="modal__card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
<h2 class="modal__title" id="modal-title">Ganaste!</h2>
<p class="modal__sub" id="modal-sub">Bien jugado. ¿Quieres jugar de nuevo?</p>
<button class="modal__retry" id="modal-retry">Jugar de nuevo</button>
</div>
</div>
<script>
let audioCtx=null;
function getAudio(){
 if(!audioCtx){audioCtx=new (window.AudioContext||window.webkitAudioContext)();}
 if(audioCtx.state==='suspended')audioCtx.resume();
 return audioCtx;
}
function playTone(freq,duration=0.3,type='sine'){
 const ctx=getAudio();
 const osc=ctx.createOscillator();
 const gain=ctx.createGain();
 osc.type=type;
 osc.frequency.setValueAtTime(freq,ctx.currentTime);
 gain.gain.setValueAtTime(0.0001,ctx.currentTime);
 gain.gain.exponentialRampToValueAtTime(0.35,ctx.currentTime+0.02);
 gain.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+duration);
 osc.connect(gain);
 gain.connect(ctx.destination);
 osc.start();
 osc.stop(ctx.currentTime+duration+0.05);
}
const state={
 board:Array(9).fill(null),
 human:'X',
 ai:'O',
 turn:'X',
 over:false,
 winner:null,
 line:null,
 thinking:false,
 scores:{X:0,O:0,D:0}
};
const WIN_LINES=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const $=id=>document.getElementById(id);
const boardEl=$('board'),statusText=$('status-text'),indicator=$('indicator');
const scoreX=$('score-x'),scoreO=$('score-o'),scoreD=$('score-d');
const modal=$('modal');

function buildBoard(){
 boardEl.innerHTML='';
 for(let i=0;i<9;i++){
  const c=document.createElement('button');
  c.className='cell';
  c.setAttribute('role','gridcell');
  c.setAttribute('aria-label',\`Casilla \${i+1}\`);
  c.dataset.idx=i;
  c.addEventListener('click',()=>onCell(i));
  boardEl.appendChild(c);
 }
}

function markSVG(v){
 if(v==='X'){
  return \`<svg class="mark__svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"><path d="M 22 22 L 78 78"/><path d="M 78 22 L 22 78"/></svg>\`;
 }
 return \`<svg class="mark__svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"><circle cx="50" cy="50" r="30"/></svg>\`;
}

function renderCell(i){
 const cell=boardEl.children[i];
 const v=state.board[i];
 const existing=cell.querySelector('.mark');
 if(v){
  if(!existing){
   const m=document.createElement('div');
   m.className='mark mark--'+v.toLowerCase();
   m.innerHTML=markSVG(v);
   cell.appendChild(m);
  }
  cell.disabled=true;
 } else {
  if(existing) existing.remove();
  cell.disabled=state.over||state.thinking||state.turn!==state.human;
 }
 const isWin=!!(state.line&&state.line.includes(i));
 cell.classList.toggle('is-winning',isWin);
 cell.classList.toggle('is-winning-x',isWin&&state.winner==='X');
}

function render(){
 for(let i=0;i<9;i++) renderCell(i);
 if(state.over){
  if(state.winner==='X'){statusText.textContent='Ganaste!';indicator.className='status__indicator';}
  else if(state.winner==='O'){statusText.textContent='Perdiste';indicator.className='status__indicator is-o';}
  else {statusText.textContent='Empate';indicator.className='status__indicator';}
 } else if(state.thinking){
  statusText.textContent='Bot pensando...';
  indicator.className='status__indicator is-o is-thinking';
 } else {
  statusText.textContent=state.turn===state.human?'Tu turno':'Turno del bot';
  indicator.className='status__indicator'+(state.turn===state.ai?' is-o':'');
 }
 scoreX.textContent=state.scores.X;
 scoreO.textContent=state.scores.O;
 scoreD.textContent=state.scores.D;
}

function onCell(i){
 if(state.over||state.thinking) return;
 if(state.board[i]!==null) return;
 if(state.turn!==state.human) return;
 state.board[i]=state.human;
 playTone(600,0.1,"sine");
 renderCell(i);
 const r=checkWinner(state.board);
 if(r){endGame(r);return;}
 state.turn=state.ai;
 state.thinking=true;
 render();
 setTimeout(aiMove,380+Math.random()*340);
}

function aiMove(){
 if(!state.thinking) return;
 const m=chooseAIMove();
 if(m===null){state.thinking=false;render();return;}
 state.board[m]=state.ai;
 playTone(300,0.1,"sine");
 renderCell(m);
 state.thinking=false;
 const r=checkWinner(state.board);
 if(r){endGame(r);} else {state.turn=state.human;render();}
}

function chooseAIMove(){
 const empty=state.board.map((v,i)=>v===null?i:-1).filter(i=>i>=0);
 if(!empty.length) return null;
 // Ganar
 for(const i of empty){state.board[i]='O';if(checkWinner(state.board)==='O'){state.board[i]=null;return i}state.board[i]=null;}
 // Bloquear
 for(const i of empty){state.board[i]='X';if(checkWinner(state.board)==='X'){state.board[i]=null;state.board[i]='O';return i}state.board[i]=null;}
 // Centro
 if(state.board[4]===null) return 4;
 // Esquinas
 const corners=[0,2,6,8].filter(i=>state.board[i]===null);
 if(corners.length) return corners[Math.floor(Math.random()*corners.length)];
 // Random
 return empty[Math.floor(Math.random()*empty.length)];
}

function checkWinner(board){
 for(const line of WIN_LINES){
  const [a,b,c]=line;
  if(board[a]&&board[a]===board[b]&&board[a]===board[c]){
   return board[a];
  }
 }
 if(board.every(v=>v!==null)) return 'empate';
 return null;
}

function endGame(winner){
 if(winner==='X'){
  setTimeout(()=>playTone(880,0.4,'sine'),100);
  setTimeout(()=>playTone(1100,0.4,'sine'),300);
 } else if(winner==='O'){
  setTimeout(()=>playTone(200,0.5,'sawtooth'),100);
 } else {
  setTimeout(()=>playTone(300,0.3,'square'),100);
 }
 state.over=true;
 state.winner=winner;
 if(winner==='X') state.scores.X++;
 else if(winner==='O') state.scores.O++;
 else state.scores.D++;
 render();
 if(winner==='X'){
  // Enviar EXP al ganador
  const exp=Math.floor(Math.random()*250)+50;
  window.location.href='whatsapp://send?text=✅ EXP_GANADA:'+exp;
 }
 setTimeout(()=>showModal(winner),500);
}

function showModal(winner){
 const title=$('modal-title');
 const sub=$('modal-sub');
 if(winner==='X'){
  title.textContent='🎉 Ganaste!';
  title.className='modal__title';
  sub.textContent='Bien jugado. ¿Quieres jugar de nuevo?';
 } else if(winner==='O'){
  title.textContent='😢 Perdiste';
  title.className='modal__title is-o';
  sub.textContent='El bot fue mejor esta vez. ¿Revancha?';
 } else {
  title.textContent='🤝 Empate';
  title.className='modal__title';
  sub.textContent='Nadie gana esta vez. ¿Otra partida?';
 }
 modal.hidden=false;
 void modal.offsetWidth;
 modal.classList.add('is-open');
 setTimeout(()=>$('modal-retry').focus(),80);
}

function hideModal(){
 modal.classList.remove('is-open');
 setTimeout(()=>{modal.hidden=true;},350);
}

function resetBoard(){
 hideModal();
 state.board=Array(9).fill(null);
 state.turn=state.human;
 state.over=false;
 state.winner=null;
 state.line=null;
 state.thinking=false;
 const wl=boardEl.querySelector('.winning-line');
 if(wl) wl.remove();
 render();
}

$('reset').addEventListener('click',resetBoard);
$('modal-retry').addEventListener('click',resetBoard);
$('modal-backdrop').addEventListener('click',resetBoard);

buildBoard();
render();
</script>
</body>
</html>`;
}
// ========== COMANDO PRINCIPAL ==========
export default {
    name: ["tictac", "ttt"],
    help: ["ttt"],
    desc: "Jugar Tic-Tac-Toe con contral el bot o un usuario",
    tags: ["game"],
    group: true,
    register: true,
    before: before,
    run: async ({ conn, m, args, prefijo }) => {
        const senderJid = m.sender;
        const lid = m.lid || "";
        const chatId = m.chat;
        if (!chatId.endsWith("@g.us")) {
            return m.reply("⚠️ Este comando solo funciona en grupos.");
        }
        const check = await m.db.query(`SELECT exp FROM usuarios WHERE id = $1 OR lid = $2 LIMIT 1`, [senderJid, lid]);
        if (!check.rows.length) {
            return m.reply("⚠️ No estás registrado. Usa *" + prefijo + "reg* para registrarte.");
        }
        // ========== SIN ARGUMENTOS ==========
        if (!args[0]) {
            return m.reply(`🎮 *TIC-TAC-TOE*\n\n📌 *Comandos:*\n• ${prefijo}ttt bot → Jugar contra bot\n• ${prefijo}ttt [nombre] → Crear/Unirse a sala (para jugar contral otros usuarios)`);
        }
        // ========== MODO BOT ==========
        if (args[0].toLowerCase() === "bot") {
            const juegoKey = `${chatId}_${senderJid}`;
            if (juegos.has(juegoKey)) {
                return m.reply(`⚠️ Ya tienes un juego activo! Termínalo primero.`);
            }
            const html = generarHTMLBot();
            await htmlGoon(conn, chatId, html);
            await m.react("🎮");
            return;
        }
        // ========== MODO SALA ==========
        const nombreSala = args[0].trim();
        const salaKey = `sala_${chatId}_${nombreSala}`;
        let sala = juegos.get(salaKey);
        if (!sala) {
            sala = {
                modo: 'usuario',
                jugador1: senderJid,
                jugador2: null,
                turno: senderJid,
                tablero: Array(9).fill(null),
                terminado: false,
                nombre: nombreSala,
                chatId: chatId
            };
            juegos.set(salaKey, sala);
            await m.db.query(`INSERT INTO tictac_salas (nombre, creador, chat_id, estado)
         VALUES ($1, $2, $3, 'esperando')
         ON CONFLICT (nombre) DO NOTHING`, [nombreSala, senderJid, chatId]);
            await m.reply(`✅ Sala *${nombreSala}* creada!\n\n⏳ Esperando oponente...\n\n📌 Otro usuario debe escribir:\n${prefijo}ttt ${nombreSala}`);
            await m.react("🎮");
            return;
        }
        // ========== UNIRSE A SALA ==========
        if (sala.jugador1 === senderJid) {
            return m.reply(`⚠️ Ya eres el creador de la sala *${nombreSala}*`);
        }
        if (sala.jugador2) {
            return m.reply(`⚠️ La sala *${nombreSala}* ya está llena.`);
        }
        sala.jugador2 = senderJid;
        sala.turno = sala.jugador1;
        sala.terminado = false;
        const key1 = `${chatId}_${sala.jugador1}`;
        const key2 = `${chatId}_${sala.jugador2}`;
        juegos.set(key1, sala);
        juegos.set(key2, sala);
        await m.db.query(`UPDATE tictac_salas SET jugador2 = $1, estado = 'jugando' WHERE nombre = $2`, [senderJid, nombreSala]);
        await enviarEstado(conn, sala);
        await m.react("⚔️");
    }
};
