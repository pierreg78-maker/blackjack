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

const betButtons = document.querySelectorAll(
    ".betButton"
);

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
let gold = 100;
let selectedBet = 10;
let currentBet = 0;

/* =========================
   OUTILS
========================= */

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
            roundActive ||
            animationInProgress ||
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

function placeBet() {
    if (selectedBet > gold) {
        setMessage(
            "Vous n'avez pas assez de pièces d'or."
        );

        return false;
    }

    currentBet = selectedBet;
    gold -= currentBet;

    updateGoldDisplay();
    updateBetButtons();

    return true;
}

function payWin() {
    gold += currentBet * 2;
}

function payDraw() {
    gold += currentBet;
}

function payBlackjack() {
    gold += currentBet +
        (currentBet * 1.5);
}

function finishPayment(result) {
    if (result === "win") {
        payWin();
    }

    if (result === "draw") {
        payDraw();
    }

    if (result === "blackjack") {
        payBlackjack();
    }

    currentBet = 0;

    updateGoldDisplay();
    updateBetButtons();
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
if (!placeBet()) {
    return;
}
    animationInProgress = true;

    lockButtons();

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

function finishRound(message, result) {
    roundActive = false;
    dealerCardHidden = false;
    animationInProgress = false;

    finishPayment(result);

    updateScores();
    enableFinishedButtons();
    setMessage(message);
}

/* =========================
   NOUVELLE PARTIE
========================= */

function resetTable() {

    if (animationInProgress) {
        return;
    }

    roundActive = false;

    dealerCardHidden = true;

    deck = [];

    playerHand = [];

    dealerHand = [];

    renderGame();

    dealButton.disabled = false;

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
resetTable();
