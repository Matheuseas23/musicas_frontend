// ===== Etapa 7: cadastrar uma música =====

const urlBackend = "https://musicas-backend-delta.vercel.app"

const inputTitulo = document.getElementById("titulo")
const inputArtista = document.getElementById("artista")
const inputGenero = document.getElementById("genero")
const inputAno = document.getElementById("ano")
const inputDuracao = document.getElementById("duracao")

const botaoCadastrar = document.getElementById("botaoCadastrar")

botaoCadastrar.addEventListener("click", cadastrarMusica)

async function cadastrarMusica() {
    if (inputTitulo.value === "" || inputArtista.value === "" || inputGenero.value === "" ||
        inputAno.value === "" || inputDuracao.value === "") {
        await avisar("Preencha todos os campos!")   // alert em Liquid Glass (no fim do arquivo)
        return
    }

    const musica = {
        titulo: inputTitulo.value,
        artista: inputArtista.value,
        genero: inputGenero.value,
        ano: inputAno.valueAsNumber,
        duracao: inputDuracao.valueAsNumber
    }

    const resposta = await fetch(`${urlBackend}/cadastrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(musica)
    })

    const dados = await resposta.json()
    await avisar(dados.mensagem)   // alert em Liquid Glass (no fim do arquivo)

    window.location.href = "index.html"
}


// ===== Extra do Matheus: aviso do iTunes embaixo do Título =====
// Enquanto você digita, o site procura a música no iTunes e avisa se achou (com a capinha) ou não.
// Achou: na lista ela aparece com capa e trecho. Não achou: aparece sem foto de capa.

const avisoItunes = document.createElement("p")
avisoItunes.className = "aviso-itunes"
avisoItunes.setAttribute("aria-live", "polite")
inputTitulo.parentElement.append(avisoItunes)

let esperaBusca = null
let numeroBusca = 0

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

async function procurarNoItunes() {
    const esta = ++numeroBusca   // para ignorar respostas de buscas antigas

    if (simplificar(inputTitulo.value) === "") {
        avisoItunes.className = "aviso-itunes"
        avisoItunes.innerHTML = ""
        return
    }

    avisoItunes.className = "aviso-itunes"
    avisoItunes.textContent = "Procurando no iTunes..."

    try {
        const achada = await buscarNoItunes(inputTitulo.value, inputArtista.value)
        if (esta !== numeroBusca) return

        ultimaAchada = achada || null

        if (achada) {
            avisoItunes.className = "aviso-itunes achou"
            avisoItunes.innerHTML = `
                <button type="button" class="preencher">
                    <img src="${achada.artworkUrl100}" alt="">
                    <span>Encontrei no iTunes: ${achada.trackName} · ${achada.artistName}
                        <small>Toque aqui para preencher tudo</small></span>
                </button>`
        } else {
            avisoItunes.className = "aviso-itunes nao-achou"
            avisoItunes.textContent = "Não encontrei no iTunes: a música vai ficar sem foto de capa."
        }
    } catch (error) {
        console.log(error)
        avisoItunes.className = "aviso-itunes nao-achou"
        avisoItunes.textContent = "Não consegui falar com o iTunes agora."
    }
}

// Procura quando você para de digitar (0,6 s)
function agendarBusca() {
    clearTimeout(esperaBusca)
    esperaBusca = setTimeout(procurarNoItunes, 600)
}

inputTitulo.addEventListener("input", agendarBusca)
inputArtista.addEventListener("input", agendarBusca)


// ===== Extra do Matheus: tocar no aviso preenche os 5 campos com os dados do iTunes =====
let ultimaAchada = null

function preencherComItunes() {
    const m = ultimaAchada
    if (!m) return

    inputTitulo.value = m.trackName
    inputArtista.value = m.artistName.replace(/ & /g, " e ")           // "Link do Zap & pluglip" vira "Link do Zap e pluglip"
    inputGenero.value = m.primaryGenreName
    inputAno.value = new Date(m.releaseDate).getFullYear()
    inputDuracao.value = Math.max(1, Math.round(m.trackTimeMillis / 60000))   // minutos, arredondado

    avisoItunes.className = "aviso-itunes achou"
    avisoItunes.innerHTML = `<img src="${m.artworkUrl100}" alt=""> Preenchido com os dados do iTunes. Confira e clique em Cadastrar.`
}

avisoItunes.addEventListener("click", (evento) => {
    if (evento.target.closest(".preencher")) {
        preencherComItunes()
    }
})


// ===== Extra do Matheus: caixa de aviso em Liquid Glass (no lugar do alert do navegador) =====

function avisar(mensagem) {
    return new Promise((resolver) => {
        const fundo = document.createElement("div")
        fundo.className = "caixa-fundo"
        fundo.innerHTML = `
            <div class="caixa" role="alertdialog" aria-modal="true" aria-labelledby="caixaTexto">
                <p id="caixaTexto">${mensagem}</p>
                <div class="caixa-botoes"><button type="button" class="caixa-ok">OK</button></div>
            </div>`

        const botao = fundo.querySelector(".caixa-ok")

        function teclado(evento) {
            if (evento.key === "Escape") fechar()
        }

        function fechar() {
            document.removeEventListener("keydown", teclado)
            fundo.classList.add("saindo")
            setTimeout(() => fundo.remove(), 200)
            resolver(true)
        }

        botao.addEventListener("click", fechar)
        document.addEventListener("keydown", teclado)
        document.body.append(fundo)
        botao.focus()
    })
}
