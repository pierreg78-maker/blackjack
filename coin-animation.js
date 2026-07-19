"use strict";

/* ==========================================================
   ATELIER MÉMO — ANIMATION DES PIÈCES D'OR
   Module réutilisable dans les jeux du Village
========================================================== */

(() => {
    const ASSET_BASE =
        "https://raw.githubusercontent.com/pierreg78-maker/AtelierMemo-Assets/main/assets/casino/casino-ui/Pieces/";

    const COIN_AVERS =
        ASSET_BASE + "piece-or-atelier-memo-avers.png";

    const COIN_REVERS =
        ASSET_BASE + "piece-or-atelier-memo-revers.png";

    const stage = document.getElementById("betStage");
    const pot = document.getElementById("betPot");
    const label = stage?.querySelector(".betStageLabel");

    if (!stage || !pot || !label) {
        console.warn(
            "Animation des pièces indisponible : #betStage, #betPot ou .betStageLabel est absent."
        );
        return;
    }

    let animationToken = 0;

    function wait(ms) {
        return new Promise(resolve => window.setTimeout(resolve, ms));
    }

    function coinCountForBet(amount) {
        if (amount >= 50) return 5;
        if (amount >= 20) return 2;
        return 1;
    }

    function clearClasses() {
        stage.classList.remove("visible", "success", "error");
    }

    function clearCoins() {
        pot.replaceChildren();
    }

    function createCoin(index) {
        const coin = document.createElement("div");
        coin.className = "betCoin";
        coin.style.setProperty("--coin-index", String(index));
        coin.style.animationDelay = `${index * 110}ms`;

        const spinner = document.createElement("div");
        spinner.className = "betCoinSpinner";
        spinner.style.animationDelay = `${index * -90}ms`;

        const avers = document.createElement("img");
        avers.className = "betCoinFace betCoinAvers";
        avers.src = COIN_AVERS;
        avers.alt = "";
        avers.draggable = false;

        const revers = document.createElement("img");
        revers.className = "betCoinFace betCoinRevers";
        revers.src = COIN_REVERS;
        revers.alt = "";
        revers.draggable = false;

        spinner.append(avers, revers);
        coin.appendChild(spinner);

        return coin;
    }

    async function preloadImages() {
        const sources = [COIN_AVERS, COIN_REVERS];

        await Promise.all(
            sources.map(src => new Promise(resolve => {
                const image = new Image();
                image.onload = resolve;
                image.onerror = resolve;
                image.src = src;
            }))
        );
    }

    async function showBet(amount) {
        const token = ++animationToken;
        const count = coinCountForBet(Number(amount) || 10);

        clearClasses();
        clearCoins();

        label.textContent = "Mise en jeu…";

        await preloadImages();

        if (token !== animationToken) return;

        for (let index = 0; index < count; index++) {
            pot.appendChild(createCoin(index));
        }

        stage.setAttribute("aria-hidden", "false");

        window.requestAnimationFrame(() => {
            stage.classList.add("visible");
        });

        await wait(760 + ((count - 1) * 110));
    }

    async function acceptBet() {
        const token = animationToken;

        label.textContent = "Mise acceptée";
        stage.classList.remove("error");
        stage.classList.add("success");

        await wait(460);

        if (token !== animationToken) return;

        clearClasses();
        stage.setAttribute("aria-hidden", "true");
        clearCoins();
    }

    async function rejectBet() {
        const token = animationToken;

        label.textContent = "Mise annulée";
        stage.classList.remove("success");
        stage.classList.add("error");

        await wait(620);

        if (token !== animationToken) return;

        clearClasses();
        stage.setAttribute("aria-hidden", "true");
        clearCoins();
    }

    function reset() {
        animationToken++;
        clearClasses();
        clearCoins();
        stage.setAttribute("aria-hidden", "true");
        label.textContent = "Mise en jeu…";
    }

    window.AtelierMemoCoins = Object.freeze({
        showBet,
        acceptBet,
        rejectBet,
        reset
    });
})();
