// ===== Etapa 6: listar as músicas do banco =====

// Em desenvolvimento, o frontend conversa com o backend do computador
const urlBackend = "https://musicas-backend-delta.vercel.app"

const listaMusicas = document.getElementById("listaMusicas")

async function buscarMusicas() {
    const resposta = await fetch(urlBackend)
    const musicas = await resposta.json()

    musicas.forEach((musica) => {
        listaMusicas.innerHTML += `
            <article class="musica">
                <div class="capa" role="img" aria-label="Capa de ${musica.titulo}"></div>
                <h2>${musica.titulo}</h2>
                <p class="artista">${musica.artista}</p>
                <p class="detalhes">${musica.genero} | ${musica.ano} | ${musica.duracao} min</p>
                <button class="tocar" type="button" aria-label="Tocar 30 segundos de ${musica.titulo}">${iconeTocar}</button>
                <div class="acoes">
                    <a class="editar" href="editar.html?id=${musica.id}">Editar</a>
                    <button class="apagar" onclick="apagarMusica(${musica.id})">Apagar</button>
                </div>
            </article>
        `
    })

    colocarCapasETrechos(musicas)   // extra: capa e trecho do iTunes (abaixo)
}

buscarMusicas()


// ===== Etapa 8: apagar uma música =====

async function apagarMusica(id) {
    const confirmou = await confirmar("Tem certeza que quer apagar essa música?")   // confirm em Liquid Glass (abaixo)

    if (!confirmou) {
        return
    }

    const resposta = await fetch(`${urlBackend}/apagar/${id}`, { method: "DELETE" })
    const dados = await resposta.json()
    await avisar(dados.mensagem)   // alert em Liquid Glass (abaixo)

    window.location.reload()
}


// ===== Extra do Matheus: caixas de aviso em Liquid Glass (no lugar do alert e do confirm do navegador) =====
// avisar(mensagem): botão OK · confirmar(mensagem): Cancelar e Apagar, devolve true ou false

function caixaDeAviso(mensagem, botoes) {
    return new Promise((resolver) => {
        const fundo = document.createElement("div")
        fundo.className = "caixa-fundo"
        fundo.innerHTML = `
            <div class="caixa" role="alertdialog" aria-modal="true" aria-labelledby="caixaTexto">
                <p id="caixaTexto">${mensagem}</p>
                <div class="caixa-botoes"></div>
            </div>`

        const lugar = fundo.querySelector(".caixa-botoes")
        botoes.forEach((b) => {
            const botao = document.createElement("button")
            botao.type = "button"
            botao.className = b.classe
            botao.textContent = b.texto
            botao.addEventListener("click", () => fechar(b.valor))
            lugar.append(botao)
        })

        function teclado(evento) {
            if (evento.key === "Escape") fechar(botoes[0].valor)
        }

        function fechar(valor) {
            document.removeEventListener("keydown", teclado)
            fundo.classList.add("saindo")
            setTimeout(() => fundo.remove(), 200)
            resolver(valor)
        }

        document.addEventListener("keydown", teclado)
        document.body.append(fundo)
        lugar.firstElementChild.focus()
    })
}

function avisar(mensagem) {
    return caixaDeAviso(mensagem, [{ texto: "OK", classe: "caixa-ok", valor: true }])
}

function confirmar(mensagem) {
    return caixaDeAviso(mensagem, [
        { texto: "Cancelar", classe: "caixa-cancelar", valor: false },
        { texto: "Apagar", classe: "caixa-perigo", valor: true }
    ])
}


// ===== Extra do Matheus: capa e trecho de 30 segundos do iTunes =====
// A busca do iTunes é grátis, não precisa de chave e pode ser usada direto do navegador.
// O banco e o backend não mudam: a capa e o trecho são achados pelo título e pelo artista.

// Triângulo centralizado (só meio ponto à direita, que é o centro "visual" de um ▶)
const iconeTocar = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.4 5.14v13.72a1 1 0 0 0 1.52.85l10.4-6.86a1 1 0 0 0 0-1.7L7.92 4.29A1 1 0 0 0 6.4 5.14z" /></svg>`
const iconePausar = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /></svg>`

// Capas escolhidas pelo Matheus que o iTunes do Brasil não tem
const capasProprias = {
    "something just like this": "capas/something.jpg"
}

const audio = new Audio()
const faixas = []   // uma por card: música, capa, trecho, botão e card
let atual = -1      // qual faixa está no tocador (-1 = nenhuma)

// ===== Busca no iTunes (ampliada: acha remix, ao vivo, feat...) =====
// Deixa só letras e números, sem acento e em minúsculas:
// "Anunciação (Jopin Remix)" vira "anunciacao jopin remix" e "BK'" vira "bk" (no iTunes é "BK")
function normalizar(texto) {
    return texto
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/['’`´]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
}

// Igual, mas sem o que está entre parênteses: "Feel So Close (Radio Edit)" vira "feel so close"
function simplificar(texto) {
    return normalizar(texto.replace(/\(.*?\)|\[.*?\]/g, " "))
}

// Separa os artistas: "BK' e Kolo (part. Evinha)" vira ["bk", "kolo", "evinha"]
function separarArtistas(texto) {
    return texto
        .split(/,|&|\(|\)|\s+(?:e|x|com|feat\.?|ft\.?|part\.?)\s+/i)
        .map((nome) => normalizar(nome).replace(/^(feat|ft|part|participacao)\s+/, ""))
        .filter((nome) => nome !== "")
}

// Versões diferentes da de estúdio
function eVersao(texto) {
    return /\b(remix|live|ao vivo|acoustic|acustico|acustica|sped up|slowed|instrumental|karaoke)\b/.test(normalizar(texto))
}

async function pesquisarItunes(termo) {
    const resposta = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(termo)}&entity=song&limit=50&country=BR`)
    const dados = await resposta.json()
    return dados.results
}

// Procura de 3 jeitos, do mais exato ao mais aberto, e para no primeiro que achar:
// 1) o título inteiro (com o que está entre parênteses) + o 1º artista
// 2) o título sem os parênteses + o 1º artista
// 3) só o título
// Vale a música que tem todas as palavras do título e um dos artistas digitados.
// Entre elas: a versão certa primeiro (remix só se você escreveu remix; senão, a de estúdio),
// depois a que tem mais palavras iguais ao que você digitou.
async function buscarNoItunes(titulo, artista) {
    const palavrasTitulo = simplificar(titulo).split(" ")
    if (palavrasTitulo[0] === "") return null

    const pedidas = normalizar(titulo).split(" ")
    const artistas = separarArtistas(artista)
    const principal = artistas[0] || ""
    const querVersao = eVersao(titulo)

    const tentativas = [
        `${normalizar(titulo)} ${principal}`,
        `${simplificar(titulo)} ${principal}`,
        simplificar(titulo)
    ].map((termo) => termo.trim())

    for (const termo of new Set(tentativas)) {
        const resultados = await pesquisarItunes(termo)

        const certas = resultados.filter((r) => {
            const nome = ` ${normalizar(r.trackName)} `
            const deQuem = normalizar(`${r.artistName} ${r.trackName}`)
            return palavrasTitulo.every((p) => nome.includes(` ${p} `)) &&
                (artistas.length === 0 || artistas.some((a) => deQuem.includes(a)))
        })

        if (certas.length > 0) {
            const nota = (r) => {
                const nome = normalizar(r.trackName).split(" ")
                const iguais = pedidas.filter((p) => nome.includes(p)).length
                const versaoCerta = eVersao(`${r.trackName} ${r.collectionName}`) === querVersao ? 100 : 0
                return versaoCerta + iguais * 2 - (nome.length - iguais)
            }
            certas.sort((a, b) => nota(b) - nota(a))
            return certas[0]
        }
    }
    return null
}

function colocarCapasETrechos(musicas) {
    const cards = listaMusicas.querySelectorAll(".musica")

    musicas.forEach(async (musica, i) => {
        const capa = cards[i].querySelector(".capa")
        const botao = cards[i].querySelector(".tocar")

        let achada = null
        try {
            achada = await buscarNoItunes(musica.titulo, musica.artista)
        } catch (error) {
            console.log(error)
        }

        // Capa: a do Matheus, a do iTunes (maior) ou nenhuma
        const foto = capasProprias[simplificar(musica.titulo)] ||
            (achada && achada.artworkUrl100.replace("100x100", "300x300"))
        if (foto) {
            capa.innerHTML = `<img src="${foto}" alt="">`
        } else {
            capa.classList.add("sem-capa")
        }

        // Trecho de 30 segundos
        faixas[i] = { musica, foto, trecho: achada && achada.previewUrl, botao, card: cards[i] }
        if (achada && achada.previewUrl) {
            botao.addEventListener("click", () => tocarFaixa(i))
        } else {
            botao.disabled = true
            botao.title = "Trecho não encontrado"
        }
    })
}

// ===== Extra do Matheus: tocador "Tocando agora" (referência 2) e mini tocador no rodapé (referência 1) =====
// Apertar ▶ abre o card grande; a setinha ⌄ minimiza para o mini tocador; tocar no mini abre de novo.

const iconeAnterior = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 5H8v14H5.5zM19 5.9v12.2a1 1 0 0 1-1.55.83L9.3 13.83a1 1 0 0 1 0-1.66l8.15-5.1A1 1 0 0 1 19 5.9z" /></svg>`
const iconeProxima = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 5h2.5v14H16zM5 5.9v12.2a1 1 0 0 0 1.55.83l8.15-5.1a1 1 0 0 0 0-1.66L6.55 5.07A1 1 0 0 0 5 5.9z" /></svg>`
const iconeMinimizar = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg>`
const iconeFechar = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg>`

const tocador = document.createElement("div")
tocador.className = "tocador"
tocador.hidden = true
tocador.innerHTML = `
    <div class="tocador-card" role="dialog" aria-modal="true" aria-label="Tocando agora">
        <div class="tocador-topo">
            <button type="button" class="tocador-minimizar" aria-label="Minimizar o tocador">${iconeMinimizar}</button>
            <span>Tocando agora</span>
            <span></span>
        </div>
        <div class="tocador-capa"></div>
        <div class="tocador-texto">
            <h2 class="tocador-titulo"></h2>
            <p class="tocador-artista"></p>
        </div>
        <input type="range" class="tocador-barra" min="0" max="30" step="0.1" value="0" aria-label="Posição do trecho">
        <div class="tocador-tempos"><span class="tempo-atual">0:00</span><span class="tempo-total">0:30</span></div>
        <div class="tocador-controles">
            <button type="button" class="tocador-anterior" aria-label="Música anterior">${iconeAnterior}</button>
            <button type="button" class="tocador-play" aria-label="Pausar">${iconePausar}</button>
            <button type="button" class="tocador-proxima" aria-label="Próxima música">${iconeProxima}</button>
        </div>
    </div>`

const mini = document.createElement("div")
mini.className = "mini"
mini.hidden = true
mini.innerHTML = `
    <button type="button" class="mini-abrir" aria-label="Abrir o tocador">
        <span class="mini-capa"></span>
        <span class="mini-texto"><b class="mini-titulo"></b><span class="mini-artista"></span></span>
    </button>
    <button type="button" class="mini-play" aria-label="Pausar">${iconePausar}</button>
    <button type="button" class="mini-proxima" aria-label="Próxima música">${iconeProxima}</button>
    <button type="button" class="mini-fechar" aria-label="Parar e fechar">${iconeFechar}</button>
    <span class="mini-barra"><i></i></span>`

document.body.append(tocador, mini)

const barra = tocador.querySelector(".tocador-barra")

// 75 segundos vira "1:15"
function tempo(segundos) {
    const s = Math.max(0, Math.floor(segundos || 0))
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

function tocarFaixa(i, abrir = true) {
    // A música que já está no tocador: pausa ou continua
    if (i === atual) {
        if (audio.paused) {
            audio.play()
            if (abrir) abrirTocador()
        } else {
            audio.pause()
        }
        return
    }

    const faixa = faixas[i]
    atual = i
    audio.src = faixa.trecho
    audio.play()

    const capa = faixa.foto ? `<img src="${faixa.foto}" alt="">` : ""
    tocador.querySelector(".tocador-capa").innerHTML = capa
    tocador.querySelector(".tocador-titulo").textContent = faixa.musica.titulo
    tocador.querySelector(".tocador-artista").textContent = faixa.musica.artista
    mini.querySelector(".mini-capa").innerHTML = capa
    mini.querySelector(".mini-titulo").textContent = faixa.musica.titulo
    mini.querySelector(".mini-artista").textContent = faixa.musica.artista

    if (abrir) abrirTocador()
}

function alternarTocar() {
    if (atual < 0) return
    if (audio.paused) {
        audio.play()
    } else {
        audio.pause()
    }
}

// Pula para a próxima (1) ou anterior (-1) música que tem trecho; volta ao começo da lista no fim
function pular(direcao, abrir) {
    for (let passo = 1; passo < faixas.length; passo++) {
        const i = (atual + direcao * passo + faixas.length) % faixas.length
        if (faixas[i] && faixas[i].trecho) {
            tocarFaixa(i, abrir)
            return
        }
    }
}

function abrirTocador() {
    tocador.classList.remove("saindo")
    tocador.hidden = false
    mini.hidden = true
    document.body.classList.remove("com-mini")
    tocador.querySelector(".tocador-play").focus({ preventScroll: true })
}

function minimizarTocador() {
    if (tocador.hidden) return
    tocador.classList.add("saindo")
    setTimeout(() => {
        tocador.hidden = true
        tocador.classList.remove("saindo")
    }, 250)
    mini.hidden = false
    document.body.classList.add("com-mini")
}

function fecharTudo() {
    audio.pause()
    atual = -1
    tocador.hidden = true
    mini.hidden = true
    document.body.classList.remove("com-mini")
    atualizarEstado()
}

// Ícones de tocar/pausar e ondas sonoras no card da lista, no tocador e no mini
function atualizarEstado() {
    const tocando = atual >= 0 && !audio.paused

    faixas.forEach((faixa, i) => {
        if (!faixa) return
        const esta = i === atual && tocando
        faixa.botao.classList.toggle("tocando", esta)
        faixa.card.classList.toggle("tocando", esta)   // a linha do card vira ondas sonoras
        faixa.botao.setAttribute("aria-pressed", esta ? "true" : "false")
        faixa.botao.innerHTML = esta ? iconePausar : iconeTocar
    })

    for (const botao of [tocador.querySelector(".tocador-play"), mini.querySelector(".mini-play")]) {
        botao.innerHTML = tocando ? iconePausar : iconeTocar
        botao.setAttribute("aria-label", tocando ? "Pausar" : "Tocar")
    }
    tocador.classList.toggle("pausado", !tocando)
}

function atualizarProgresso() {
    const total = audio.duration || 30
    const porcento = Math.min(100, (audio.currentTime / total) * 100)
    barra.max = total
    barra.value = audio.currentTime
    barra.style.setProperty("--progresso", `${porcento}%`)
    tocador.querySelector(".tempo-atual").textContent = tempo(audio.currentTime)
    tocador.querySelector(".tempo-total").textContent = tempo(total)
    mini.querySelector(".mini-barra i").style.width = `${porcento}%`
}

audio.addEventListener("play", atualizarEstado)
audio.addEventListener("pause", atualizarEstado)
audio.addEventListener("timeupdate", atualizarProgresso)
audio.addEventListener("loadedmetadata", atualizarProgresso)

// O trecho acabou: vai para a próxima música da lista (para no fim)
audio.addEventListener("ended", () => {
    const proxima = faixas.findIndex((faixa, i) => i > atual && faixa && faixa.trecho)
    if (proxima >= 0) {
        tocarFaixa(proxima, false)
    } else {
        atualizarEstado()
    }
})

// Arrastar a barra muda a posição do trecho
barra.addEventListener("input", () => {
    audio.currentTime = Number(barra.value)
    atualizarProgresso()
})

tocador.querySelector(".tocador-minimizar").addEventListener("click", minimizarTocador)
tocador.querySelector(".tocador-play").addEventListener("click", alternarTocar)
tocador.querySelector(".tocador-anterior").addEventListener("click", () => pular(-1, true))
tocador.querySelector(".tocador-proxima").addEventListener("click", () => pular(1, true))
tocador.addEventListener("click", (evento) => {
    if (evento.target === tocador) minimizarTocador()   // tocou fora do card
})

mini.querySelector(".mini-abrir").addEventListener("click", abrirTocador)
mini.querySelector(".mini-play").addEventListener("click", alternarTocar)
mini.querySelector(".mini-proxima").addEventListener("click", () => pular(1, false))
mini.querySelector(".mini-fechar").addEventListener("click", fecharTudo)

document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && !tocador.hidden) minimizarTocador()
})


// ===== Extra do Matheus: a abertura só aparece quando o site é aberto =====
// Voltando para a página inicial durante a visita, ela não aparece de novo.
// (sessionStorage dura enquanto a aba estiver aberta; fechou e abriu o site de novo, a abertura volta)
try {
    if (sessionStorage.getItem("abriuSite")) {
        document.documentElement.classList.add("ja-abriu")
    }
    sessionStorage.setItem("abriuSite", "sim")
} catch (error) {
    console.log(error)
}
