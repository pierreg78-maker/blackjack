"use strict";

/* ==========================================================
   BLACKJACK - ATELIER MÉMO
   VERSION 1.2
   Distribution fluide + retournement de la carte cachée
========================================================== */

/* =========================
   ÉLÉMENTS HTML
========================= */

const dealerCardsElement = document.getElementById("dealerCards");
const playerCardsElement = document.getElementById("playerCards");

const dealerScoreElement = document.getElementById("dealerScore");
const playerScoreElement = document.getElementById("playerScore");

const messageElement = document.getElementById("message");

const dealButton = document.getElementById("dealBtn");
const hitButton = document.getElementById("hitBtn");
const standButton = document.getElementById("standBtn");
const newButton = document.getElementById("newBtn");
const goldElement = document.getElementById("gold");
const playerNameElement = document.getElementById("playerName");
const syncStatusElement = document.getElementById("syncStatus");

const betButtons = document.querySelectorAll(
    ".betButton"
);

/* =========================
   PROFIL ET API ATELIER MÉMO
========================= */

const API_URL =
    "https://script.google.com/macros/s/AKfycbyh1LbQNETMy0GS7A5SzACTPMYlFEal9W3-XZozkwzIkAAUhlo_InN-5FOrI9eEqPoEeA/exec";

const PROFILE_KEY = "vitrineProfilActif";

let activeProfile = null;
let profileReady = false;
let syncInProgress = false;

/* =========================
   RÉGLAGES D'ANIMATION
========================= */

const DEAL_DELAY = 320;
const CARD_ANIMATION_DURATION = 420;
const FLIP_DURATION = 560;

let animationInProgress = false;

/* =========================
   ÉTAT DU JEU
========================= */

let deck = [];
let playerHand = [];
let dealerHand = [];

let roundActive = false;
let dealerCardHidden = true;
let gold = 0;
let selectedBet = 10;
let currentBet = 0;

/* =========================
   OUTILS
========================= */

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function readLocalProfile() {
    try {
        return JSON.parse(
            localStorage.getItem(PROFILE_KEY) || "null"
        );
    } catch (error) {
        localStorage.removeItem(PROFILE_KEY);
        return null;
    }
}

function saveLocalProfile(profile) {
    activeProfile = {
        id: profile.id,
        prenom: profile.prenom,
        piecesOr: Math.trunc(
            Number(profile.piecesOr ?? profile.solde) || 0
        ),
        derniereMiseAJour: new Date().toISOString()
    };

    localStorage.setItem(
        PROFILE_KEY,
        JSON.stringify(activeProfile)
    );
}

function setSyncStatus(text = "", type = "") {
    syncStatusElement.textContent = text;
    syncStatusElement.className =
        "syncStatus" + (type ? " " + type : "");
}

async function apiGet(action, parameters = {}) {
    const url = new URL(API_URL);
    url.searchParams.set("action", action);

    Object.entries(parameters).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });

    const response = await fetch(url, {
        method: "GET",
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error("Le serveur ne répond pas.");
    }

    return response.json();
}

async function apiPost(data) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        throw new Error("Le serveur ne répond pas.");
    }

    return response.json();
}

function applyProfile(profile) {
    saveLocalProfile(profile);

    gold = activeProfile.piecesOr;
    playerNameElement.textContent = activeProfile.prenom;
    profileReady = true;

    document.body.classList.remove("profile-missing");

    updateGoldDisplay();
    updateBetButtons();
}

async function loadActiveProfile() {
    const localProfile = readLocalProfile();

    if (!localProfile || !localProfile.id) {
        profileReady = false;
        document.body.classList.add("profile-missing");
        playerNameElement.textContent = "Aucun joueur";
        goldElement.textContent = "—";
        setMessage(
            "Choisissez d’abord un profil dans la Vitrine enchantée."
        );
        setSyncStatus(
            "Le Blackjack utilise le même profil que les autres jeux.",
            "error"
        );
        lockButtons();
        return;
    }

    playerNameElement.textContent =
        localProfile.prenom || "Joueur";

    setSyncStatus("Synchronisation du solde…");

    try {
        const result = await apiGet(
            "obtenirProfil",
            { id: localProfile.id }
        );

        if (!result.ok || !result.profil) {
            throw new Error(
                result.erreur || "Profil introuvable."
            );
        }

        applyProfile(result.profil);
        resetTable();
        setSyncStatus("Solde synchronisé.", "success");

        window.setTimeout(() => {
            setSyncStatus("");
        }, 1800);

    } catch (error) {
        profileReady = false;
        document.body.classList.add("profile-missing");
        goldElement.textContent = "—";
        lockButtons();
        setMessage(
            "Impossible de charger le profil pour le moment."
        );
        setSyncStatus(
            error.message || "Erreur de connexion.",
            "error"
        );
    }
}

async function registerMovement(amount, operation) {
    if (!activeProfile || !activeProfile.id) {
        throw new Error("Aucun profil sélectionné.");
    }

    syncInProgress = true;
    setSyncStatus("Enregistrement des pièces d’or…");

    try {
        const result = await apiPost({
            action: "mouvement",
            profilId: activeProfile.id,
            montant: amount,
            operation: operation
        });

        if (!result.ok) {
            throw new Error(
                result.erreur || "Mouvement refusé."
            );
        }

        if (result.profil) {
            applyProfile(result.profil);
        } else {
            gold = Math.trunc(
                Number(result.solde) || gold + amount
            );
            activeProfile.piecesOr = gold;
            localStorage.setItem(
                PROFILE_KEY,
                JSON.stringify(activeProfile)
            );
            updateGoldDisplay();
        }

        setSyncStatus("Pièces d’or enregistrées.", "success");

        window.setTimeout(() => {
            if (!syncInProgress) {
                setSyncStatus("");
            }
        }, 1600);

        return true;

    } finally {
        syncInProgress = false;
    }
}

/* =========================
   PAQUET
========================= */

function createDeck() {
    const suits = ["♠", "♥", "♦", "♣"];

    const ranks = [
        { label: "A", value: 11 },
        { label: "2", value: 2 },
        { label: "3", value: 3 },
        { label: "4", value: 4 },
        { label: "5", value: 5 },
        { label: "6", value: 6 },
        { label: "7", value: 7 },
        { label: "8", value: 8 },
        { label: "9", value: 9 },
        { label: "10", value: 10 },
        { label: "J", value: 10 },
        { label: "Q", value: 10 },
        { label: "K", value: 10 }
    ];

    const cards = [];

    suits.forEach(suit => {
        ranks.forEach(rank => {
            cards.push({
                suit,
                label: rank.label,
                value: rank.value
            });
        });
    });

    return cards;
}

function shuffleDeck(cards) {
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    return cards;
}

function drawCard() {
    if (deck.length === 0) {
        deck = shuffleDeck(createDeck());
    }

    return deck.pop();
}

/* =========================
   SCORE
========================= */

function calculateScore(hand) {
    let score = 0;
    let aces = 0;

    hand.forEach(card => {
        score += card.value;

        if (card.label === "A") {
            aces++;
        }
    });

    while (score > 21 && aces > 0) {
        score -= 10;
        aces--;
    }

    return score;
}

function isBlackjack(hand) {
    return (
        hand.length === 2 &&
        calculateScore(hand) === 21
    );
}

/* =========================
   CRÉATION DES CARTES
========================= */

function createCardElement(card, hidden = false) {
    const cardElement = document.createElement("div");

    cardElement.className = "card";

    /* =========================
       DOS DE CARTE
    ========================= */

    if (hidden) {
        cardElement.classList.add("card-hidden");
        cardElement.dataset.hidden = "true";

        cardElement.innerHTML = `
            <div class="card-back-inner">

                <div class="card-back-star">
                    ✦ ✦ ✦
                </div>

                <div class="card-back-title">
                    Atelier<br>
                    Mémo
                </div>

                <div class="card-back-star">
                    ✦ ✦ ✦
                </div>

            </div>
        `;

        return cardElement;
    }

    cardElement.dataset.hidden = "false";

    const isRed =
        card.suit === "♥" ||
        card.suit === "♦";

    if (isRed) {
        cardElement.classList.add("red");
    }

    /* =========================
       CONTENU CENTRAL
    ========================= */

    let centerContent = card.suit;
    let centerClass = "card-center";

    if (card.label === "J") {
        centerClass += " figure";

        centerContent = `
            🤵
            <small>${card.suit}</small>
        `;
    } else if (card.label === "Q") {
        centerClass += " figure";

        centerContent = `
            👸
            <small>${card.suit}</small>
        `;
    } else if (card.label === "K") {
        centerClass += " figure";

        centerContent = `
            🤴
            <small>${card.suit}</small>
        `;
    }

    /* =========================
       FACE DE LA CARTE
    ========================= */

    cardElement.innerHTML = `
        <div class="card-corner top">
            <span>${card.label}</span>
            <span>${card.suit}</span>
        </div>

        <div class="${centerClass}">
            ${centerContent}
        </div>

        <div class="card-corner bottom">
            <span>${card.label}</span>
            <span>${card.suit}</span>
        </div>
    `;

    return cardElement;
}

/* =========================
   ANIMATIONS
========================= */

function animateCardArrival(cardElement, direction = "right") {
    if (!cardElement.animate) {
        return;
    }

    const horizontalStart =
        direction === "left"
            ? "-120px"
            : "120px";

    cardElement.animate(
        [
            {
                opacity: 0,
                transform:
                    `translate(${horizontalStart}, -70px) ` +
                    "rotate(8deg) scale(.72)"
            },
            {
                opacity: 1,
                transform:
                    "translate(0, 0) rotate(0deg) scale(1)"
            }
        ],
        {
            duration: CARD_ANIMATION_DURATION,
            easing: "cubic-bezier(.2,.8,.25,1)",
            fill: "both"
        }
    );
}

async function flipDealerCard(cardElement, card) {
    if (!cardElement) {
        return;
    }

    if (!cardElement.animate) {
        const replacement =
            createCardElement(card);

        cardElement.replaceWith(replacement);
        return;
    }

    const firstHalf = cardElement.animate(
        [
            {
                transform: "rotateY(0deg)"
            },
            {
                transform: "rotateY(90deg)"
            }
        ],
        {
            duration: FLIP_DURATION / 2,
            easing: "ease-in",
            fill: "forwards"
        }
    );

    await firstHalf.finished;

    const replacement =
        createCardElement(card);

    replacement.style.transform =
        "rotateY(90deg)";

    cardElement.replaceWith(replacement);

    const secondHalf = replacement.animate(
        [
            {
                transform: "rotateY(90deg)"
            },
            {
                transform: "rotateY(0deg)"
            }
        ],
        {
            duration: FLIP_DURATION / 2,
            easing: "ease-out",
            fill: "forwards"
        }
    );

    await secondHalf.finished;
}

/* =========================
   AFFICHAGE DES SCORES
========================= */

function updateScores() {
    if (playerHand.length > 0) {
        playerScoreElement.textContent =
            calculateScore(playerHand);
    } else {
        playerScoreElement.textContent = "0";
    }

    if (dealerHand.length === 0) {
        dealerScoreElement.textContent = "0";
        return;
    }

    if (dealerCardHidden) {
        dealerScoreElement.textContent =
            calculateScore([dealerHand[0]]);
    } else {
        dealerScoreElement.textContent =
            calculateScore(dealerHand);
    }
}

/* =========================
   AJOUT D'UNE CARTE
========================= */

function appendAnimatedCard(
    container,
    card,
    hidden = false
) {
    const cardElement =
        createCardElement(card, hidden);

    container.appendChild(cardElement);

    const direction =
        container === dealerCardsElement
            ? "left"
            : "right";

    animateCardArrival(
        cardElement,
        direction
    );

    updateScores();
}

/* =========================
   RAFRAÎCHISSEMENT DU JEU
========================= */

function renderGame() {
    dealerCardsElement.innerHTML = "";
    playerCardsElement.innerHTML = "";

    dealerHand.forEach((card, index) => {
        const hidden =
            dealerCardHidden &&
            index === 1;

        const cardElement =
            createCardElement(
                card,
                hidden
            );

        dealerCardsElement.appendChild(
            cardElement
        );
    });

    playerHand.forEach(card => {
        const cardElement =
            createCardElement(card);

        playerCardsElement.appendChild(
            cardElement
        );
    });

    updateScores();
}

/* =========================
   MESSAGES
========================= */

function setMessage(text) {
    messageElement.textContent = text;
}

/* =========================
   PIÈCES D'OR ET MISES
========================= */

function updateGoldDisplay() {
    goldElement.textContent = gold;
}

function updateBetButtons() {
    betButtons.forEach(button => {
        const value = Number(
            button.dataset.bet
        );

        button.classList.toggle(
            "active",
            value === selectedBet
        );

        button.disabled =
            !profileReady ||
            roundActive ||
            animationInProgress ||
            syncInProgress ||
            value > gold;
    });
}

function selectBet(event) {
    if (roundActive || animationInProgress) {
        return;
    }

    const newBet = Number(
        event.currentTarget.dataset.bet
    );

    if (newBet > gold) {
        setMessage(
            "Vous n'avez pas assez de pièces d'or."
        );

        return;
    }

    selectedBet = newBet;

    updateBetButtons();

    setMessage(
        `Mise choisie : ${selectedBet} pièces d'or.`
    );
}

async function placeBet() {
    if (!profileReady || !activeProfile) {
        setMessage(
            "Choisissez d’abord un profil dans la Vitrine enchantée."
        );
        return false;
    }

    if (selectedBet > gold) {
        setMessage(
            "Vous n'avez pas assez de pièces d'or."
        );
        return false;
    }

    currentBet = selectedBet;
    lockButtons();
    updateBetButtons();

    try {
        await registerMovement(
            -currentBet,
            `Blackjack : mise de ${currentBet} pièces`
        );

        return true;

    } catch (error) {
        currentBet = 0;
        setMessage(
            error.message || "La mise n’a pas pu être enregistrée."
        );
        setSyncStatus(
            "Mise non débitée.",
            "error"
        );
        dealButton.disabled = !profileReady;
        hitButton.disabled = true;
        standButton.disabled = true;
        newButton.disabled = true;
        updateBetButtons();
        return false;
    }
}

function getPayout(result) {
    if (result === "win") {
        return currentBet * 2;
    }

    if (result === "draw") {
        return currentBet;
    }

    if (result === "blackjack") {
        return currentBet + (currentBet * 1.5);
    }

    return 0;
}

async function finishPayment(result) {
    const payout = getPayout(result);
    const settledBet = currentBet;

    currentBet = 0;

    if (payout <= 0) {
        updateGoldDisplay();
        updateBetButtons();
        return true;
    }

    const labels = {
        win: "victoire",
        draw: "égalité",
        blackjack: "blackjack naturel"
    };

    try {
        await registerMovement(
            payout,
            `Blackjack : ${labels[result]} (+${payout} pièces)`
        );

        if (window.AtelierMemoCoins?.showWin) {
            await window.AtelierMemoCoins.showWin(settledBet);
        }

        return true;

    } catch (error) {
        setSyncStatus(
            `Gain de ${payout} pièces à vérifier : ` +
            (error.message || "erreur de connexion"),
            "error"
        );

        console.error(
            "Paiement Blackjack non synchronisé",
            { result, payout, settledBet, error }
        );

        return false;
    }
}

/* =========================
   GESTION DES BOUTONS
========================= */

function lockButtons() {
    dealButton.disabled = true;
    hitButton.disabled = true;
    standButton.disabled = true;
    newButton.disabled = true;
}

function enablePlayerButtons() {
    dealButton.disabled = true;
    hitButton.disabled = false;
    standButton.disabled = false;
    newButton.disabled = true;
}

function enableFinishedButtons() {
    dealButton.disabled = true;
    hitButton.disabled = true;
    standButton.disabled = true;
    newButton.disabled = false;
}

/* =========================
   CARTE CACHÉE DU CROUPIER
========================= */

async function revealDealerCard() {
    if (
        !dealerCardHidden ||
        dealerHand.length < 2
    ) {
        return;
    }

    const hiddenCardElement =
        dealerCardsElement.querySelector(
            '[data-hidden="true"]'
        );

    dealerCardHidden = false;

    await flipDealerCard(
        hiddenCardElement,
        dealerHand[1]
    );

    updateScores();

    await wait(120);
}

/* =========================
   DÉBUT D'UNE PARTIE
========================= */

async function startRound() {

    if (roundActive || animationInProgress) {
        return;
    }

    animationInProgress = true;
    lockButtons();

    /*
       L'animation démarre immédiatement pendant que Google Sheets
       enregistre la mise. Elle masque ainsi naturellement le délai réseau.
    */
    const coinAnimation =
        window.AtelierMemoCoins || null;

    const coinArrival =
        coinAnimation
            ? coinAnimation.showBet(selectedBet)
            : Promise.resolve();

    const betAccepted =
        await placeBet();

    await coinArrival;

    if (!betAccepted) {
        if (coinAnimation) {
            await coinAnimation.rejectBet();
        }

        animationInProgress = false;
        return;
    }

    if (coinAnimation) {
        await coinAnimation.acceptBet();
    }

    deck = shuffleDeck(createDeck());

    playerHand = [];
    dealerHand = [];

    roundActive = true;
    dealerCardHidden = true;

    dealerCardsElement.innerHTML = "";
    playerCardsElement.innerHTML = "";

    updateScores();

    setMessage("Distribution des cartes...");

    // Première carte joueur

    const playerFirst = drawCard();

    playerHand.push(playerFirst);

    appendAnimatedCard(
        playerCardsElement,
        playerFirst
    );

    await wait(DEAL_DELAY);

    // Première carte croupier

    const dealerFirst = drawCard();

    dealerHand.push(dealerFirst);

    appendAnimatedCard(
        dealerCardsElement,
        dealerFirst
    );

    await wait(DEAL_DELAY);

    // Deuxième carte joueur

    const playerSecond = drawCard();

    playerHand.push(playerSecond);

    appendAnimatedCard(
        playerCardsElement,
        playerSecond
    );

    await wait(DEAL_DELAY);

    // Deuxième carte croupier (cachée)

    const dealerSecond = drawCard();

    dealerHand.push(dealerSecond);

    appendAnimatedCard(
        dealerCardsElement,
        dealerSecond,
        true
    );

    await wait(DEAL_DELAY);

    animationInProgress = false;

    if (
        isBlackjack(playerHand) ||
        isBlackjack(dealerHand)
    ) {

        await resolveInitialBlackjack();

        return;
    }

    enablePlayerButtons();

    setMessage("À vous de jouer.");
}

/* =========================
   BLACKJACK NATUREL
========================= */

async function resolveInitialBlackjack() {

    animationInProgress = true;

    lockButtons();

    await revealDealerCard();

    const playerBJ =
        isBlackjack(playerHand);

    const dealerBJ =
        isBlackjack(dealerHand);

    animationInProgress = false;

    if (playerBJ && dealerBJ) {

      finishRound(
    "Égalité : deux blackjacks.",
    "draw"
);

        return;
    }

    if (playerBJ) {

       finishRound(
    `Blackjack ! Gain : ${currentBet * 1.5} pièces d'or.`,
    "blackjack"
);
        return;
    }

    finishRound(
    "Le croupier a un blackjack.",
    "loss"
);
}

/* =========================
   TIRER
========================= */

async function hit() {

    if (
        !roundActive ||
        animationInProgress
    ) {
        return;
    }

    animationInProgress = true;

    lockButtons();

    const card = drawCard();

    playerHand.push(card);

    appendAnimatedCard(
        playerCardsElement,
        card
    );

    await wait(DEAL_DELAY);

    const score =
        calculateScore(playerHand);

    if (score > 21) {

        await revealDealerCard();

        animationInProgress = false;

        finishRound(
    "Vous dépassez 21.",
    "loss"
);

        return;
    }

    if (score === 21) {

        animationInProgress = false;

        await stand();

        return;
    }

    animationInProgress = false;

    enablePlayerButtons();

    setMessage(
        "Tirer ou rester ?"
    );
}

/* =========================
   RESTER
========================= */

async function stand() {

    if (
        !roundActive ||
        animationInProgress
    ) {
        return;
    }

    animationInProgress = true;

    lockButtons();

    setMessage(
        "Le croupier joue..."
    );

    await revealDealerCard();

    while (
        calculateScore(dealerHand) < 17
    ) {

        const card = drawCard();

        dealerHand.push(card);

        appendAnimatedCard(
            dealerCardsElement,
            card
        );

        await wait(DEAL_DELAY);
    }

    animationInProgress = false;

    determineWinner();
}

/* =========================
   DÉTERMINATION DU GAGNANT
========================= */

function determineWinner() {

    const playerScore =
        calculateScore(playerHand);

    const dealerScore =
        calculateScore(dealerHand);

    if (dealerScore > 21) {

       finishRound(
    "Le croupier dépasse 21. Vous gagnez !",
    "win"
);

        return;
    }

    if (playerScore > dealerScore) {

        finishRound(
    "Votre main est la meilleure. Vous gagnez !",
    "win"
);

        return;
    }

    if (playerScore < dealerScore) {

       finishRound(
    "Le croupier gagne cette partie.",
    "loss"
);

        return;
    }

    finishRound(
    "Égalité ! Votre mise vous est rendue.",
    "draw"
);
}

/* =========================
   FIN DE PARTIE
========================= */

async function finishRound(message, result) {
    roundActive = false;
    dealerCardHidden = false;
    animationInProgress = true;

    lockButtons();
    updateScores();
    setMessage(message);

    await finishPayment(result);

    animationInProgress = false;
    enableFinishedButtons();
    updateBetButtons();
}

/* =========================
   NOUVELLE PARTIE
========================= */

function resetTable() {

    if (animationInProgress) {
        return;
    }

    if (window.AtelierMemoCoins) {
        window.AtelierMemoCoins.reset();
    }

    roundActive = false;

    dealerCardHidden = true;

    deck = [];

    playerHand = [];

    dealerHand = [];

    renderGame();

    dealButton.disabled = !profileReady;

    hitButton.disabled = true;

    standButton.disabled = true;

    newButton.disabled = true;
updateGoldDisplay();
updateBetButtons();
    setMessage(
        "Cliquez sur « Distribuer »."
    );
}

/* =========================
   ÉVÉNEMENTS
========================= */

dealButton.addEventListener(
    "click",
    startRound
);

hitButton.addEventListener(
    "click",
    hit
);

standButton.addEventListener(
    "click",
    stand
);

newButton.addEventListener(
    "click",
    resetTable
);

/* =========================
   INITIALISATION
========================= */
betButtons.forEach(button => {
    button.addEventListener(
        "click",
        selectBet
    );
});
loadActiveProfile();
