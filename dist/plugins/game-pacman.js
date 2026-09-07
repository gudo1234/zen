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
/* ===================== JUEGOS ===================== */
function buildDino() {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;background:transparent;font-family:'Courier New',monospace;overflow:hidden}
body{padding:8px;background:#f7f7f7}
.card{border-radius:16px;border:2px solid #ddd;background:#fff;padding:12px;box-shadow:0 2px 10px rgba(0,0,0,.08);transition:background .4s,border-color .4s}
.card.night{background:#1a1a2e;border-color:#333}
.top{display:flex;justify-content:space-between;color:#888;font:700 11px monospace;padding:0 4px 6px 4px;border-bottom:1px solid #eee}
.card.night .top{color:#aaa;border-bottom-color:#333}
.top b{color:#555;font-size:14px}
.card.night .top b{color:#eee}
canvas{display:block;width:100%;background:#fff;border-radius:6px;touch-action:none;cursor:pointer;image-rendering:pixelated;transition:background .4s}
.row{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}
button{padding:12px;border:2px solid #ddd;border-radius:10px;font:800 12px Arial;color:#fff;cursor:pointer;transition:all .12s;touch-action:manipulation}
button:active{transform:scale(.94)}
.g{background:linear-gradient(180deg,#22c55e,#15803d);border-color:#15803d}
.o{background:linear-gradient(180deg,#eab308,#b45309);border-color:#b45309}
</style></head><body>
<div class="card" id="card">
<div class="top"><span>🦕 DINO</span><span>🏆 <b id="s">00000</b></span></div>
<canvas id="c" width="360" height="180"></canvas>
<div class="row">
<button class="g" id="jump">⬆ SALTAR</button>
<button class="o" id="restart">🔄 REINICIAR</button>
</div>
</div>
<script>
var c=document.getElementById('c'),ctx=c.getContext('2d'),sc=document.getElementById('s'),card=document.getElementById('card');
var GROUND_Y=128, GRAV=0.6, JUMP_V=-11, DUCK_JUMP_V=-11;
var dino={x:45,y:GROUND_Y,w:24,h:30,vy:0,j:false,duck:false,legFrame:0};
var obs=[],clouds=[],score=0,hiScore=0,go=false,speed=6,fc=0,run=true,gx=0;
var night=false,nightTimer=0;
var raf;

function pad(n){ n=Math.floor(n); return ('00000'+n).slice(-5); }

function reset(){
  dino.y=GROUND_Y;dino.vy=0;dino.j=false;dino.duck=false;
  obs=[];clouds=[];score=0;go=false;speed=6;fc=0;run=true;gx=0;night=false;nightTimer=0;
  sc.textContent=pad(0);
  card.classList.remove('night');
  for(var i=0;i<3;i++)clouds.push({x:80+Math.random()*280,y:15+Math.random()*25,s:20+Math.random()*15});
}

function jump(){
  if(go){reset();return;}
  if(!dino.j){dino.vy=JUMP_V;dino.j=true;dino.duck=false;}
}

function setDuck(v){
  if(go)return;
  dino.duck=v && !dino.j;
}

function drawDino(x,y,duck,legFrame,dead){
  ctx.fillStyle= dead? '#c0392b' : (night?'#eee':'#333');
  if(duck){
    // agachado
    ctx.fillRect(x-6,y+16,34,12);
    ctx.fillRect(x+18,y+8,10,10);
    ctx.fillStyle= night?'#1a1a2e':'#fff';
    ctx.fillRect(x+24,y+11,3,3);
    ctx.fillStyle= dead? '#c0392b' : (night?'#eee':'#333');
    ctx.fillRect(x-8,y+22,6,4);
    ctx.fillRect(x+22,y+22,6,4);
    return;
  }
  // cuerpo
  ctx.fillRect(x+4,y+4,16,20);
  ctx.fillRect(x+16,y-2,10,10);
  // ojo
  ctx.fillStyle= night?'#1a1a2e':'#fff';
  ctx.fillRect(x+20,y,4,4);
  ctx.fillStyle= dead? '#c0392b' : (night?'#eee':'#333');
  ctx.fillRect(x+22,y+1,2,2);
  // boca
  ctx.fillStyle= night?'#1a1a2e':'#fff';
  ctx.fillRect(x+18,y+6,8,2);
  ctx.fillStyle= dead? '#c0392b' : (night?'#eee':'#333');
  ctx.fillRect(x+20,y+8,2,2);
  // patas animadas
  if(legFrame===0){
    ctx.fillRect(x+4,y+24,4,6);
    ctx.fillRect(x+16,y+24,6,6);
  } else {
    ctx.fillRect(x+8,y+24,6,6);
    ctx.fillRect(x+20,y+24,4,6);
  }
  // cola
  ctx.fillRect(x-2,y+8,6,3);
  ctx.fillRect(x-4,y+6,4,3);
  // brazo
  ctx.fillRect(x+18,y+14,3,6);
}

function drawCactusSmall(x,y){
  var h=22,w=10;
  ctx.fillStyle= night?'#eee':'#2d6a4f';
  ctx.fillRect(x+3,y-h+8,w-6,h-6);
  ctx.fillRect(x,y-h+12,4,4);
  ctx.fillRect(x+w-4,y-h+14,4,4);
  ctx.fillRect(x+6,y-h,4,6);
}

function drawCactusGroup(x,y,count){
  for(var i=0;i<count;i++) drawCactusSmall(x+i*14,y);
}

function drawBird(x,y,wingUp){
  ctx.fillStyle= night?'#eee':'#555';
  ctx.fillRect(x+4,y+4,12,8);
  if(wingUp){
    ctx.fillRect(x-2,y-4,8,6);
    ctx.fillRect(x+14,y-4,8,6);
  } else {
    ctx.fillRect(x-2,y+2,6,4);
    ctx.fillRect(x+14,y+2,6,4);
  }
  ctx.fillStyle= night?'#1a1a2e':'#fff';
  ctx.fillRect(x+12,y+4,3,3);
  ctx.fillStyle= night?'#eee':'#333';
  ctx.fillRect(x+13,y+5,2,2);
}

function checkCollision(d,o){
  var dh = d.duck ? 14 : d.h;
  var dyOff = d.duck ? 16 : 4;
  var dx1=d.x+6, dx2=d.x+d.w-6;
  var dy1=d.y+dyOff, dy2=d.y+dyOff+dh-6;
  var ox1=o.x+3, ox2=o.x+o.w-3;
  var oy1=o.y+3, oy2=o.y+o.h-3;
  return dx1<ox2 && dx2>ox1 && dy1<oy2 && dy2>oy1;
}

function spawnObstacle(){
  var r=Math.random();
  if(r<0.28 && speed>7.5){
    // pajaro a distintas alturas
    var heights=[100,118,135];
    obs.push({x:360,y:heights[Math.floor(Math.random()*heights.length)],w:20,h:14,t:1,scored:false,wing:0});
  } else {
    var group=1+Math.floor(Math.random()*3);
    if(speed<8) group=Math.min(group,2);
    obs.push({x:360,y:GROUND_Y,w:10*group+ (group-1)*4,h:22,t:0,scored:false,group:group});
  }
}

function loop(){
  if(run){
    fc++;

    // física del salto / agachado
    var g = dino.duck ? GRAV*1.6 : GRAV;
    dino.vy+=g;
    dino.y+=dino.vy;
    if(dino.y>=GROUND_Y){dino.y=GROUND_Y;dino.vy=0;dino.j=false;}
    if(dino.y<0){dino.y=0;dino.vy=0;}

    if(fc%6===0) dino.legFrame = dino.legFrame===0?1:0;

    // nubes
    if(fc%180===0)clouds.push({x:360,y:10+Math.random()*25,s:18+Math.random()*18});
    for(var i=clouds.length-1;i>=0;i--){
      clouds[i].x-=0.4;
      if(clouds[i].x<-40) clouds.splice(i,1);
    }

    // generar obstáculos con espacio variable segun velocidad
    var gap = Math.max(55, 110-speed*4);
    if(fc%Math.floor(gap)===0 && !go && obs.length<3){
      spawnObstacle();
    }

    // mover / colisionar / puntuar
    for(var i=obs.length-1;i>=0;i--){
      var o=obs[i];
      o.x-=speed;
      if(o.t===1 && fc%10===0) o.wing = o.wing===0?1:0;

      if(!go && checkCollision(dino,o)){
        go=true; run=false;
      }

      // sumar 1 punto cada vez que el dino ESQUIVA (pasa) un obstáculo
      if(!go && !o.scored && o.x+o.w<dino.x){
        o.scored=true;
        score++;
        sc.textContent=pad(score);
        // aumenta velocidad progresivamente cada 10 saltos exitosos
        if(score%10===0){
          speed = Math.min(13, speed+0.5);
        }
        // ciclo dia/noche cada 15 puntos
        nightTimer++;
        if(nightTimer>=15){
          night=!night;
          nightTimer=0;
          card.classList.toggle('night',night);
        }
      }

      if(o.x+o.w<0) obs.splice(i,1);
    }

    gx-=speed;
    if(gx<=-18)gx=0;
  }

  // ---- DIBUJO ----
  ctx.fillStyle= night?'#1a1a2e':'#fff';
  ctx.fillRect(0,0,c.width,c.height);

  clouds.forEach(function(c2){
    ctx.fillStyle= night?'rgba(255,255,255,0.15)':'rgba(200,200,200,0.5)';
    ctx.beginPath();
    ctx.arc(c2.x,c2.y,c2.s*0.6,0,Math.PI*2);
    ctx.arc(c2.x+c2.s*0.8,c2.y-c2.s*0.3,c2.s*0.7,0,Math.PI*2);
    ctx.arc(c2.x+c2.s*1.5,c2.y,c2.s*0.6,0,Math.PI*2);
    ctx.fill();
  });

  if(night){
    ctx.fillStyle='#fff';
    for(var i=0;i<8;i++){
      var sx=(i*47+13)%360, sy=(i*29+5)%70;
      ctx.fillRect(sx,sy,2,2);
    }
    var mx=310,my=20;
    ctx.beginPath();ctx.arc(mx,my,10,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#1a1a2e';
    ctx.beginPath();ctx.arc(mx+4,my-2,9,0,Math.PI*2);ctx.fill();
  }

  ctx.fillStyle= night?'#333':'#e8e8e8';
  ctx.fillRect(0,GROUND_Y+22,c.width,35);
  ctx.fillStyle= night?'#555':'#ddd';
  for(var i=0;i<24;i++){
    var x=(i*18+gx)%360;
    ctx.fillRect(x,GROUND_Y+23,8,2);
    ctx.fillRect(x,GROUND_Y+30,8,2);
  }

  obs.forEach(function(o){
    if(o.t===0) drawCactusGroup(o.x,o.y+22,o.group);
    else drawBird(o.x,o.y,o.wing===0);
  });

  drawDino(dino.x,dino.y,dino.duck,dino.legFrame,go);

  ctx.fillStyle= night?'#888':'#aaa';
  ctx.font='10px monospace';
  ctx.fillText('HI '+pad(hiScore),c.width-90,20);

  if(go){
    if(score>hiScore) hiScore=score;
    ctx.fillStyle= night? 'rgba(26,26,46,0.75)':'rgba(255,255,255,0.8)';
    ctx.fillRect(0,0,c.width,c.height);
    ctx.fillStyle= night?'#eee':'#555';
    ctx.font='bold 26px monospace';
    ctx.textAlign='center';
    ctx.fillText('GAME OVER',c.width/2,c.height/2-10);
    ctx.fillStyle= night?'#ccc':'#888';
    ctx.font='13px monospace';
    ctx.fillText('Toca SALTAR o la pantalla para reiniciar',c.width/2,c.height/2+22);
    ctx.textAlign='left';
  }

  raf=requestAnimationFrame(loop);
}

document.getElementById('jump').onclick=function(){jump()};
document.getElementById('restart').onclick=function(){reset();run=true};
c.onclick=function(){jump()};
c.addEventListener('touchstart',function(e){e.preventDefault();jump()});

document.addEventListener('keydown',function(e){
  if(e.key===' '||e.key==='ArrowUp'){e.preventDefault();jump();}
  if(e.key==='ArrowDown'){e.preventDefault();setDuck(true);}
});
document.addEventListener('keyup',function(e){
  if(e.key==='ArrowDown'){setDuck(false);}
});

// swipe abajo en móvil para agacharse
var touchStartY=0;
c.addEventListener('touchstart',function(e){touchStartY=e.touches[0].clientY;},{passive:true});
c.addEventListener('touchmove',function(e){
  var dy=e.touches[0].clientY-touchStartY;
  if(dy>25) setDuck(true);
},{passive:true});
c.addEventListener('touchend',function(){setDuck(false);});

reset();
loop();
</script></body></html>`;
}
// plugins/game.ts - SOLO LA FUNCIÓN buildPacman CON FANTASMAS CORREGIDOS
function buildPacman() {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;background:transparent;font-family:Arial,sans-serif;overflow:hidden}
body{padding:8px;background:#020617}
.card{border-radius:16px;border:2px solid #facc15;background:#0f172a;padding:10px}
.top{display:flex;justify-content:space-between;color:#94a3b8;font:700 12px monospace;margin-bottom:6px}
.top b{color:#facc15}
canvas{display:block;width:100%;background:#020617;border-radius:10px;touch-action:none;cursor:pointer}
.row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:8px}
button{padding:12px 4px;border:0;border-radius:11px;font:800 14px Arial;color:#fff;cursor:pointer;touch-action:manipulation}
button:active{transform:scale(.96)}
.btn-up{background:linear-gradient(180deg,#3b82f6,#1d4ed8);grid-column:2}
.btn-left{background:linear-gradient(180deg,#8b5cf6,#6d28d9);grid-column:1}
.btn-right{background:linear-gradient(180deg,#8b5cf6,#6d28d9);grid-column:3}
.btn-down{background:linear-gradient(180deg,#3b82f6,#1d4ed8);grid-column:2}
.btn-restart{background:linear-gradient(180deg,#facc15,#b45309);grid-column:span 3}
</style></head><body>
<div class="card">
<div class="top"><span>🟡 PAC-MAN</span><span>SCORE <b id="s">0</b></span></div>
<canvas id="c" width="360" height="360"></canvas>
<div class="row">
<button class="btn-up" id="up">⬆</button>
<button class="btn-left" id="left">⬅</button>
<button class="btn-right" id="right">➡</button>
<button class="btn-down" id="down">⬇</button>
<button class="btn-restart" id="restart">🔄 REINICIAR</button>
</div>
</div>
<script>
var c=document.getElementById('c'),ctx=c.getContext('2d'),sc=document.getElementById('s');
var SIZE=18,COLS=20,ROWS=20;
var score=0,go=false,dir=0,nextDir=0,started=false;
var ghostTimer=0,ghostIndex=0;

var mapBase=[
[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
[1,0,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,0,1],
[1,2,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,2,1],
[1,0,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,0,1],
[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
[1,0,1,1,0,1,0,1,1,1,1,1,1,0,1,0,1,1,0,1],
[1,0,1,1,0,1,0,1,1,1,1,1,1,0,1,0,1,1,0,1],
[1,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,1],
[1,1,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,1,1],
[1,1,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,1,1],
[1,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,1],
[1,0,1,1,0,1,0,1,1,1,1,1,1,0,1,0,1,1,0,1],
[1,0,1,1,0,1,0,1,1,1,1,1,1,0,1,0,1,1,0,1],
[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
[1,0,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,0,1],
[1,0,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,0,1],
[1,2,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,2,1],
[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

var map=[],pacman={x:10,y:10},ghosts=[],totalDots=0;

function cloneMap(){
  map=[];
  for(var r=0;r<ROWS;r++){map.push([]);for(var c=0;c<COLS;c++)map[r].push(mapBase[r][c])}
}

function countDots(){totalDots=0;for(var r=0;r<ROWS;r++)for(var c=0;c<COLS;c++)if(map[r][c]===0||map[r][c]===2)totalDots++}

function initGhosts(){
  // Todos los fantasmas empiezan DENTRO de la caja (invisibles)
  ghosts=[
    {x:9,y:8,color:'#ff0000',dir:0,active:false},
    {x:10,y:8,color:'#ffb8ff',dir:0,active:false},
    {x:9,y:9,color:'#00ffff',dir:0,active:false},
    {x:10,y:9,color:'#ffb851',dir:0,active:false}
  ];
  ghostIndex=0;
  ghostTimer=0;
}

function draw(){
  ctx.fillStyle='#020617';ctx.fillRect(0,0,c.width,c.height);
  
  for(var r=0;r<ROWS;r++){
    for(var col=0;col<COLS;col++){
      var x=col*SIZE,y=r*SIZE;
      if(map[r][col]===1){
        ctx.fillStyle='#1e293b';
        ctx.fillRect(x,y,SIZE,SIZE);
        ctx.strokeStyle='#334155';
        ctx.lineWidth=0.5;
        ctx.strokeRect(x,y,SIZE,SIZE);
      } else if(map[r][col]===0){
        ctx.fillStyle='#facc15';
        ctx.beginPath();
        ctx.arc(x+SIZE/2,y+SIZE/2,3,0,Math.PI*2);
        ctx.fill();
      } else if(map[r][col]===2){
        ctx.fillStyle='#facc15';
        ctx.beginPath();
        ctx.arc(x+SIZE/2,y+SIZE/2,7,0,Math.PI*2);
        ctx.fill();
      }
    }
  }
  
  // Caja de los fantasmas (puerta)
  ctx.fillStyle='#ffb8ff';
  ctx.fillRect(8*SIZE,8*SIZE,SIZE*4,3);
  
  // Dibujar fantasmas activos
  for(var i=0;i<ghosts.length;i++){
    var g=ghosts[i];
    if(!g.active)continue;
    var x=g.x*SIZE,y=g.y*SIZE;
    ctx.fillStyle=g.color;
    ctx.beginPath();
    ctx.arc(x+SIZE/2,y+SIZE/2-2,SIZE/2-2,Math.PI,0);
    ctx.lineTo(x+2,y+SIZE-2);
    ctx.lineTo(x+SIZE/2,y+SIZE-6);
    ctx.lineTo(x+SIZE-2,y+SIZE-2);
    ctx.fill();
    ctx.fillStyle='white';
    ctx.beginPath();
    ctx.arc(x+SIZE/2-5,y+SIZE/2-5,4,0,Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x+SIZE/2+5,y+SIZE/2-5,4,0,Math.PI*2);
    ctx.fill();
    ctx.fillStyle='#1a1a2e';
    ctx.beginPath();
    ctx.arc(x+SIZE/2-5,y+SIZE/2-3,2,0,Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x+SIZE/2+5,y+SIZE/2-3,2,0,Math.PI*2);
    ctx.fill();
  }
  
  var px=pacman.x*SIZE,py=pacman.y*SIZE;
  var angle=0;
  switch(dir){
    case 0: angle=0; break;
    case 1: angle=Math.PI/2; break;
    case 2: angle=Math.PI; break;
    case 3: angle=3*Math.PI/2; break;
  }
  ctx.fillStyle='#facc15';
  ctx.beginPath();
  ctx.arc(px+SIZE/2,py+SIZE/2,SIZE/2-2,angle+0.3,angle+2*Math.PI-0.3);
  ctx.lineTo(px+SIZE/2,py+SIZE/2);
  ctx.fill();
  
  if(go){
    ctx.fillStyle='rgba(0,0,0,.7)';
    ctx.fillRect(0,0,c.width,c.height);
    ctx.fillStyle='#facc15';
    ctx.font='bold 24px Arial';
    ctx.textAlign='center';
    ctx.fillText('💀 GAME OVER',c.width/2,c.height/2-10);
    ctx.fillStyle='#fff';
    ctx.font='16px Arial';
    ctx.fillText('SCORE: '+score,c.width/2,c.height/2+30);
  } else if(totalDots===0 && !go){
    ctx.fillStyle='rgba(0,0,0,.7)';
    ctx.fillRect(0,0,c.width,c.height);
    ctx.fillStyle='#4ade80';
    ctx.font='bold 24px Arial';
    ctx.textAlign='center';
    ctx.fillText('🎉 ¡GANASTE!',c.width/2,c.height/2-10);
    ctx.fillStyle='#fff';
    ctx.font='16px Arial';
    ctx.fillText('SCORE: '+score,c.width/2,c.height/2+30);
  }
}

function moveGhost(g){
  if(!g.active)return;
  
  var dirs=[0,1,2,3];
  for(var j=dirs.length-1;j>0;j--){var k=Math.floor(Math.random()*(j+1));var t=dirs[j];dirs[j]=dirs[k];dirs[k]=t}
  
  // IA: intentar ir hacia Pacman
  var dx=pacman.x-g.x,dy=pacman.y-g.y;
  var prefer=[];
  if(Math.abs(dx)>Math.abs(dy)){
    if(dx>0)prefer.push(0,2,1,3);
    else prefer.push(2,0,1,3);
  } else {
    if(dy>0)prefer.push(3,1,0,2);
    else prefer.push(1,3,0,2);
  }
  
  for(var j=0;j<prefer.length;j++){
    var d=prefer[j];
    var x=g.x,y=g.y;
    switch(d){case 0:x++;break;case 1:y--;break;case 2:x--;break;case 3:y++;break}
    if((d!==(g.dir+2)%4) && x>=0&&x<COLS&&y>=0&&y<ROWS&&map[y][x]!==1){
      g.x=x;g.y=y;g.dir=d;return;
    }
  }
  
  // Si no puede moverse, intenta cualquier dirección
  for(var j=0;j<dirs.length;j++){
    var d=dirs[j];
    var x=g.x,y=g.y;
    switch(d){case 0:x++;break;case 1:y--;break;case 2:x--;break;case 3:y++;break}
    if((d!==(g.dir+2)%4) && x>=0&&x<COLS&&y>=0&&y<ROWS&&map[y][x]!==1){
      g.x=x;g.y=y;g.dir=d;return;
    }
  }
}

function move(){
  if(go || totalDots===0)return;
  
  // Activar fantasmas uno por uno (cada 3 segundos)
  ghostTimer++;
  if(ghostTimer%60===0 && ghostIndex<ghosts.length){
    ghosts[ghostIndex].active=true;
    ghostIndex++;
  }
  
  // Pacman
  var newX=pacman.x,newY=pacman.y;
  switch(nextDir){
    case 0: newX++; break;
    case 1: newY--; break;
    case 2: newX--; break;
    case 3: newY++; break;
  }
  if(newX>=0&&newX<COLS&&newY>=0&&newY<ROWS&&map[newY][newX]!==1){
    pacman.x=newX;pacman.y=newY;dir=nextDir;
  } else {
    var x=pacman.x,y=pacman.y;
    switch(dir){
      case 0: x++; break;
      case 1: y--; break;
      case 2: x--; break;
      case 3: y++; break;
    }
    if(x>=0&&x<COLS&&y>=0&&y<ROWS&&map[y][x]!==1){pacman.x=x;pacman.y=y}
  }
  
  if(map[pacman.y][pacman.x]===0){score+=10;sc.textContent=score;map[pacman.y][pacman.x]=3;totalDots--}
  else if(map[pacman.y][pacman.x]===2){score+=50;sc.textContent=score;map[pacman.y][pacman.x]=3;totalDots--}
  
  // Mover fantasmas activos
  for(var i=0;i<ghosts.length;i++){
    if(ghosts[i].active){
      moveGhost(ghosts[i]);
      if(ghosts[i].x===pacman.x&&ghosts[i].y===pacman.y){go=true;draw();return}
    }
  }
  draw();
}

function reset(){
  cloneMap();
  pacman={x:10,y:10};
  dir=0;nextDir=0;score=0;go=false;
  sc.textContent='0';
  initGhosts();
  countDots();
  ghostTimer=0;
  draw();
}

document.getElementById('up').onclick=function(){if(dir!==3)nextDir=1};
document.getElementById('down').onclick=function(){if(dir!==1)nextDir=3};
document.getElementById('left').onclick=function(){if(dir!==0)nextDir=2};
document.getElementById('right').onclick=function(){if(dir!==2)nextDir=0};
document.getElementById('restart').onclick=function(){reset()};

document.addEventListener('keydown',function(e){
  switch(e.key){
    case 'ArrowUp': e.preventDefault(); if(dir!==3)nextDir=1; break;
    case 'ArrowDown': e.preventDefault(); if(dir!==1)nextDir=3; break;
    case 'ArrowLeft': e.preventDefault(); if(dir!==0)nextDir=2; break;
    case 'ArrowRight': e.preventDefault(); if(dir!==2)nextDir=0; break;
    case ' ': reset(); e.preventDefault(); break;
  }
});

var sx=0,sy=0;
c.addEventListener('touchstart',function(e){var t=e.touches[0];sx=t.clientX;sy=t.clientY});
c.addEventListener('touchmove',function(e){
  e.preventDefault();
  if(go)return;
  var t=e.touches[0],dx=t.clientX-sx,dy=t.clientY-sy;
  if(Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>20){
    if(dx>0&&dir!==2)nextDir=0;
    else if(dx<0&&dir!==0)nextDir=2;
  } else if(Math.abs(dy)>20){
    if(dy>0&&dir!==1)nextDir=3;
    else if(dy<0&&dir!==3)nextDir=1;
  }
});

reset();
setInterval(move,200);
</script></body></html>`;
}
function buildTetris() {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;background:transparent;font-family:Arial,sans-serif;overflow:hidden}
body{padding:8px;background:#020617}
.card{border-radius:16px;border:2px solid #3b82f6;background:#0f172a;padding:10px}
.top{display:flex;justify-content:space-between;color:#94a3b8;font:700 12px monospace;margin-bottom:6px}
.top b{color:#fff}
canvas{display:block;width:100%;max-width:200px;margin:0 auto;background:#020617;border-radius:10px;touch-action:none}
.row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:8px}
button{padding:12px 4px;border:0;border-radius:11px;font:800 12px Arial;color:#fff;cursor:pointer}
button:active{transform:scale(.96)}
.p{background:linear-gradient(180deg,#8b5cf6,#6d28d9)}
.b{background:linear-gradient(180deg,#3b82f6,#1d4ed8)}
.g{background:linear-gradient(180deg,#22c55e,#15803d)}
.o{background:linear-gradient(180deg,#f59e0b,#b45309)}
</style></head><body>
<div class="card">
<div class="top"><span>🧱 TETRIS</span><span>SCORE <b id="s">0</b></span></div>
<canvas id="c" width="180" height="360"></canvas>
<div class="row">
<button class="p" id="left">LEFT</button>
<button class="b" id="rot">ROTATE</button>
<button class="p" id="right">RIGHT</button>
<button class="o" id="drop">DROP</button>
<button class="g" id="restart" style="grid-column:span 2">RESTART</button>
</div>
</div>
<script>
var c=document.getElementById('c'),ctx=c.getContext('2d'),sc=document.getElementById('s');
var board=[],cur,cx,cy,score=0,go=false;
var SHAPES=[[[1,1,1,1]],[[1,1],[1,1]],[[0,1,0],[1,1,1]],[[1,0,0],[1,1,1]],[[0,0,1],[1,1,1]]];
var COLS=['#06b6d4','#eab308','#a855f7','#3b82f6','#f97316'];
function init(){board=[];for(var r=0;r<20;r++)board.push(new Array(10).fill(0));score=0;go=false;sc.textContent='0';spawn()}
function spawn(){var i=Math.floor(Math.random()*SHAPES.length);cur={s:SHAPES[i],c:COLS[i]};cx=3;cy=0;if(collide(cur,cx,cy))go=true}
function collide(p,x,y){for(var r=0;r<p.s.length;r++)for(var c=0;c<p.s[0].length;c++)if(p.s[r][c]&&(y+r>=20||x+c<0||x+c>=10||(y+r>=0&&board[y+r][x+c])))return true;return false}
function lock(){for(var r=0;r<cur.s.length;r++)for(var c=0;c<cur.s[0].length;c++)if(cur.s[r][c]&&cy+r>=0)board[cy+r][cx+c]=cur.c;
for(var r=19;r>=0;r--)if(board[r].every(function(v){return v})){board.splice(r,1);board.unshift(new Array(10).fill(0));score+=100;sc.textContent=score;r++}spawn()}
function draw(){
  ctx.fillStyle='#020617';ctx.fillRect(0,0,c.width,c.height);
  for(var r=0;r<20;r++)for(var col=0;col<10;col++)if(board[r][col]){ctx.fillStyle=board[r][col];ctx.fillRect(col*18,r*18,17,17)}
  if(cur&&!go)for(var r=0;r<cur.s.length;r++)for(var col=0;col<cur.s[0].length;col++)if(cur.s[r][col]){ctx.fillStyle=cur.c;ctx.fillRect((cx+col)*18,(cy+r)*18,17,17)}
  if(go){ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#fff';ctx.font='bold 18px Arial';ctx.textAlign='center';ctx.fillText('GAME OVER',c.width/2,c.height/2)}
}
document.getElementById('left').onclick=function(){if(!go&&!collide(cur,cx-1,cy)){cx--;draw()}};
document.getElementById('right').onclick=function(){if(!go&&!collide(cur,cx+1,cy)){cx++;draw()}};
document.getElementById('rot').onclick=function(){if(go)return;var rot=cur.s[0].map(function(_,i){return cur.s.map(function(row){return row[i]}).reverse()});if(!collide({s:rot,c:cur.c},cx,cy)){cur.s=rot;draw()}};
document.getElementById('drop').onclick=function(){if(go)return;while(!collide(cur,cx,cy+1))cy++;lock();draw()};
document.getElementById('restart').onclick=function(){init();draw()};
init();setInterval(function(){if(go)return;if(!collide(cur,cx,cy+1))cy++;else lock();draw()},380);draw();
</script></body></html>`;
}
// plugins/game.ts - SOLO LA FUNCIÓN buildFind ACTUALIZADA (sin "MEJOR:")
function buildFind() {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;background:transparent;font-family:Arial,sans-serif;overflow:hidden}
body{padding:8px;background:#020617}
.card{border-radius:16px;border:2px solid #06b6d4;background:#0f172a;padding:10px}
.top{display:flex;justify-content:space-between;color:#94a3b8;font:700 12px monospace;margin-bottom:6px}
.top b{color:#fff}
.stats{display:flex;justify-content:space-around;color:#94a3b8;font:700 12px monospace;background:#1e293b;padding:6px 10px;border-radius:8px;margin-bottom:6px}
.stats span{color:#e2e8f0}
canvas{display:block;width:100%;background:#0f172a;border-radius:10px;touch-action:none;cursor:pointer}
.row{display:grid;grid-template-columns:1fr;gap:7px;margin-top:8px}
button{padding:13px;border:0;border-radius:12px;font:800 13px Arial;color:#fff;cursor:pointer;background:linear-gradient(180deg,#22c55e,#15803d)}
button:active{transform:scale(.96)}
.msg{text-align:center;color:#94a3b8;font:700 12px Arial;margin-top:6px;min-height:18px}
</style></head><body>
<div class="card">
<div class="top"><span>🧠 MEMORAMA</span><span>PARES <b id="s">0</b>/<b id="t">12</b></span></div>
<div class="stats">
<span>⏱️ <b id="timer">0:00</b></span>
<span>🎯 <b id="moves">0</b> intentos</span>
</div>
<canvas id="c" width="340" height="340"></canvas>
<div class="msg" id="msg">🔎 Toca una carta para voltear</div>
<div class="row"><button id="restart">🔄 NUEVA RONDA</button></div>
</div>
<script>
var c=document.getElementById('c'),ctx=c.getContext('2d'),sc=document.getElementById('s'),tc=document.getElementById('t'),timerEl=document.getElementById('timer');
var movesEl=document.getElementById('moves'),msg=document.getElementById('msg');

var emojis=['🍎','⭐','💎','🔑','🎯','🍀','🏆','🎮','🌈','🎵','🚀','🍉'];
var cards=[],flipped=[],matched=[],lock=false,found=0,moves=0;
var timer=null,seconds=0,started=false;

function shuffle(arr){for(var i=arr.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=arr[i];arr[i]=arr[j];arr[j]=t}return arr}

function start(){
  if(timer){clearInterval(timer);timer=null}
  seconds=0;started=false;found=0;moves=0;lock=false;
  timerEl.textContent='0:00';sc.textContent='0';movesEl.textContent='0';
  msg.textContent='🔎 Toca una carta para voltear';msg.style.color='#94a3b8';
  
  var deck=[];
  for(var i=0;i<12;i++){deck.push({id:i,emoji:emojis[i],matched:false});deck.push({id:i,emoji:emojis[i],matched:false})}
  shuffle(deck);
  cards=[];
  for(var i=0;i<24;i++){cards.push({id:deck[i].id,emoji:deck[i].emoji,matched:false,flipped:false})}
  tc.textContent='12';flipped=[];matched=[];draw();
}

function draw(){
  var cols=6,rows=4,total=cards.length;
  var pad=6,spacing=4;
  var cellW=(c.width-pad*2-spacing*(cols-1))/cols;
  var cellH=(c.height-pad*2-spacing*(rows-1))/rows;
  
  ctx.fillStyle='#0f172a';ctx.fillRect(0,0,c.width,c.height);
  
  for(var i=0;i<total;i++){
    var col=i%cols,row=Math.floor(i/cols);
    var x=pad+col*(cellW+spacing),y=pad+row*(cellH+spacing);
    var card=cards[i];
    
    ctx.shadowColor='rgba(6,182,212,0.15)';ctx.shadowBlur=4;
    ctx.fillStyle=card.matched?'#1a3a3a':(card.flipped?'#1e293b':'#1e293b');
    ctx.beginPath();roundRect(x,y,cellW,cellH,5);ctx.fill();
    ctx.shadowBlur=0;
    
    if(card.matched){ctx.strokeStyle='#22c55e';ctx.lineWidth=2}
    else if(card.flipped){ctx.strokeStyle='#06b6d4';ctx.lineWidth=2}
    else{ctx.strokeStyle='#334155';ctx.lineWidth=1.5}
    ctx.beginPath();roundRect(x,y,cellW,cellH,5);ctx.stroke();
    
    ctx.textAlign='center';ctx.textBaseline='middle';
    if(card.flipped || card.matched){
      ctx.font='24px Arial';
      ctx.fillStyle=card.matched?'#22c55e':'#fff';
      ctx.fillText(card.emoji,x+cellW/2,y+cellH/2+1);
    } else {
      ctx.font='16px Arial';
      ctx.fillStyle='#334155';
      ctx.fillText('❓',x+cellW/2,y+cellH/2+1);
    }
    if(card.matched){
      ctx.fillStyle='rgba(34,197,94,0.15)';
      ctx.beginPath();roundRect(x+2,y+2,cellW-4,cellH-4,3);ctx.fill();
    }
  }
}

function roundRect(x,y,w,h,r){ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath()}

function flipCard(index){
  if(lock || cards[index].flipped || cards[index].matched)return;
  
  if(!started){started=true;timer=setInterval(function(){seconds++;timerEl.textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0')},1000)}
  
  cards[index].flipped=true;
  flipped.push(index);
  draw();
  
  if(flipped.length===2){
    lock=true;moves++;movesEl.textContent=moves;
    var i1=flipped[0],i2=flipped[1];
    if(cards[i1].id===cards[i2].id && i1!==i2){
      cards[i1].matched=true;cards[i2].matched=true;
      found++;sc.textContent=found;
      msg.textContent='✅ ¡Par encontrado! '+cards[i1].emoji;
      msg.style.color='#4ade80';
      flipped=[];lock=false;draw();
      if(found===12){
        clearInterval(timer);
        var time=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
        msg.textContent='🎉 ¡COMPLETASTE! Tiempo: '+time;
        msg.style.color='#facc15';
      }
    } else {
      msg.textContent='❌ No coinciden';
      msg.style.color='#f87171';
      setTimeout(function(){
        cards[i1].flipped=false;cards[i2].flipped=false;
        flipped=[];lock=false;
        if(found<12){msg.textContent='🔎 Sigue buscando...';msg.style.color='#94a3b8'}
        draw();
      },700);
    }
  } else {
    msg.textContent='🔎 Busca la pareja...';
    msg.style.color='#94a3b8';
  }
}

function hit(cx,cy){
  var r=c.getBoundingClientRect();
  var x=(cx-r.left)*(c.width/r.width),y=(cy-r.top)*(c.height/r.height);
  var cols=6,rows=4,total=cards.length;
  var pad=6,spacing=4;
  var cellW=(c.width-pad*2-spacing*(cols-1))/cols;
  var cellH=(c.height-pad*2-spacing*(rows-1))/rows;
  
  for(var i=0;i<total;i++){
    var col=i%cols,row=Math.floor(i/cols);
    var cx2=pad+col*(cellW+spacing),cy2=pad+row*(cellH+spacing);
    if(x>=cx2 && x<=cx2+cellW && y>=cy2 && y<=cy2+cellH){
      flipCard(i);break;
    }
  }
}

c.onclick=function(e){hit(e.clientX,e.clientY)};
c.ontouchstart=function(e){e.preventDefault();var t=e.touches[0];hit(t.clientX,t.clientY)};
document.getElementById('restart').onclick=function(){if(timer)clearInterval(timer);start()};
start();
</script></body></html>`;
}
// plugins/game.ts - SOLO LA FUNCIÓN buildPenalty CORRECTA
function buildPenalty() {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;background:transparent;font-family:Arial,sans-serif;overflow:hidden}
body{padding:6px;background:#0a0a1a}
.card{border-radius:14px;border:2px solid #22c55e;background:#0f172a;padding:10px}
.top{display:flex;justify-content:space-between;color:#94a3b8;font:700 13px monospace}
.top b{color:#fff}
.score{display:flex;justify-content:center;align-items:center;gap:20px;background:#1a1a2e;padding:8px 16px;border-radius:12px;margin:6px 0;border:1px solid #334155}
.score span{font:700 28px monospace}
.score .you{color:#4ade80}
.score .gk{color:#f87171}
.score .vs{color:#64748b;font-size:16px}
canvas{display:block;width:100%;background:linear-gradient(180deg,#1a6b3a,#0f3d22);border-radius:10px;touch-action:none;cursor:pointer;height:280px}
.msg{text-align:center;color:#e2e8f0;font:700 16px Arial;margin:6px 0;min-height:24px}
.turn{text-align:center;color:#94a3b8;font:13px Arial;margin-bottom:4px}
.turn b{color:#facc15}
</style></head><body>
<div class="card">
<div class="top"><span>⚽ PENALES</span><span><b id="ronda">1</b>/10</span></div>
<div class="score">
<span class="you" id="you">0</span>
<span class="vs">VS</span>
<span class="gk" id="gk">0</span>
</div>
<div class="turn" id="turn">⚡ TU TURNO - Patea</div>
<canvas id="c"></canvas>
<div class="msg" id="msg">👆 Toca IZQ | CENTRO | DER</div>
</div>
<script>
var c=document.getElementById('c'),ctx=c.getContext('2d');
var you=0,gk=0,round=0,total=0,busy=false,isPlayerTurn=true;
var ball={x:170,y:190},keeper={x:170,side:1};
var msg=document.getElementById('msg'),turn=document.getElementById('turn');
var particles=[],trail=[];

function resizeCanvas(){
  var rect=c.parentElement.getBoundingClientRect();
  c.width=rect.width-20;
  c.height=Math.min(c.width*0.7,280);
  if(c.width<200)c.width=200;
  ball.x=c.width/2;
  ball.y=c.height-30;
  draw('idle');
}

function drawField(){
  var w=c.width,h=c.height;
  var grad=ctx.createRadialGradient(w/2,h*0.4,10,w/2,h*0.5,w*0.7);
  grad.addColorStop(0,'#1e8a4a');
  grad.addColorStop(0.6,'#166a3a');
  grad.addColorStop(1,'#0f4d2a');
  ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
  
  ctx.strokeStyle='rgba(255,255,255,0.12)';
  ctx.lineWidth=2;
  var ax=w*0.25,ay=h*0.15,aw=w*0.5,ah=h*0.25;
  ctx.strokeRect(ax,ay,aw,ah);
  ctx.strokeRect(ax-20,ay-10,aw+40,ah+30);
  ctx.fillStyle='rgba(255,255,255,0.12)';
  ctx.beginPath();ctx.arc(w/2,h*0.7,6,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(w/2,h*0.7,25,0.4,2.7);ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,0.25)';
  ctx.lineWidth=3;
  var gx=w*0.27,gy=h*0.1,gw=w*0.46,gh=h*0.22;
  ctx.strokeRect(gx,gy,gw,gh);
  ctx.beginPath();ctx.moveTo(gx,gy+gh);ctx.lineTo(gx,gy);ctx.lineTo(gx+gw,gy);ctx.lineTo(gx+gw,gy+gh);ctx.stroke();
}

function drawKeeper(){
  var w=c.width,h=c.height;
  var kx=keeper.side===0?w*0.25:keeper.side===2?w*0.75:w/2;
  ctx.fillStyle='#facc15';
  var bw=w*0.09,bh=h*0.12;
  ctx.fillRect(kx-bw/2,h*0.2,bw,bh);
  ctx.beginPath();ctx.arc(kx,h*0.17,w*0.04,0,Math.PI*2);ctx.fill();
  ctx.fillRect(kx-bw*0.7,h*0.22,bw*0.4,bh*0.3);
  ctx.fillRect(kx+bw*0.3,h*0.22,bw*0.4,bh*0.3);
  ctx.fillStyle='#ef4444';
  ctx.fillRect(kx-bw*0.8,h*0.2,bw*0.25,bh*0.4);
  ctx.fillRect(kx+bw*0.55,h*0.2,bw*0.25,bh*0.4);
  ctx.fillStyle='#1a1a2e';
  ctx.fillRect(kx-w*0.02,h*0.15,w*0.015,w*0.02);
  ctx.fillRect(kx+w*0.01,h*0.15,w*0.015,w*0.02);
}

function drawBall(){
  var w=c.width,h=c.height;
  var r=w*0.04;
  ctx.shadowColor='rgba(0,0,0,0.2)';ctx.shadowBlur=10;
  ctx.fillStyle='rgba(0,0,0,0.1)';
  ctx.beginPath();ctx.ellipse(ball.x+2,ball.y+4,r+2,r*0.5,0,0,Math.PI*2);ctx.fill();
  ctx.shadowColor='rgba(255,255,255,0.1)';ctx.shadowBlur=15;
  ctx.fillStyle='#fff';
  ctx.beginPath();ctx.arc(ball.x,ball.y,r,0,Math.PI*2);ctx.fill();
  ctx.shadowBlur=0;
  ctx.strokeStyle='#333';ctx.lineWidth=1;
  ctx.beginPath();ctx.arc(ball.x,ball.y,r*0.7,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.arc(ball.x-r*0.35,ball.y-r*0.35,r*0.35,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.arc(ball.x+r*0.35,ball.y-r*0.35,r*0.35,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.arc(ball.x,ball.y+r*0.4,r*0.35,0,Math.PI*2);ctx.stroke();
}

function drawParticles(){
  for(var i=particles.length-1;i>=0;i--){
    var p=particles[i];
    p.x+=p.vx;p.y+=p.vy;p.vy+=0.08;p.life-=0.025;
    if(p.life<=0){particles.splice(i,1);continue}
    ctx.globalAlpha=p.life;
    ctx.fillStyle=p.color;
    ctx.shadowColor=p.color;ctx.shadowBlur=8;
    ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;ctx.shadowBlur=0;
}

function drawTrail(){
  for(var i=0;i<trail.length;i++){
    ctx.globalAlpha=(i/trail.length)*0.4;
    ctx.fillStyle='#ff6b35';
    ctx.shadowColor='#ff6b35';ctx.shadowBlur=12;
    var s=2+(i/trail.length)*3;
    ctx.beginPath();ctx.arc(trail[i].x,trail[i].y,s,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;ctx.shadowBlur=0;
}

function draw(state){
  var w=c.width,h=c.height;
  drawField();
  drawKeeper();
  drawTrail();
  drawParticles();
  drawBall();
  
  if(state==='goal'){
    ctx.fillStyle='rgba(74,222,128,0.1)';ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#4ade80';ctx.font='bold 48px Arial';ctx.textAlign='center';
    ctx.shadowColor='#4ade80';ctx.shadowBlur=30;
    ctx.fillText('⚽ GOL!',w/2,h*0.4);
    ctx.shadowBlur=0;
  }else if(state==='saved'){
    ctx.fillStyle='rgba(248,113,113,0.1)';ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#f87171';ctx.font='bold 40px Arial';ctx.textAlign='center';
    ctx.shadowColor='#f87171';ctx.shadowBlur=30;
    ctx.fillText('🧤 ATAJADO!',w/2,h*0.4);
    ctx.shadowBlur=0;
  }else if(state==='gol rival'){
    ctx.fillStyle='rgba(248,113,113,0.1)';ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#f87171';ctx.font='bold 42px Arial';ctx.textAlign='center';
    ctx.shadowColor='#f87171';ctx.shadowBlur=30;
    ctx.fillText('⚽ GOL RIVAL',w/2,h*0.4);
    ctx.shadowBlur=0;
  }else if(state==='atajado rival'){
    ctx.fillStyle='rgba(74,222,128,0.1)';ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#4ade80';ctx.font='bold 40px Arial';ctx.textAlign='center';
    ctx.shadowColor='#4ade80';ctx.shadowBlur=30;
    ctx.fillText('🧤 ATAJASTE!',w/2,h*0.4);
    ctx.shadowBlur=0;
  }
}

function shootPlayer(dir){
  if(busy||total>=10)return;
  busy=true;trail=[];particles=[];
  
  var gkDir=Math.floor(Math.random()*3);
  keeper.side=gkDir;
  var goal=dir!==gkDir;
  var w=c.width,h=c.height;
  var tx=dir===0?w*0.2:dir===2?w*0.8:w/2;
  var sx=w/2,sy=h-30,t=0;
  
  msg.textContent='⚡ Disparando...';
  
  var iv=setInterval(function(){
    t+=0.025;
    var ease=t<0.7?t/0.7:0.7+(t-0.7)*0.25;
    ball.x=sx+(tx-sx)*ease;
    ball.y=sy+(h*0.2-sy)*ease;
    if(t%2===0){trail.push({x:ball.x+Math.random()*3-1.5,y:ball.y+Math.random()*3-1.5});if(trail.length>20)trail.shift()}
    draw('idle');
    if(t>=1){
      clearInterval(iv);
      if(goal){you++;draw('goal');
        for(var i=0;i<30;i++){particles.push({x:w/2+Math.random()*w*0.6-w*0.3,y:h*0.2+Math.random()*h*0.4,
          vx:(Math.random()-0.5)*6,vy:(Math.random()-0.5)*6-3,
          color:['#4ade80','#facc15','#22d3ee','#f87171'][Math.floor(Math.random()*4)],
          size:2+Math.random()*5,life:1})}
        msg.textContent='⚽ ¡GOOOOOOL!';msg.style.color='#4ade80';
      }else{gk++;draw('saved');msg.textContent='🧤 ¡ATAJADO!';msg.style.color='#f87171';}
      document.getElementById('you').textContent=you;
      document.getElementById('gk').textContent=gk;
      total++;document.getElementById('ronda').textContent=total+1;
      setTimeout(function(){
        ball.x=w/2;ball.y=h-30;keeper.side=1;trail=[];busy=false;
        if(total>=10){finish();return}
        isPlayerTurn=false;
        turn.innerHTML='🧤 TU TURNO - Ataja';
        msg.textContent='👆 Toca IZQ | CENTRO | DER para atajar';
        draw('idle');
      },1200);
    }
  },16);
}

function shootRival(){
  if(busy)return;
  busy=true;trail=[];particles=[];
  
  var rivalDir=Math.floor(Math.random()*3);
  var playerDir=keeper.side;
  var goal=rivalDir!==playerDir;
  var w=c.width,h=c.height;
  var tx=rivalDir===0?w*0.2:rivalDir===2?w*0.8:w/2;
  var sx=w/2,sy=h-30,t=0;
  
  msg.textContent='⚡ Rival dispara...';
  
  var iv=setInterval(function(){
    t+=0.025;
    var ease=t<0.7?t/0.7:0.7+(t-0.7)*0.25;
    ball.x=sx+(tx-sx)*ease;
    ball.y=sy+(h*0.2-sy)*ease;
    if(t%2===0){trail.push({x:ball.x+Math.random()*3-1.5,y:ball.y+Math.random()*3-1.5});if(trail.length>20)trail.shift()}
    draw('idle');
    if(t>=1){
      clearInterval(iv);
      if(goal){gk++;draw('gol rival');msg.textContent='⚽ ¡GOL RIVAL!';msg.style.color='#f87171';}
      else{draw('atajado rival');msg.textContent='🧤 ¡ATAJASTE!';msg.style.color='#4ade80';}
      document.getElementById('you').textContent=you;
      document.getElementById('gk').textContent=gk;
      total++;document.getElementById('ronda').textContent=total+1;
      setTimeout(function(){
        ball.x=w/2;ball.y=h-30;keeper.side=1;trail=[];busy=false;
        if(total>=10){finish();return}
        isPlayerTurn=true;
        turn.innerHTML='⚡ TU TURNO - Patea';
        msg.textContent='👆 Toca IZQ | CENTRO | DER';
        draw('idle');
      },1200);
    }
  },16);
}

function finish(){
  var w=c.width,h=c.height;
  draw('idle');
  ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#fff';ctx.font='bold 32px Arial';ctx.textAlign='center';
  if(you>gk){ctx.fillStyle='#4ade80';ctx.fillText('🏆 ¡CAMPEÓN! '+you+'-'+gk,w/2,h/2-10)}
  else if(you<gk){ctx.fillStyle='#f87171';ctx.fillText('💀 Perdiste '+you+'-'+gk,w/2,h/2-10)}
  else{ctx.fillStyle='#facc15';ctx.fillText('🤝 Empate '+you+'-'+gk,w/2,h/2-10)}
  ctx.fillStyle='#94a3b8';ctx.font='16px Arial';ctx.fillText('Toca para reiniciar',w/2,h/2+40);
  turn.innerHTML='🏁 FINAL';
  msg.textContent='';
}

function reset(){
  you=0;gk=0;total=0;busy=false;isPlayerTurn=true;
  var w=c.width,h=c.height;
  ball.x=w/2;ball.y=h-30;keeper={x:w/2,side:1};
  trail=[];particles=[];
  document.getElementById('you').textContent='0';
  document.getElementById('gk').textContent='0';
  document.getElementById('ronda').textContent='1';
  turn.innerHTML='⚡ TU TURNO - Patea';
  msg.textContent='👆 Toca IZQ | CENTRO | DER';
  draw('idle');
}

function getDir(x){
  var rect=c.getBoundingClientRect();
  var px=(x-rect.left)*(c.width/rect.width);
  if(px<c.width*0.3)return 0;
  if(px>c.width*0.7)return 2;
  return 1;
}

c.onclick=function(e){
  if(busy)return;
  if(total>=10){reset();return}
  if(isPlayerTurn){
    shootPlayer(getDir(e.clientX));
  }else{
    keeper.side=getDir(e.clientX);
    setTimeout(shootRival,300);
  }
};
c.ontouchstart=function(e){
  e.preventDefault();
  if(busy)return;
  if(total>=10){reset();return}
  var t=e.touches[0];
  if(isPlayerTurn){
    shootPlayer(getDir(t.clientX));
  }else{
    keeper.side=getDir(t.clientX);
    setTimeout(shootRival,300);
  }
};

window.addEventListener('resize',resizeCanvas);
resizeCanvas();
</script></body></html>`;
}
/* ===================== PLUGIN ===================== */
const GAMES = {
    "1": { name: "🦕 Dino Run", build: buildDino },
    "2": { name: "🐍 Pac-Man", build: buildPacman },
    "3": { name: "🧱 Tetris", build: buildTetris },
    "4": { name: "🔍 Memorama", build: buildFind },
    "5": { name: "⚽ Penales", build: buildPenalty }
};
export default {
    name: ["game", "juegos"],
    help: ["game"],
    desc: "Arcade de minijuegos",
    tags: ["game"],
    register: true,
    run: async ({ conn, m, prefijo, args }) => {
        const choice = (args[0] || "").toLowerCase();
        // menú de texto
        if (!choice || !GAMES[choice]) {
            const list = Object.entries(GAMES)
                .map(([k, g]) => `*${k}.* ${g.name}`)
                .join("\n");
            return m.reply(`🎮 *ARCADE MITZUKI*`, `\nElige un juego:\n\n${list}\n\n> Ejemplo: *.game 1*\n\nMAS JUEGOS:\n\n- ${prefijo}airforce\n- ${prefijo}neon\n- ${prefijo}kage\n- ${prefijo}geometry\n- ${prefijo}flappy\n\n> Ejemplo: *.kage*`);
        }
        try {
            await htmlGoon(conn, m.chat, GAMES[choice].build());
            await m.react("🎮");
        }
        catch (e) {
            console.error(e);
            await m.reply("❌ Error al cargar el juego");
        }
    }
};
