const COOLDOWN = 60 * 60 * 1000 // 1 hora

// ===== MENSAJES DE ÉXITO =====
const robar = [
  "🦹‍♂️ Robaste un banco y obtuviste",
  "💰 Negociaste con el jefe de la mafia y obtuviste",
  "🏃‍♂️ Casi te atrapa la policía, pero lograste escapar con",
  "🤝 Los mafiosos te pagaron",
  "⭐ Le robaste a un famoso y conseguiste",
  "🎨 Entraste a un museo y robaste",
  "💎 Infiltraste una joyería y te llevaste",
  "🚚 Asaltaste un camión blindado y conseguiste",
  "🔫 Secuestraste a un empresario y recibiste",
  "📄 Amenazaste a un político y obtuviste",
  "🃏 Ganaste en una partida de póker ilegal y ganaste",
  "🏦 Hackeaste un banco y transferiste",
  "🚢 Robaste un cargamento en el puerto y conseguiste",
  "✈️ Asaltaste un avión y te llevaste",
]

// ===== MENSAJES DE FRACASO =====
const robmal = [
  "👮‍♂️ La policía te atrapó y perdiste",
  "🔪 Tu cómplice te traicionó y perdiste",
  "🛑 Fallaste el escape y perdiste",
  "🚨 La alarma se activó y perdiste",
  "🔍 Te descubrieron y perdiste",
  "💥 El plan salió mal y perdiste",
  "🐕 Los perros policía te olfatearon y perdiste",
  "📹 Las cámaras te grabaron y perdiste",
  "🔒 Te encerraron y perdiste",
  "💀 Casi mueres y perdiste",
]

// ===== MENSAJES DE ROBO A USUARIO =====
const roboUsuario = [
  "🥷 Le robaste *{amount} XP* a @{target} sin que se diera cuenta",
  "🦹‍♂️ Asaltaste a {target} y conseguiste *{amount} XP*",
  "💀 {target} ni se enteró que le robaste *{amount} XP*",
  "🔥 Le sacaste *{amount} XP* a @{target} como un profesional",
  "😈 {target} estaba distraído y le robaste *{amount} XP*",
]

// ===== MENSAJES DE CONTRAATAQUE =====
const contraataque = [
  "⚔️ {target} te contraatacó! Perdiste *{amount} XP*",
  "💥 {target} se defendió! Te quitó *{amount} XP*",
  "🤜 {target} te partió la cara! Perdiste *{amount} XP*",
  "🛡️ {target} tenía un arma y te quitó *{amount} XP*",
  "💪 {target} es más fuerte que vos! Perdiste *{amount} XP*",
]

// ===== MENSAJES DE POLICÍA =====
const policia = [
  "👮‍♂️ *¡La policía te atrapó!* Pagaste *{fine} XP* de multa",
  "🚓 *Te detuvieron!* Multa de *{fine} XP* por crimen",
  "🔫 *La policía te vio!* Te quitaron *{fine} XP* de multa",
  "📋 *Te llevaron a la comisaría!* Pagaste *{fine} XP* de fianza",
  "⚖️ *El juez te condenó!* Multa de *{fine} XP*",
]

// ===== MENSAJES DE MALA SUERTE =====
const malaSuerte = [
  "😤 *¡Qué mala suerte!* Perdiste *{amount} XP* por accidente",
  "💀 *¡Desastre!* Te robaron *{amount} XP*",
  "🔥 *Tu casa se quemó!* Perdiste *{amount} XP*",
  "🌊 *Te robó un tsunami!* Perdiste *{amount} XP*",
  "👻 *Un fantasma te asustó!* Perdiste *{amount} XP*",
]

export default {
  name: ["crime", "crimen"],
  help: ["crime"],
  desc: "Comete un crimen",
  tags: ["econ"],
  register: true,
  group: true,

  run: async ({ conn, m }) => {
    if (!m.db) return

    try {
      const now = Date.now()

      const { rows: [user] } = await m.db.query(
        "SELECT exp, crime FROM usuarios WHERE id = $1",
        [m.sender]
      )

      if (!user) {
        return m.reply("❌ Regístrate primero con /reg")
      }

      // ===== NORMALIZAR TIEMPO =====
      let lastCrime = Number(user.crime) || 0

      if (lastCrime > 0 && lastCrime < 1e12) {
        lastCrime = lastCrime * 1000
      }

      if (lastCrime > now) {
        lastCrime = 0
        await m.db.query(
          "UPDATE usuarios SET crime = 0 WHERE id = $1",
          [m.sender]
        )
      }

      let timeLeft = lastCrime + COOLDOWN - now

      if (timeLeft > 0 && timeLeft <= COOLDOWN) {
        const timeStr = msToTime(timeLeft)
        return m.reply(null, `🚓 *Te tienen fichado.*\n⏳ Volvé en *${timeStr}*`)
      }

      // ===== OBTENER PARTICIPANTES =====
      let participants = []
      let targetName = "alguien"

      try {
        const meta = await conn.groupMetadata(m.chat)
        participants = meta.participants
          .map(p => p.id)
          .filter(id => id !== m.sender)
      } catch {
        participants = []
      }

      const randomTarget = participants.length > 0
        ? participants[Math.floor(Math.random() * participants.length)]
        : null

      // ===== EVENTOS =====
      const eventType = Math.random()
      let text = ""
      let mentions = [m.sender]
      let expGanado = 0

      // ===== 1. ROBO CON ÉXITO (35%) =====
      if (eventType < 0.35) {
        const exp = Math.floor(Math.random() * 7000) + 500
        expGanado = exp
        text = `${pickRandom(robar)} *${expGanado.toLocaleString()} XP*`

        await m.db.query(
          "UPDATE usuarios SET exp = exp + $1, crime = $2 WHERE id = $3",
          [expGanado, now, m.sender]
        )
      }

      // ===== 2. FRACASO (25%) =====
      else if (eventType < 0.60) {
        const exp = Math.floor(Math.random() * 3000) + 200
        expGanado = -exp
        text = `${pickRandom(robmal)} *${exp.toLocaleString()} XP*`

        await m.db.query(
          "UPDATE usuarios SET exp = GREATEST(exp - $1, 0), crime = $2 WHERE id = $3",
          [exp, now, m.sender]
        )
      }

      // ===== 3. POLICÍA (15%) =====
      else if (eventType < 0.75) {
        const fine = Math.floor(Math.random() * 5000) + 1000
        expGanado = -fine
        text = pickRandom(policia).replace(/{fine}/g, fine.toLocaleString())

        await m.db.query(
          "UPDATE usuarios SET exp = GREATEST(exp - $1, 0), crime = $2 WHERE id = $3",
          [fine, now, m.sender]
        )
      }

      // ===== 4. ROBO A USUARIO (15%) =====
      else if (eventType < 0.90) {
        if (!randomTarget) {
          const exp = Math.floor(Math.random() * 5000) + 1000
          expGanado = exp
          text = `🦹‍♂️ No había a quien robar, pero encontraste un botín de *${exp.toLocaleString()} XP*`

          await m.db.query(
            "UPDATE usuarios SET exp = exp + $1, crime = $2 WHERE id = $3",
            [exp, now, m.sender]
          )
        } else {
          const exp = Math.floor(Math.random() * 3000) + 500
          const targetNum = randomTarget.split("@")[0]
          expGanado = exp

          // 30% de que el usuario se defienda
          if (Math.random() < 0.3) {
            const counterExp = Math.floor(Math.random() * 1500) + 200
            text = pickRandom(contraataque)
              .replace(/{amount}/g, counterExp.toLocaleString())
              .replace(/{target}/g, `@${targetNum}`)
            mentions.push(randomTarget)

            await m.db.query(
              "UPDATE usuarios SET exp = GREATEST(exp - $1, 0), crime = $2 WHERE id = $3",
              [counterExp, now, m.sender]
            )
            await m.db.query(
              "UPDATE usuarios SET exp = exp + $1 WHERE id = $2",
              [counterExp, randomTarget]
            )
          } else {
            text = pickRandom(roboUsuario)
              .replace(/{amount}/g, exp.toLocaleString())
              .replace(/{target}/g, `@${targetNum}`)
            mentions.push(randomTarget)

            await m.db.query(
              "UPDATE usuarios SET exp = exp + $1, crime = $2 WHERE id = $3",
              [exp, now, m.sender]
            )
            await m.db.query(
              "UPDATE usuarios SET exp = GREATEST(exp - $1, 0) WHERE id = $2",
              [Math.min(exp, 5000), randomTarget]
            )
          }
        }
      }

      // ===== 5. MALA SUERTE (10%) =====
      else {
        const exp = Math.floor(Math.random() * 2000) + 500
        expGanado = -exp
        text = pickRandom(malaSuerte).replace(/{amount}/g, exp.toLocaleString())

        await m.db.query(
          "UPDATE usuarios SET exp = GREATEST(exp - $1, 0), crime = $2 WHERE id = $3",
          [exp, now, m.sender]
        )
      }

      // ===== ENVIAR MENSAJE =====
      await conn.sendMessage(
        m.chat,
        { text, mentions },
        { quoted: m }
      )

      // ===== REACCIONES =====
      if (expGanado > 5000) {
        await m.react("🤑")
      } else if (expGanado > 2000) {
        await m.react("😈")
      } else if (expGanado > 0) {
        await m.react("😏")
      } else if (expGanado < -3000) {
        await m.react("💀")
      } else if (expGanado < 0) {
        await m.react("😢")
      }

    } catch (err) {
      console.error("crime error:", err)
      m.reply("❌ Ocurrió un error al ejecutar el crimen.")
      await m.react("🚓")
    }
  }
}

/* ========= UTILS ========= */
function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function msToTime(ms) {
  if (!ms || ms <= 0) return "0s"

  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)

  const sec = s % 60
  const min = m % 60

  if (h > 0) return `${h}h ${min}m ${sec}s`
  if (min > 0) return `${min}m ${sec}s`
  return `${sec}s`
}