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

// Igual ao da lista: tira acentos, apóstrofos, maiúsculas e o que está entre parênteses
function simplificar(texto) {
    return texto
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/['’`´]/g, "")
        .replace(/\(.*?\)/g, "")
        .toLowerCase()
        .trim()
}

async function procurarNoItunes() {
    const titulo = simplificar(inputTitulo.value)
    const artista = simplificar(inputArtista.value).split(/ e | & |, /)[0]
    const esta = ++numeroBusca   // para ignorar respostas de buscas antigas

    if (titulo === "") {
        avisoItunes.className = "aviso-itunes"
        avisoItunes.innerHTML = ""
        return
    }

    avisoItunes.className = "aviso-itunes"
    avisoItunes.textContent = "Procurando no iTunes..."

    try {
        const termo = encodeURIComponent(`${titulo} ${artista}`)
        const resposta = await fetch(`https://itunes.apple.com/search?term=${termo}&entity=song&limit=15&country=BR`)
        const dados = await resposta.json()
        if (esta !== numeroBusca) return

        const achada = dados.results.find((r) =>
            simplificar(r.trackName).startsWith(titulo) && simplificar(r.artistName).includes(artista))

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
