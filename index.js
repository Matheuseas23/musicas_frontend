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
                    <button class="apagar">Apagar</button>
                </div>
            </article>
        `
    })

    colocarCapasETrechos(musicas)   // extra: capa e trecho do iTunes (abaixo)
}

buscarMusicas()


// ===== Extra do Matheus: capa e trecho de 30 segundos do iTunes =====
// A busca do iTunes é grátis, não precisa de chave e pode ser usada direto do navegador.
// O banco e o backend não mudam: a capa e o trecho são achados pelo título e pelo artista.

const iconeTocar = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l10.4-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14z" /></svg>`
const iconePausar = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /></svg>`

// Capas escolhidas pelo Matheus que o iTunes do Brasil não tem
const capasProprias = {
    "something just like this": "capas/something.jpg"
}

const audio = new Audio()
let botaoTocando = null

// Tira acentos, apóstrofos, maiúsculas e o que está entre parênteses:
// "Feel So Close (Radio Edit)" vira "feel so close" e "BK'" vira "bk" (no iTunes é "BK")
function simplificar(texto) {
    return texto
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/['’`´]/g, "")
        .replace(/\(.*?\)/g, "")
        .toLowerCase()
        .trim()
}

async function buscarNoItunes(musica) {
    const titulo = simplificar(musica.titulo)
    const artista = simplificar(musica.artista).split(/ e | & |, /)[0]   // só o 1º artista
    const termo = encodeURIComponent(`${titulo} ${artista}`)
    const resposta = await fetch(`https://itunes.apple.com/search?term=${termo}&entity=song&limit=15&country=BR`)
    const dados = await resposta.json()

    // Só a mesma música do mesmo artista; de preferência a versão de estúdio (sem ao vivo, remix ou acústico)
    const mesmas = dados.results.filter((r) =>
        simplificar(r.trackName).startsWith(titulo) && simplificar(r.artistName).includes(artista))
    const estudio = mesmas.find((r) =>
        !/\b(live|ao vivo|remix|acoustic|acustico)\b/i.test(`${r.trackName} ${r.collectionName}`))
    return estudio || mesmas[0] || null
}

function colocarCapasETrechos(musicas) {
    const cards = listaMusicas.querySelectorAll(".musica")

    musicas.forEach(async (musica, i) => {
        const capa = cards[i].querySelector(".capa")
        const botao = cards[i].querySelector(".tocar")

        let achada = null
        try {
            achada = await buscarNoItunes(musica)
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
        if (achada && achada.previewUrl) {
            botao.addEventListener("click", () => tocarTrecho(botao, achada.previewUrl))
        } else {
            botao.disabled = true
            botao.title = "Trecho não encontrado"
        }
    })
}

function tocarTrecho(botao, endereco) {
    // Clicou de novo na música que está tocando: para
    if (botaoTocando === botao) {
        pararTrecho()
        return
    }

    pararTrecho()
    audio.src = endereco
    audio.play()
    botaoTocando = botao
    botao.classList.add("tocando")
    botao.setAttribute("aria-pressed", "true")
    botao.innerHTML = iconePausar
}

function pararTrecho() {
    audio.pause()
    if (botaoTocando) {
        botaoTocando.classList.remove("tocando")
        botaoTocando.setAttribute("aria-pressed", "false")
        botaoTocando.innerHTML = iconeTocar
    }
    botaoTocando = null
}

// O trecho acaba sozinho nos 30 segundos
audio.addEventListener("ended", pararTrecho)


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
