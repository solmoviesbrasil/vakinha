const elementos = document.querySelectorAll(".reveal");

function revelarElementos() {
    const alturaTela = window.innerHeight;

    elementos.forEach((elemento) => {
        const topo = elemento.getBoundingClientRect().top;

        if (topo < alturaTela - 100) {
            elemento.classList.add("ativo");
        }
    });
}

window.addEventListener("scroll", revelarElementos);
window.addEventListener("load", revelarElementos);