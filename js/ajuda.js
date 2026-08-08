(function () {
'use strict';

// ==========================================================
// CONFIGURAÇÃO
// ==========================================================

const API_URL =
    'https://sistema-doacoes.moviesbrasil.workers.dev/doacoes';

const GOAL = 2300;

const FETCH_TIMEOUT = 5000;

const UPDATE_INTERVAL = 30000;

const MAX_NAME_LENGTH = 40;

const nav = document.querySelector("nav");

if (!nav) return;


// ==========================================================
// ESTADO
// ==========================================================

let loading = false;

let currentAnimation = null;

let abortController = null;


// ==========================================================
// FORMATAÇÃO
// ==========================================================

function formatarReal(valor) {

    return new Intl.NumberFormat(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    ).format(valor);

}

// ==========================================================
// VALIDAÇÃO NUMÉRICA
// ==========================================================

function numeroSeguro(valor, padrao = 0) {

    const n = Number(valor);

    if (!Number.isFinite(n))
        return padrao;

    return Math.max(0, n);

}


// ==========================================================
// LIMPEZA DE TEXTO
// ==========================================================

function limparTexto(texto) {

    if (typeof texto !== "string")
        return "Anônimo";

    texto = texto
        .normalize("NFKC")
        .replace(/[\u0000-\u001F\u007F]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    if (!texto.length)
        return "Anônimo";

    if (texto.length > MAX_NAME_LENGTH)
        texto =
            texto.slice(
                0,
                MAX_NAME_LENGTH
            ) + "…";

    return texto;

}
function limparMensagem(texto) {

    if (typeof texto !== "string")
        return "Sem mensagem";

    texto = texto
        .normalize("NFKC")
        .replace(/[\u0000-\u001F\u007F]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    if (!texto.length)
        return "Sem mensagem";

    if (texto.length > 100)
        texto = texto.slice(0, 100) + "...";

    return texto;

}


// ==========================================================
// VALIDAÇÃO DA API
// ==========================================================

function validarRespostaAPI(json) {

    if (
        !json ||
        typeof json !== "object"
    ) {

        throw new Error(
            "Resposta inválida."
        );

    }

    if (
        !Array.isArray(
            json.doacoes
        )
    ) {

        throw new Error(
            "Campo doacoes inválido."
        );

    }

    if (
        !Array.isArray(
            json.ranking
        )
    ) {

        throw new Error(
            "Campo ranking inválido."
        );

    }

    json.total =
        numeroSeguro(
            json.total,
            0
        );

    json.doacoes = json.doacoes
        .filter(item => item)
        .slice(0, 100)
        .map(item => ({
            nome: limparTexto(item.nome),
            valor: numeroSeguro(item.valor, 0)
        }));


    json.ranking = json.ranking
        .filter(item => item)
        .slice(0, 3)
        .map(item => ({
            nome: limparTexto(item.nome),
            valor: numeroSeguro(item.valor, 0),
            mensagem: limparMensagem(item.mensagem || "")
        }));

    return json;

}


// ==========================================================
// DOAÇÕES PENDENTES DE ANIMAÇÃO
// ==========================================================
// O servidor agora devolve, em broadcast, toda doação criada dentro
// de uma janela de tempo (não mais "a primeira aba que perguntar
// leva"). Cabe a CADA cliente decidir se ainda deve tocar a
// animação, comparando o horário em que a doação aconteceu com a
// duração da animação daquele valor:
//
//   - Se o usuário já está na página -> ainda dentro do prazo -> toca.
//   - Se o usuário entrou depois que o prazo já expirou -> ignora.
//   - Se o usuário entrou no meio do prazo -> ainda toca (mesmo que,
//     na prática, quem já estava vendo esteja num ponto mais
//     avançado da animação).

const PENDENTES_URL =
    'https://sistema-doacoes.moviesbrasil.workers.dev/doacoes-pendentes';

const PENDENTES_INTERVAL = 2500; // polling rápido para simular tempo real

let buscandoPendentes = false;

// Mesma tabela de duração usada em animacao.js (duracaoCelebracao),
// para o front conseguir calcular, por conta própria, se uma doação
// ainda está "viva" ou já expirou.
const DURACAO_POR_NIVEL_MS = [
    6000,  // nível 1 — valor < 5
    6500,  // nível 2 — valor >= 5
    8000,  // nível 3 — valor >= 10
    8500,  // nível 4 — valor >= 20
    9000,  // nível 5 — valor >= 50
    9500,  // nível 6 — valor >= 100
    10000  // nível 7 — valor >= 499
];

function calcularNivelDoacao(valor) {

    if (valor >= 499) return 7;
    if (valor >= 100) return 6;
    if (valor >= 50)  return 5;
    if (valor >= 20)  return 4;
    if (valor >= 10)  return 3;
    if (valor >= 5)   return 2;

    return 1;

}

function duracaoAnimacaoMs(valor) {

    const nivel = calcularNivelDoacao(numeroSeguro(valor));

    return DURACAO_POR_NIVEL_MS[nivel - 1];

}

// Converte o "data" vindo do D1 (formato SQLite datetime('now'),
// ex: "2026-08-08 20:15:03", sempre em UTC) para milissegundos,
// interpretando corretamente como UTC (sem isso o navegador trataria
// como horário local e o cálculo de "expirou ou não" ficaria errado).
function timestampServidorMs(dataStr) {

    if (typeof dataStr !== "string")
        return null;

    const iso = dataStr.trim().replace(" ", "T") + "Z";
    const t = Date.parse(iso);

    return Number.isFinite(t) ? t : null;

}

// Guarda quais doações já foram processadas nesta sessão (evita
// disparar a mesma animação de novo a cada polling, já que o
// servidor devolve tudo que está dentro da janela, não só o que é
// "novo"). Guardamos junto o momento em que foram vistas, para poder
// limpar entradas antigas e não deixar esse controle crescer pra
// sempre numa sessão longa.
const doacoesJaProcessadas = new Map();

function limparProcessadasAntigas() {

    const agora = Date.now();
    const LIMITE_MS = 60000; // bem maior que a maior duração de animação

    for (const [id, vistoEm] of doacoesJaProcessadas) {

        if (agora - vistoEm > LIMITE_MS) {
            doacoesJaProcessadas.delete(id);
        }

    }

}

async function buscarDoacoesPendentes() {

    if (buscandoPendentes)
        return;

    buscandoPendentes = true;

    try {

        const resposta = await fetch(
            PENDENTES_URL,
            {
                method: "GET",
                cache: "no-store",
                credentials: "omit"
            }
        );

        if (!resposta.ok)
            return;

        const dados = await resposta.json();

        if (!dados || !Array.isArray(dados.pendentes))
            return;

        const agora = Date.now();

        limparProcessadasAntigas();

        for (const doacao of dados.pendentes) {

            if (!doacao || doacao.id === undefined || doacao.id === null)
                continue;

            // Já mostramos (ou descartamos) essa doação nesta sessão.
            if (doacoesJaProcessadas.has(doacao.id))
                continue;

            const valor = numeroSeguro(doacao.valor);
            const timestamp = timestampServidorMs(doacao.data);

            // Marca como processada de qualquer forma, pra não ficar
            // reavaliando a mesma doação a cada novo polling.
            doacoesJaProcessadas.set(doacao.id, agora);

            if (timestamp === null)
                continue;

            const duracao = duracaoAnimacaoMs(valor);
            const decorrido = agora - timestamp;

            // Requisito 2: quem entrou depois que a animação já
            // expirou não vê mais nada.
            if (decorrido >= duracao)
                continue;

            // Requisito 1 e 3: dentro do prazo -> toca, seja porque o
            // usuário já estava na página, seja porque entrou no meio
            // da janela.
            if (typeof window.mostrarCelebracao === "function") {

                window.mostrarCelebracao(
                    limparTexto(doacao.nome),
                    valor
                );

            }

        }

    } catch (erro) {

        console.error(
            "Falha ao buscar doações pendentes.",
            erro
        );

    } finally {

        buscandoPendentes = false;

    }

}


// ==========================================================
// FETCH SEGURO
// ==========================================================

async function buscarDoacoes() {

    if (loading)
        return null;

    loading = true;

    try {

        if (abortController) {

            abortController.abort();

        }

        abortController =
            new AbortController();

        const timeout =
            setTimeout(
                () =>
                    abortController.abort(),
                FETCH_TIMEOUT
            );

        const resposta =
            await fetch(
                API_URL,
                {
                    method: "GET",
                    cache: "no-store",
                    credentials: "omit",
                    redirect: "follow",
                    signal:
                        abortController.signal
                }
            );

        clearTimeout(timeout);

        if (!resposta.ok) {

            throw new Error(
                `HTTP ${resposta.status}`
            );

        }

        const contentType =
            resposta.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {

            throw new Error(
                "A API retornou um formato inválido."
            );

        }
        const dados =
            await resposta.json();

        return validarRespostaAPI(
            dados
        );

    }

    finally {

        loading = false;

    }

}

// ==========================================================
// CORES
// ==========================================================

function getDonorBackground(valor) {

    if (valor > 499)
        return "purple"

    if (valor >= 100)
        return "#F00100";

    if (valor >= 50)
        return "#F2005D";

    if (valor >= 20)
        return "#FD7501";

    if (valor >= 10)
        return "#FEDC3D";

    if (valor >= 5)
        return "#01EAFF";

    if (valor >= 1)
        return "#2a4ea9a9";

    return "#ffcc001f";

}

// ==========================================================
// AJUDANTES DOM
// ==========================================================

function criarElemento(
    tag,
    texto = null,
    estilo = null
) {

    const el =
        document.createElement(tag);

    if (texto !== null) {

        el.textContent = texto;

    }

    if (estilo) {

        el.style.cssText = estilo;

    }

    return el;

}


function removerInterfaceAnterior() {

    if (
        currentAnimation
    ) {

        currentAnimation.cancel();

        currentAnimation = null;

    }

    const antigo =
        document.getElementById(
            "donor-ticker-wrapper"
        );

    if (antigo) {

        antigo.remove();

    }

}
// ==========================================================
// CRIAÇÃO DA INTERFACE
// ==========================================================

async function carregarDoacoes() {

const dados = await buscarDoacoes();

if (!dados)
    return;

// A animação não é mais disparada aqui: quem decide o que já foi
// "comemorado" é o servidor, via buscarDoacoesPendentes().
// Esta função cuida só da parte visual (ticker, ranking, total).

removerInterfaceAnterior();

const navStyle =
    getComputedStyle(nav);

const navBg =
    navStyle.backgroundColor || "#1f1f1f";



// ==========================================================
// WRAPPER
// ==========================================================

const wrapper =
    criarElemento("div");

wrapper.id =
    "donor-ticker-wrapper";

wrapper.style.cssText = `
    background:transparent;
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
    padding:4px 10px;
    box-sizing:border-box;
    font-family:'Open Sans',Arial,sans-serif;
    gap:4px;
    width:100%;
`;

// ==========================================================
// PRIMEIRA LINHA
// ==========================================================

const tickerDiv =
    criarElemento("div");

tickerDiv.style.cssText = `
    width:100%;
    overflow:hidden;
    white-space:nowrap;
    display:flex;
    align-items:center;
    min-width:0;
    flex-shrink:0;
    background:${navBg};
    height:26px;
    border-radius:4px;
    padding:0 10px;
`;



const track =
    criarElemento("div");

track.className =
    "donor-track";

track.style.cssText = `
    display:flex;
    width:max-content;
    white-space:nowrap;
    will-change:transform;
`;

// ==========================================================
// CRIA TODAS AS DOAÇÕES
// ==========================================================

const lista =
    [...dados.doacoes].reverse();

for (const doacao of lista) {

    const valor =
        numeroSeguro(
            doacao.valor
        );

    const span =
        criarElemento("span");

    span.style.cssText = `
        display:inline-block;
        color: white;
        font-family:'Orbitron', Arial, sans-serif;
        font-size:0.8rem;
        font-weight:normal;
        padding:0 10px;
        letter-spacing:2px;
        line-height:1.2;
        white-space:nowrap;
    `;


    // Nome seguro (textContent)

    span.append(
        document.createTextNode(
            doacao.nome + " "
        )
    );


    const badge =
        criarElemento(
            "span",
            formatarReal(valor)
        );

    badge.style.cssText = `
        color: black;
        background:${getDonorBackground(valor)};
        padding:1px 5px;
        border-radius:20px;
        font-size:.7rem;
        font-weight:700;
        display:inline-block;
        margin-left:2px;
    `;


    span.appendChild(
        badge
    );

    track.appendChild(
        span
    );

}



tickerDiv.appendChild(
    track
);



wrapper.appendChild(
    tickerDiv
);



requestAnimationFrame(() => {

    const larguraContainer =
        tickerDiv.clientWidth;

    const larguraTrack =
        track.getBoundingClientRect().width;


    if (
        currentAnimation
    ) {

        currentAnimation.cancel();

    }
    requestAnimationFrame(() => {

        const containerWidth = tickerDiv.clientWidth;
        const trackWidth = track.getBoundingClientRect().width;

        if (currentAnimation) {
            currentAnimation.cancel();
        }

        // Calcula a distância TOTAL necessária:
        // Começa com a lista toda escondida à esquerda (-trackWidth)
        // E andará até a lista TODA passar do canto direito (containerWidth + trackWidth)
        const pixelsPorSegundo = 80; 
        const distanciaTotal = containerWidth + trackWidth;
        const tempoAnimacao = (distanciaTotal / pixelsPorSegundo) * 1000;

        currentAnimation = track.animate(
            [
                {
                    // 1. Escondido 100% no lado esquerdo fora da tela
                    transform: `translateX(${-trackWidth}px)`
                },
                {
                    // 2. Anda para a direita até o ÚLTIMO ITEM (Kauã) passar 100% pelo lado direito
                    transform: `translateX(${containerWidth + trackWidth}px)`
                }
            ],
            {
                duration: tempoAnimacao,
                iterations: Infinity,
                easing: "linear",
                fill: "forwards"
            }
        );

    });

});

// ==========================================================
// TOTAL
// ==========================================================

const currentStr =
    formatarReal(
        numeroSeguro(dados.total)
    );

const goalStr =
    formatarReal(GOAL);

const progressCard =
    document.getElementById("progress-card");

const porcentagem = Math.min(
    (numeroSeguro(dados.total) / GOAL) * 100,
    100
).toFixed(1);

// elemento novo inserido
const valorArrecadado =
    document.getElementById("valor-arrecadado");

const valorMeta =
    document.getElementById("valor-meta");

const porcentagemMeta =
    document.getElementById("porcentagem");

const barra =
    document.getElementById("barra-preenchida");



if (valorArrecadado)
    valorArrecadado.textContent = currentStr;

if (valorMeta)
    valorMeta.textContent = goalStr;

if (porcentagemMeta)
    porcentagemMeta.textContent = porcentagem + "%";

if (barra)
    barra.style.width = porcentagem + "%";

// elemento novo finalizado  
if (progressCard) {

    progressCard.innerHTML = "";

    const titulo = criarElemento(
        "div",
        `${porcentagem}% arrecadado`
    );

    titulo.style.cssText = `
        color:#fff;
        font-family:'Orbitron',Arial,sans-serif;
        font-size:1rem;
        text-align:center;
        margin-bottom:8px;
        letter-spacing:2px;
    `;

    const barra = criarElemento("div");

    barra.style.cssText = `
        width:100%;
        height:12px;
        background:#4b3528;
        border-radius:20px;
        overflow:hidden;
    `;

    const preenchimento =
        criarElemento("div");

    preenchimento.style.cssText = `
        width:${porcentagem}%;
        height:100%;
        background:#8F9333;
        transition:width .5s ease;
    `;

    barra.appendChild(preenchimento);

    const texto = criarElemento(
        "div",
        `${currentStr} de ${goalStr}`
    );

    texto.style.cssText = `
        margin-top:8px;
        color:#D9CDBF;
        text-align:center;
        font-size:.9rem;
        font-family:'Open Sans',sans-serif;
    `;

    progressCard.append(
        titulo,
        barra,
        texto
    );
}

const totalDiv =
    criarElemento("div");

totalDiv.id =
    "donor-total-line";

totalDiv.style.cssText = `
    background:${navBg};
    padding:0px 18px 7px 18px;   /* margem interna */
    border-radius:4px;
    display:flex;
    flex-wrap:wrap;
    align-items:center;
    justify-content:center;
    column-gap:8px;
    row-gap:2px;
    width:auto;
    max-width:98%;
    min-height:26px;
    margin:0 auto;
    box-sizing:border-box;
    box-shadow: 0px 0px 8px #ffff0038;
    transition:all .3s ease;
    overflow:hidden;
`;
// ==========================================================
// BLOCO TOTAL
// ==========================================================

const totalValue =
    criarElemento("div");

totalValue.className =
    "donor-total-value";

totalValue.style.cssText = `
    display:flex;
    align-items:center;
    gap:6px;
    flex-shrink:0;
    height:26px;
    white-space:nowrap;
`;


const totalLabel =
    criarElemento(
        "span",
        "TOTAL "
    );

totalLabel.style.cssText = `

    color: white;
    font-family:'Orbitron', Arial, sans-serif;
    font-weight:400;
    font-size:.65rem;
    letter-spacing: 2px;
`;


const currentValue =
    criarElemento(
        "span",
        currentStr
    );

// FONT DO RANKING
currentValue.style.cssText = `
    letter-spacing: 2px;
    color:#4caf50;
    font-family: 'Orbitron', Arial, Sans-serif;
    font-size:.8rem;
    font-weight:700;
`;
// FINALIADO


const separator =
    criarElemento(
        "span",
        "/"
    );

separator.className =
    "separator";

separator.style.cssText =
    "color:#555;";


const goalValue =
    criarElemento(
        "span",
        goalStr
    );

goalValue.style.cssText = `
    letter-spacing: 2px;
    color:#ff9800;
    font-family:'Orbitron', Arial, sans-serif;
    font-size:.8rem;
    font-weight:700;
`;


totalValue.append(
    totalLabel,
    currentValue,
    separator,
    goalValue
);

// ==========================================================
// RANKING
// ==========================================================

const rankingDiv = criarElemento("div");

rankingDiv.className = "donor-ranking";

rankingDiv.innerHTML = `
<div class="ranking-title">
    
</div>

<div class="ranking-grid"></div>
`;

const rankingGrid =
    rankingDiv.querySelector(".ranking-grid");

const medalhas = [
    {
        emoji: "🥇",
        cor: "#FFD54A"
    },
    {
        emoji: "🥈",
        cor: "#C7CDD7"
    },
    {
        emoji: "🥉",
        cor: "#D98A42"
    }
];

dados.ranking
.slice(0,3)
.forEach((doador,index)=>{

    const medalha = medalhas[index];

    const card = criarElemento("div");

    card.className = "ranking-card";

    card.innerHTML = `
        <div class="ranking-top">

            <div
                class="ranking-medal"
                style="color:${medalha.cor}"
            >
                ${medalha.emoji}
            </div>

            <div class="ranking-info">

            <div class="ranking-header">

                <span class="ranking-name">
                    ${doador.nome}
                </span>

                <span class="ranking-value">
                    ${formatarReal(doador.valor)}
                </span>

            </div>

            </div>

        </div>

        <div class="ranking-message">
            ${doador.mensagem || "Sem mensagem"}
        </div>
    `;

    rankingGrid.appendChild(card);

});

// ==========================================================
// FINALIZA
// ==========================================================

totalDiv.append(
    totalValue,
    rankingDiv
);

wrapper.appendChild(
    totalDiv
);

nav.parentNode.insertBefore(
    wrapper,
    nav.nextSibling
);

}
// ==========================================================
// CSS
// ==========================================================

if (!document.getElementById("donor-ticker-styles")) {

    const styleEl =
        document.createElement("style");

    styleEl.id =
        "donor-ticker-styles";

    styleEl.textContent = `

        #donor-ticker-wrapper:hover .donor-track{

            animation-play-state:paused;

        }
        /* ================================
        RANKING
        ================================ */

        .donor-ranking{
            width:100%;
            margin-top:12px;

            background:#141414;

            border:1px solid #d2a200;

            border-radius:12px;

            padding:10px;

            box-sizing:border-box;

            box-shadow:0 0 10px #000 inset;

        }

        .ranking-title{

            color:#d7a800;

            font-family:'Orbitron';

            font-size:.88rem;

            font-weight:700;

            margin-bottom:10px;

            letter-spacing:1px;

        }

        .ranking-grid{

            display:grid;

            grid-template-columns:repeat(3,1fr);

            gap:10px;
            

        }

        .ranking-card{

            background:linear-gradient(
                to bottom,
                #202020,
                #181818
            );

            border:1px solid #303030;

            border-radius:10px;

            padding:8px 10px;

            min-height:78px;

            display:flex;

            flex-direction:column;

            justify-content:center;

            transition:.25s;
        }

        .ranking-card:hover{

            border-color:#d2a200;

            transform:translateY(-2px);

        }

        .ranking-top{

            display:flex;

            align-items:center;

            gap:8px;

        }

        .ranking-medal{

            font-size:26px;

            flex:none;

        }

        .ranking-info{

            flex:1;

            min-width:0;

        }

        .ranking-name{

            color:#ff2f7b;

            font-weight:bold;

            font-size:.90rem;

            white-space:nowrap;

            overflow:hidden;

            text-overflow:ellipsis;
        }

        .ranking-value{

            color:#4CAF50;

            font-size:1rem;

            font-weight:700;

            margin-top:2px;
        }

        .ranking-message{

            margin-top:8px;

            color:#eee;

            font-size:.78rem;

            line-height:1.3;

            display:-webkit-box;

            -webkit-line-clamp:5;

            -webkit-box-orient:vertical;

            overflow:hidden;
        }

        @media (max-width:720px){

            #donor-total-line{

                width:98%!important;
                max-width:98%!important;
                padding:0 10px!important;
                border-radius:4px!important;
                row-gap:0!important;

            }


            #donor-total-line .donor-total-value{

                width:100%;
                justify-content:center;

            }


            #donor-total-line .separator{

                display:inline!important;

            }


            #donor-total-line .donor-ranking{
                width:100%;
                justify-content:center;
                padding:0px 12px 7px 12px;      /* espaço nas laterais */
                box-sizing:border-box;
            }

        }



        @media (max-width:375px){

            #donor-total-line{

                padding:2px 6px!important;

                min-height:0!important;

                row-gap:1px!important;

            }


            /* TOTAL */

            #donor-total-line .donor-total-value{

                width:100%!important;

                height:20px!important;

                margin:0!important;

                justify-content:center!important;

                gap:3px!important;

            }


            #donor-total-line .donor-total-value span{

                font-size:.6rem!important;

            }


            /* RANKING */

            #donor-total-line .donor-ranking{

                width:100%!important;

                display:flex!important;

                flex-wrap:wrap!important;

                justify-content:center!important;

                align-items:center!important;

                height:auto!important;

                min-height:0!important;

                margin:0!important;

                padding:0!important;

                gap:1px 6px!important;

            }


            /* 1º DOADOR - LINHA SOZINHO */

            #donor-total-line .donor-ranking>span:first-child{

                width:100%!important;

                flex-basis:100%!important;

                display:flex!important;

                justify-content:center!important;

                align-items:center!important;

                margin:0!important;

                padding:0!important;

            }


            /* 2º E 3º - MESMA LINHA */

            #donor-total-line .donor-ranking>span:nth-child(2),

            #donor-total-line .donor-ranking>span:nth-child(3){

                width:auto!important;

                flex:0 0 auto!important;

                display:inline-flex!important;

                justify-content:center!important;

                align-items:center!important;

                margin:0!important;

                padding:0!important;

            }


            /* NOME + VALOR */

            #donor-total-line .donor-ranking>span{

                font-size:.6rem!important;

                line-height:1!important;

                min-height:0!important;

                height:16px!important;

                white-space:nowrap!important;

            }

        }
        @media (max-width:900px){

            .ranking-grid{

                grid-template-columns:repeat(2,1fr);

            }

        }

        @media (max-width:600px){

            .ranking-grid{

                grid-template-columns:1fr;

            }

            .ranking-card{

                min-height:70px;

                padding:8px;

            }

            .ranking-name{

                font-size:.82rem;

            }

            .ranking-value{

                font-size:.9rem;

            }

            .ranking-message{

                font-size:.72rem;

            }

        }
    `;

    document.head.appendChild(
        styleEl
    );

}



// ==========================================================
// PRIMEIRA EXECUÇÃO
// ==========================================================

carregarDoacoes()
    .catch(error=>{

        console.error(
            "Falha ao carregar doações.",
            error
        );

    });



// ==========================================================
// ATUALIZAÇÃO
// ==========================================================

if(
    window.__donorTickerInterval
){

    clearInterval(
        window.__donorTickerInterval
    );

}


window.__donorTickerInterval =
    setInterval(()=>{

        carregarDoacoes()
            .catch(error=>{

                console.error(
                    "Falha ao atualizar ticker.",
                    error
                );

            });

    },UPDATE_INTERVAL);


// ==========================================================
// PENDENTES (dispara a animação de celebração)
// ==========================================================

if (
    window.__donorPendentesInterval
) {

    clearInterval(
        window.__donorPendentesInterval
    );

}

buscarDoacoesPendentes()
    .catch(error=>{

        console.error(
            "Falha ao checar doações pendentes.",
            error
        );

    });

window.__donorPendentesInterval =
    setInterval(()=>{

        buscarDoacoesPendentes()
            .catch(error=>{

                console.error(
                    "Falha ao checar doações pendentes.",
                    error
                );

            });

    }, PENDENTES_INTERVAL);

})();

const linkPix = document.getElementById("link-pix");

if (linkPix) {

    const textoOriginal = linkPix.textContent.trim();

    linkPix.addEventListener("dblclick", async () => {

        try {

            await navigator.clipboard.writeText(textoOriginal);

            linkPix.textContent = "✅ Link copiado";

            setTimeout(() => {

                linkPix.textContent = textoOriginal;

            }, 1500);

        } catch (erro) {

            console.error(erro);

        }

    });

}