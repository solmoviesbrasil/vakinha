(function () {
    "use strict";
//mostrarCelebracao("Lucas", 2);
    let container = null;
    let comemorando = false;
    let filaDoacoes = [];

    const EMOJIS = [
        "🎉",
        "🌟",
        "💸",
        "💟"
    ];

    // Coloque aqui o caminho da imagem .png correspondente a cada valor
    // exato de doação (mesma pasta/padrão usado pelos áudios em "../assets/...")
    const MAPA_IMAGENS = {
        1:    "personagens/pobre/rosa.png",
        2:    "personagens/pobre/pena.png",
        3:    "personagens/pobre/vela.png",
        5:    "personagens/pobre/moeda.png",
        7:    "personagens/pobre/apolo2.png",
        10:   "personagens/pobre/hermes.png",
        20:   "personagens/pobre/ares.png",
        35:   "personagens/rico/hera.png",
        50:   "personagens/rico/apolo2.png",
        75:   "personagens/rico/atena.png",
        100:  "personagens/rico/zeus-joven.png",
        150:  "personagens/rico/hades.png",
        200:  "personagens/rico/poseidon2.png",
        300:  "personagens/rico/zeus.png",
        500:  "personagens/rico/zeus.png",
        750:  "personagens/rico/poseidon.png",
        1000: "personagens/rico/olimpo.png"
    };

    // Lista de valores da tabela, do menor para o maior (calculada uma vez só)
    const VALORES_MAPA_IMAGENS =
        Object.keys(MAPA_IMAGENS)
            .map(Number)
            .sort((a, b) => a - b);

    // Devolve a imagem fixa correspondente ao valor da doação.
    // Se o valor não estiver exatamente na tabela, usa a imagem
    // do degrau mais próximo (igual ou abaixo) daquele valor.
    function obterImagemPorValor(valor) {

        let escolhida = MAPA_IMAGENS[VALORES_MAPA_IMAGENS[0]];

        for (const chave of VALORES_MAPA_IMAGENS) {
            if (valor >= chave) {
                escolhida = MAPA_IMAGENS[chave];
            } else {
                break;
            }
        }

        return escolhida;
    }
    const AUDIOS = {

        baixo: [
            new Audio("../assets/baixo/duck-toy.mp3"),
            new Audio("../assets/baixo/fart-meme.mp3")

        ],

        medio: [
            new Audio("../assets/medio/snupdog.mp3"),
            new Audio("../assets/medio/fein-fein.mp3")
        ],

        alto: [
            new Audio("../assets/alto/aura-tiki.mp3"),
            new Audio("../assets/alto/subaru.mp3")
        ]

    };

    Object.values(AUDIOS)
        .flat()
        .forEach(audio => {

            audio.preload = "auto";
            audio.volume = .45;

        });

    function criarContainer() {

        if (container) return;

        container = document.createElement("div");
        container.id = "celebracao-container";

        container.style.cssText = `
            position:fixed;
            inset:0;
            width:100%;
            height:100%;
            overflow:hidden;
            pointer-events:none;
            z-index:999999;
        `;

        document.body.appendChild(container);
    }
    function tocarSom(valor) {

        let grupo;

        if (valor >= 10) {
            grupo = AUDIOS.alto;
        }
        else if (valor >= 5) {
            grupo = AUDIOS.medio;
        }
        else {
            grupo = AUDIOS.baixo;
        }

        const audio =
            grupo[Math.floor(Math.random() * grupo.length)];

        audio.currentTime = 0;

        audio.play().catch(() => {});

    }
    function processarFila() {

        if (filaDoacoes.length === 0) return;

        const proxima = filaDoacoes.shift();

        window.mostrarCelebracao(proxima.nome, proxima.valor);

    }
    window.mostrarCelebracao = function (nome, valor) {
        if(comemorando) {
            filaDoacoes.push({ nome, valor });
            return;
        }

        comemorando = true;

        setTimeout(() => {

        tocarSom(valor);
        criarContainer();

        container.innerHTML = "";

        const efeitos = {

            emojis: false,

            fitas: false,

            estrelas: false,

            circulo: false,

            moedas: false,

            brilhoMensagem: false,

            brilhoTela: false,

            explosaoGigante: false,

            confetes: false,

            estrelasExtras: false,

            moedasExtras: false,

            brilhoNome: false,

            tempoExtra: false

        };
        if (valor >= 1) {

        }

        if (valor >= 5) {

            efeitos.fitas = true;

        }

        if (valor >= 10) {

            efeitos.emojis = true;
            efeitos.estrelas = true;

        }

        if (valor >= 20) {

            efeitos.circulo = true;

        }

        if (valor >= 50) {

            efeitos.moedas = true;
            efeitos.brilhoMensagem = true;

        }

        if (valor >= 100) {

            efeitos.brilhoTela = true;
            efeitos.tempoExtra = true;

        }

        if (valor >= 499) {

            efeitos.explosaoGigante = true;
            efeitos.confetes = true;
            efeitos.estrelasExtras = true;
            efeitos.moedasExtras = true;
            efeitos.brilhoNome = true;

        }

        let nivel = 1;

        if (valor >= 499) {
            nivel = 7;
        }
        else if (valor >= 100) {
            nivel = 6;
        }
        else if (valor >= 50) {
            nivel = 5;
        }
        else if (valor >= 20) {
            nivel = 4;
        }
        else if (valor >= 10) {
            nivel = 3;
        }
        else if (valor >= 5) {
            nivel = 2;
        }

        const quantidade = 10 + (nivel * 6);

        const explosao = 15 + (nivel * 10);

        const quantidadeParticulas = 20 + (nivel * 15);
        const duracaoCelebracao = [
            6000,
            6500,
            8000,
            8500,
            9000,
            9500,
            10000
        ][nivel - 1];
        const velocidadeAnimacao = [
            10.0,   // R$ 1
            10.1,   // R$ 5
            10.2,   // R$ 10
            10.3,   // R$ 20
            10.45,  // R$ 50
            10.6,   // R$ 100
            10.9    // R$ 499+
        ][nivel - 1];

        // Posição/tamanho da imagem .png (usados também pelo círculo dourado
        // e pela caixa de doação, por isso ficam definidos aqui em cima)
        const imagemTopoVh = 50;
        const tamanhoImagem = 220 + nivel * 15; // nivel 1 → 235px | nivel 7 → 325px
        const raioImagem = tamanhoImagem / 2;
        const deslocamentoInicialImagem = 18;
        const espacoAbaixoImagem = 14;
        const distanciaCaixaPx =
            raioImagem + deslocamentoInicialImagem + espacoAbaixoImagem;

        if (efeitos.emojis) {

            for (let i = 0; i < explosao; i++) {

                const particula = document.createElement("div");

                particula.textContent =
                    EMOJIS[
                        Math.floor(Math.random() * EMOJIS.length)
                    ];

                const angulo = Math.random() * Math.PI * 2;
                const distancia = 180 + Math.random() * 260;
                const tamanho = 4 + Math.random() * 8;

                particula.style.cssText = `
                    position:absolute;
                    left:50%;
                    top:50%;
                    font-size:${12 + tamanho}px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    box-shadow:
                        0 0 8px #FFD84A,
                        0 0 18px #FFD84A,
                        0 0 35px rgba(255,215,0,.6);
                `;

                container.appendChild(particula);

                particula.animate(
                [
                    {
                        transform:"translate(-50%,-50%) scale(.2)",
                        opacity:1
                    },
                    {
                        transform:`
                            translate(
                                calc(-50% + ${Math.cos(angulo) * distancia}px),
                                calc(-50% + ${Math.sin(angulo) * distancia}px)
                            )
                            scale(1)
                        `,
                        opacity:1
                    },
                    {
                        transform:`
                            translate(
                                calc(-50% + ${Math.cos(angulo) * (distancia + 60)}px),
                                calc(-50% + ${Math.sin(angulo) * (distancia + 60)}px)
                            )
                            scale(0)
                        `,
                        opacity:0
                    }
                ],
                {
                    duration:900 * velocidadeAnimacao,
                    easing:"ease-out",
                    fill:"forwards"
                });

                setTimeout(() => {
                    particula.remove();
                },900 * velocidadeAnimacao);

            }

        }

        if (efeitos.fitas) {

            for (let i = 0; i < quantidade; i++) {

                const fita = document.createElement("div");

                const largura = 4 + Math.random() * 4;
                const altura = 140 + Math.random() * 180;
                const esquerda = Math.random() * 100;
                const duracao = 1800 + Math.random() * 2200;
                const atraso = Math.random() * 500;
                const giro = 360 + Math.random() * 1080;
                const deslocamento = (Math.random() - 0.5) * 220;

                fita.style.cssText = `
                    position:absolute;
                    top:-250px;
                    left:${esquerda}%;
                    width:${largura}px;
                    height:${altura}px;

                    border-radius:999px;

                    background:
                        linear-gradient(
                            90deg,
                            #fffbe2 0%,
                            #f7df87 25%,
                            #d3a63c 50%,
                            #f7df87 75%,
                            #fffbe2 100%
                        );

                    box-shadow:
                        0 0 10px rgba(255,220,120,.45),
                        0 0 25px rgba(255,210,80,.25);

                    opacity:.95;

                    transform-origin:center;
                `;
                container.appendChild(fita);

                fita.animate(
                [
                    {
                        transform: `translate(0,-150px) rotate(0deg)`
                    },
                    {
                        transform: `translate(${deslocamento}px,35vh) rotate(${giro/2}deg)`
                    },
                    {
                        transform: `translate(${-deslocamento}px,70vh) rotate(${giro}deg)`
                    },
                    {
                        transform: `translate(${deslocamento/2}px,120vh) rotate(${giro+180}deg)`
                    }
                ],
                {
                    duration: duracao,
                    delay: atraso,
                    easing: "cubic-bezier(.22,.61,.36,1)",
                    fill: "forwards"
                });

                setTimeout(() => {
                    fita.remove();
                }, duracao + atraso);

            }
        } 
        if (efeitos.estrelas) {

            for (let i = 0; i < 12; i++) {

                const estrela = document.createElement("div");

                estrela.style.cssText = `
                    position:absolute;
                    left:50%;
                    top:50%;
                    width:${18 + Math.random()*12}px;
                    opacity:0;
                    pointer-events:none;
                `;

                container.appendChild(estrela);

                const angulo = (Math.PI * 2 / 12) * i;
                const distancia = 90;

                estrela.animate(
                [
                    {
                        transform:"translate(-50%,-50%) scale(.2)",
                        opacity:0
                    },
                    {
                        transform:`
                            translate(
                                calc(-50% + ${Math.cos(angulo)*distancia}px),
                                calc(-50% + ${Math.sin(angulo)*distancia}px)
                            )
                            scale(1)
                        `,
                        opacity:1
                    },
                    {
                        transform:`
                            translate(
                                calc(-50% + ${Math.cos(angulo)*(distancia+30)}px),
                                calc(-50% + ${Math.sin(angulo)*(distancia+30)}px)
                            )
                            scale(.4)
                        `,
                        opacity:0
                    }
                ],
                {
                    duration:1800 * velocidadeAnimacao,
                    easing:"ease-out",
                    fill:"forwards"
                });

                setTimeout(()=>{
                    estrela.remove();
                },1800 * velocidadeAnimacao);

            }

        }  
        if (efeitos.circulo) {

            const circulo = document.createElement("div");

            circulo.style.cssText = `
                position:absolute;
                left:50%;
                top:${imagemTopoVh}vh;
                width:100vmax;
                height:100vmax;
                border-radius:50%;
                border:4px solid rgba(255,215,0,.8);
                transform:translate(-50%,-50%) scale(.02);
                pointer-events:none;
            `;

            container.appendChild(circulo);

            circulo.animate(
            [
                {
                    transform:"translate(-50%,-50%) scale(.02)",
                    opacity:.9
                },
                {
                    transform:"translate(-50%,-50%) scale(1.05)",
                    opacity:0
                }
            ],
            {
                duration:900 * velocidadeAnimacao,
                easing:"ease-out",
                fill:"forwards"
            });

            setTimeout(()=>{
                circulo.remove();
            },900 * velocidadeAnimacao);

        }
        if (efeitos.moedas) {
            for (let i = 0; i < 10; i++) {
                const moeda = document.createElement("div");

                const angulo = Math.random() * Math.PI * 2;

                const distancia = 170 + Math.random() * 120;

                const tamanho = 26 + Math.random() * 18;

                moeda.style.cssText = `
                position:absolute;
                left:50%;
                top:50%;
                width:${tamanho}px;
                pointer-events:none;
                filter:
                drop-shadow(0 0 6px rgba(255,215,0,.7))
                drop-shadow(0 0 14px rgba(255,215,0,.45));
                `;
                container.appendChild(moeda);

                const atraso = Math.random() * 350;

                moeda.animate(
                [
                {
                transform:
                "translate(-50%,-50%) scale(.2) rotate(0deg)",
                opacity:1
                },
                {
                transform:`
                translate(
                calc(-50% + ${Math.cos(angulo)*distancia}px),
                calc(-50% + ${Math.sin(angulo)*distancia}px)
                )
                scale(1)
                rotate(${720 + Math.random()*720}deg)
                `,
                opacity:1
                },
                {
                transform:`
                translate(
                calc(-50% + ${Math.cos(angulo)*(distancia+40)}px),
                calc(-50% + ${Math.sin(angulo)*(distancia+40)}px)
                )
                scale(.5)
                rotate(${1400 + Math.random()*700}deg)
                `,
                opacity:0
                }
                ],
                {
                    duration:2200 * velocidadeAnimacao,
                    delay:atraso,
                    easing:"ease-out",
                    fill:"forwards"
                }); 
                setTimeout(() => {
                    moeda.remove();
                }, (2200 * velocidadeAnimacao) + atraso);
            }


        }

        for (let i = 0; i < quantidadeParticulas; i++) {

            const particula = document.createElement("div");

            const tamanho = 2 + Math.random() * 6;
            const esquerda = Math.random() * 100;
            const duracao = 1200 + Math.random() * 2200;
            const atraso = Math.random() * 800;
            const opacidade = 0.5 + Math.random() * 0.5;

            particula.style.cssText = `
                position:absolute;
                top:-30px;
                left:${esquerda}%;
                width:${tamanho}px;
                height:${tamanho}px;
                object-fit:contain;
                opacity:${opacidade};
                box-shadow:
                    0 0 6px #FFD84A,
                    0 0 14px #FFD84A,
                    0 0 24px rgba(255,215,0,.45);
            `;

            container.appendChild(particula);

            particula.animate(
                [
                    {
                        transform:"translateY(0) scale(.4)",
                        opacity:0
                    },
                    {
                        transform:"translateY(25vh) scale(1)",
                        opacity:1
                    },
                    {
                        transform:`translateY(120vh) scale(.3)`,
                        opacity:0
                    }
                ],
                {
                    duration:duracao,
                    delay:atraso,
                    easing:"linear",
                    fill:"forwards"
                }
            );

            setTimeout(() => {
                particula.remove();
            }, duracao + atraso);

        }

        // ===== IMAGEM .PNG (novo) =====
        // Mostra só UMA imagem por doação (a fixa daquele valor, sem sorteio).
        // Fica ancorada num ponto fixo no topo-centro da tela, com um leve
        // flutuar suave e um brilho dourado ao redor. A caixa de texto (abaixo)
        // é posicionada em relação a este mesmo ponto, então nunca se sobrepõe.
        {
            const imagemFixa = obterImagemPorValor(valor);

            const imgWrap = document.createElement("div");

            imgWrap.style.cssText = `
                position:absolute;
                left:50%;
                top:${imagemTopoVh}vh;
                width:${tamanhoImagem}px;
                height:${tamanhoImagem}px;
                pointer-events:none;
                opacity:0;
                transform:translate(-50%, calc(-50% + ${deslocamentoInicialImagem}px)) scale(.92);
                transition:
                    transform 1.1s cubic-bezier(.22,.61,.36,1),
                    opacity 1.1s ease-out;
            `;

            container.appendChild(imgWrap);

            // Auréola dourada suave por trás da imagem
            const auraImagem = document.createElement("div");

            auraImagem.style.cssText = `
                position:absolute;
                left:50%;
                top:50%;
                width:${tamanhoImagem * 1.55}px;
                height:${tamanhoImagem * 1.55}px;
                transform:translate(-50%,-50%);
                border-radius:50%;
                pointer-events:none;
                background:
                    radial-gradient(
                        circle,
                        rgba(255,215,0,.32) 0%,
                        rgba(255,196,90,.16) 40%,
                        rgba(255,196,90,.05) 65%,
                        transparent 80%
                    );
                filter:blur(18px);
            `;

            imgWrap.appendChild(auraImagem);

            const img = document.createElement("img");

            img.src = imagemFixa;

            img.style.cssText = `
                position:absolute;
                left:50%;
                top:50%;
                width:100%;
                height:100%;
                transform:translate(-50%,-50%);
                object-fit:contain;
                border-radius:10px;
                filter:
                    drop-shadow(0 0 10px rgba(255,215,0,.6))
                    drop-shadow(0 0 22px rgba(255,215,0,.32));
            `;

            imgWrap.appendChild(img);

            // Pequenas partículas de luz orbitando a imagem
            const numParticulasLuz = 8 + nivel;

            for (let i = 0; i < numParticulasLuz; i++) {

                const luz = document.createElement("div");

                const anguloLuz = Math.random() * Math.PI * 2;
                const raioLuz = raioImagem * (0.85 + Math.random() * 0.55);
                const tamanhoLuz = 2 + Math.random() * 3;
                const atrasoLuz = Math.random() * 1400;
                const duracaoLuz = 1600 + Math.random() * 1400;

                luz.style.cssText = `
                    position:absolute;
                    left:50%;
                    top:50%;
                    width:${tamanhoLuz}px;
                    height:${tamanhoLuz}px;
                    border-radius:50%;
                    background:#FFE9A8;
                    box-shadow:
                        0 0 6px #FFD84A,
                        0 0 14px rgba(255,215,0,.7);
                    opacity:0;
                `;

                imgWrap.appendChild(luz);

                luz.animate(
                    [
                        {
                            transform:`translate(calc(-50% + ${Math.cos(anguloLuz)*raioLuz*0.8}px), calc(-50% + ${Math.sin(anguloLuz)*raioLuz*0.8}px)) scale(.4)`,
                            opacity:0
                        },
                        {
                            transform:`translate(calc(-50% + ${Math.cos(anguloLuz)*raioLuz}px), calc(-50% + ${Math.sin(anguloLuz)*raioLuz}px)) scale(1)`,
                            opacity:1,
                            offset:.5
                        },
                        {
                            transform:`translate(calc(-50% + ${Math.cos(anguloLuz)*raioLuz*1.15}px), calc(-50% + ${Math.sin(anguloLuz)*raioLuz*1.15}px)) scale(.3)`,
                            opacity:0
                        }
                    ],
                    {
                        duration:duracaoLuz,
                        delay:atrasoLuz,
                        iterations:Infinity
                    }
                );

            }

            // Sobe suavemente até o ponto de repouso
            requestAnimationFrame(() => {
                imgWrap.style.opacity = "1";
                imgWrap.style.transform = "translate(-50%,-50%) scale(1)";
            });

            // Some suavemente junto com o fim da celebração
            setTimeout(() => {

                imgWrap.style.opacity = "0";
                imgWrap.style.transform =
                    `translate(-50%, calc(-50% - ${deslocamentoInicialImagem}px)) scale(.96)`;

                setTimeout(() => {
                    imgWrap.remove();
                }, 550);

            }, duracaoCelebracao);
        }
        // ===== FIM IMAGEM .PNG =====

        // ===== CAIXA DE DOAÇÃO (pequena, horizontal, sempre abaixo da imagem) =====
        const mensagem = document.createElement("div");

        mensagem.innerHTML = `
            <span style="
                color:#F7E7B4;
                font-weight:600;
                letter-spacing:.5px;
            ">${nome}</span>
            <span style="
                color:rgba(201,168,76,.65);
                font-weight:400;
            ">•</span>
            <span style="
                color:#FFD86B;
                font-weight:600;
                letter-spacing:.5px;
                text-shadow:0 0 10px rgba(255,196,90,.55);
            ">R$ ${valor}</span>
        `;

        mensagem.style.cssText = `
            position:absolute;
            left:50%;
            top:calc(${imagemTopoVh}vh + ${distanciaCaixaPx}px);
            display:inline-flex;
            align-items:center;
            gap:10px;
            white-space:nowrap;
            transform:translate(-50%, 12px) scale(.92);
            color:#F5E6B3;
            font-size:1.05rem;
            font-family:Cinzel, serif;
            background:rgba(8,7,5,.86);
            padding:11px 26px;
            border:1px solid rgba(201,168,76,.55);
            border-radius:10px;
            box-shadow:
                0 0 16px rgba(201,168,76,.35),
                0 0 36px rgba(201,168,76,.16);
            opacity:0;
            transition:opacity .5s ease, transform .5s ease;
        `;

        container.appendChild(mensagem);

        if (efeitos.brilhoNome) {

            // Aura dourada suave e horizontal, centrada na caixa (não na imagem)
            const alturaCaixaEstimativa = 24;
            const centroCaixaPx = distanciaCaixaPx + alturaCaixaEstimativa;

            const halo = document.createElement("div");

            halo.style.cssText = `
                position:absolute;
                left:50%;
                top:calc(${imagemTopoVh}vh + ${centroCaixaPx}px);
                width:420px;
                height:170px;
                transform:translate(-50%,-50%);
                border-radius:50%;
                pointer-events:none;
                background:
                    radial-gradient(
                        ellipse,
                        rgba(255,215,0,.30) 0%,
                        rgba(255,215,0,.13) 40%,
                        rgba(255,215,0,.04) 65%,
                        transparent 80%
                    );
                filter:blur(22px);
                opacity:0;
            `;

            container.insertBefore(halo, mensagem);

            halo.animate(
                [
                    {
                        opacity:0,
                        transform:"translate(-50%,-50%) scale(.8)"
                    },
                    {
                        opacity:1,
                        offset:.25,
                        transform:"translate(-50%,-50%) scale(1)"
                    },
                    {
                        opacity:.85,
                        offset:.75,
                        transform:"translate(-50%,-50%) scale(1.05)"
                    },
                    {
                        opacity:0,
                        transform:"translate(-50%,-50%) scale(1.15)"
                    }
                ],
                {
                    duration:duracaoCelebracao,
                    easing:"ease-out",
                    fill:"forwards"
                }
            );
            setTimeout(() => {
                halo.remove();
            }, duracaoCelebracao);

        }
        if (efeitos.brilhoTela) {

            mensagem.style.boxShadow = `
                0 0 20px rgba(255,215,0,.55),
                0 0 42px rgba(255,215,0,.32),
                0 0 80px rgba(255,215,0,.16)
            `;

            mensagem.style.border = "1px solid #FFD700";

        }

        requestAnimationFrame(() => {
            mensagem.style.opacity = "1";
            mensagem.style.transform = "translate(-50%, 0) scale(1)";
        });

       setTimeout(() => {

            mensagem.style.opacity = "0";
            mensagem.style.transform = "translate(-50%, -8px) scale(.94)";


            setTimeout(() => {
                mensagem.remove();

                comemorando = false;

                processarFila();

            },450);

        }, duracaoCelebracao);
        // ===== FIM CAIXA DE DOAÇÃO =====

        }, 10000);

    };

})();