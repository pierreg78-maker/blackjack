/* ==========================================================
   BLACKJACK - ATELIER MÉMO
   ÉTAPE 1 : moteur du jeu
   ========================================================== */

"use strict";

/* ==========================================================
   ÉLÉMENTS HTML
   ========================================================== */

const dealerCardsElement = document.getElementById("dealerCards");
const playerCardsElement = document.getElementById("playerCards");

const dealerScoreElement = document.getElementById("dealerScore");
const playerScoreElement = document.getElementById("playerScore");

const messageElement = document.getElementById("message");

const dealButton = document.getElementById("dealBtn");
const hitButton = document.getElementById("hitBtn");
const standButton = document.getElementById("standBtn");
const newButton = document.getElementById("newBtn");

/* ==========================================================
   ÉTAT DU JEU
   ========================================================== */

let deck = [];
let playerHand = [];
let dealerHand = [];

let roundActive = false;
let dealerCardHidden = true;

/* ==========================================================
   CRÉATION DU PAQUET
   ========================================================== */

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

    const newDeck = [];

    for (const suit of suits) {
        for (const rank of ranks) {
            newDeck.push({
                suit: suit,
                label: rank.label,
                value: rank.value
            });
        }
    }

    return newDeck;
}

/* ==========================================================
   MÉLANGE DES CARTES
   ========================================================== */

function shuffleDeck(cards) {
    for (let index = cards.length - 1; index > 0; index--) {
        const randomIndex = Math.floor(
            Math.random() * (index + 1)
        );

        const temporaryCard = cards[index];
        cards[index] = cards[randomIndex];
        cards[randomIndex] = temporaryCard;
    }

    return cards;
}

/* ==========================================================
   TIRAGE D’UNE CARTE
   ========================================================== */

function drawCard() {
    if (deck.length === 0) {
        deck = shuffleDeck(createDeck());
    }

    return deck.pop();
}

/* ==========================================================
   CALCUL DU TOTAL D’UNE MAIN
   ========================================================== */

function calculateScore(hand) {
    let score = 0;
    let aceCount = 0;

    for (const card of hand) {
        score += card.value;

        if (card.label === "A") {
            aceCount++;
        }
    }

    /*
     * Chaque as vaut d’abord 11.
     * Si le total dépasse 21, un as passe automatiquement à 1.
     */

    while (score > 21 && aceCount > 0) {
        score -= 10;
        aceCount--;
    }

    return score;
}

/* ==========================================================
   DÉTECTION DU BLACKJACK NATUREL
   ========================================================== */

function isBlackjack(hand) {
    return hand.length === 2 && calculateScore(hand) === 21;
}

/* ==========================================================
   CRÉATION VISUELLE D’UNE CARTE
   ========================================================== */

function createCardElement(card, hidden = false) {
    const cardElement = document.createElement("div");
    cardElement.className = "card";

    if (hidden) {
        cardElement.textContent = "🂠";
        return cardElement;
    }

    if (card.suit === "♥" || card.suit === "♦") {
        cardElement.classList.add("red");
    }

    cardElement.textContent = `${card.label}${card.suit}`;

    return cardElement;
}

/* ==========================================================
   AFFICHAGE DE LA TABLE
   ========================================================== */

function renderGame() {
    dealerCardsElement.innerHTML = "";
    playerCardsElement.innerHTML = "";

    dealerHand.forEach(function (card, index) {
        const hidden =
            dealerCardHidden &&
            index === 1;

        const cardElement =
            createCardElement(card, hidden);

        dealerCardsElement.appendChild(cardElement);
    });

    playerHand.forEach(function (card) {
        const cardElement =
            createCardElement(card);

        playerCardsElement.appendChild(cardElement);
    });

    if (playerHand.length === 0) {
        playerScoreElement.textContent = "0";
    } else {
        playerScoreElement.textContent =
            calculateScore(playerHand);
    }

    if (dealerHand.length === 0) {
        dealerScoreElement.textContent = "0";
    } else if (dealerCardHidden) {
        dealerScoreElement.textContent =
            calculateScore([dealerHand[0]]);
    } else {
        dealerScoreElement.textContent =
            calculateScore(dealerHand);
    }
}

/* ==========================================================
   MESSAGE
   ========================================================== */

function setMessage(text) {
    messageElement.textContent = text;
}

/* ==========================================================
   GESTION DES BOUTONS
   ========================================================== */

function enablePlayerButtons() {
    dealButton.disabled = true;
    hitButton.disabled = false;
    standButton.disabled = false;
    newButton.disabled = true;
}

function disablePlayerButtons() {
    dealButton.disabled = false;
    hitButton.disabled = true;
    standButton.disabled = true;
    newButton.disabled = false;
}

/* ==========================================================
   DÉBUT D’UNE PARTIE
   ========================================================== */

function startRound() {
    if (roundActive) {
        return;
    }

    deck = shuffleDeck(createDeck());

    playerHand = [
        drawCard(),
        drawCard()
    ];

    dealerHand = [
        drawCard(),
        drawCard()
    ];

    roundActive = true;
    dealerCardHidden = true;

    renderGame();
    enablePlayerButtons();

    const playerHasBlackjack = isBlackjack(playerHand);
    const dealerHasBlackjack = isBlackjack(dealerHand);

    if (playerHasBlackjack || dealerHasBlackjack) {
        resolveInitialBlackjack();
        return;
    }

    setMessage("À vous de jouer : tirer ou rester ?");
}

/* ==========================================================
   BLACKJACK À LA DISTRIBUTION
   ========================================================== */

function resolveInitialBlackjack() {
    dealerCardHidden = false;
    renderGame();

    const playerHasBlackjack = isBlackjack(playerHand);
    const dealerHasBlackjack = isBlackjack(dealerHand);

    if (playerHasBlackjack && dealerHasBlackjack) {
        finishRound("Égalité : vous avez tous les deux un blackjack !");
        return;
    }

    if (playerHasBlackjack) {
        finishRound("Blackjack ! Vous gagnez !");
        return;
    }

    finishRound("Le croupier a un blackjack.");
}

/* ==========================================================
   ACTION : TIRER
   ========================================================== */

function hit() {
    if (!roundActive) {
        return;
    }

    playerHand.push(drawCard());

    renderGame();

    const playerScore = calculateScore(playerHand);

    if (playerScore > 21) {
        dealerCardHidden = false;
        renderGame();

        finishRound(
            "Vous dépassez 21. Le croupier gagne."
        );

        return;
    }

    if (playerScore === 21) {
        stand();
        return;
    }

    setMessage("Vous pouvez encore tirer ou rester.");
}

/* ==========================================================
   ACTION : RESTER
   ========================================================== */

function stand() {
    if (!roundActive) {
        return;
    }

    dealerCardHidden = false;

    /*
     * Le croupier tire jusqu’à atteindre au moins 17.
     */

    while (calculateScore(dealerHand) < 17) {
        dealerHand.push(drawCard());
    }

    renderGame();

    determineWinner();
}

/* ==========================================================
   DÉTERMINATION DU GAGNANT
   ========================================================== */

function determineWinner() {
    const playerScore = calculateScore(playerHand);
    const dealerScore = calculateScore(dealerHand);

    if (dealerScore > 21) {
        finishRound(
            "Le croupier dépasse 21. Vous gagnez !"
        );
        return;
    }

    if (playerScore > dealerScore) {
        finishRound(
            "Votre main est la meilleure. Vous gagnez !"
        );
        return;
    }

    if (playerScore < dealerScore) {
        finishRound(
            "Le croupier gagne cette partie."
        );
        return;
    }

    finishRound("Égalité !");
}

/* ==========================================================
   FIN DE PARTIE
   ========================================================== */

function finishRound(message) {
    roundActive = false;
    dealerCardHidden = false;

    renderGame();
    disablePlayerButtons();
    setMessage(message);
}

/* ==========================================================
   NOUVELLE PARTIE
   ========================================================== */

function resetTable() {
    roundActive = false;
    dealerCardHidden = true;

    deck = [];
    playerHand = [];
    dealerHand = [];

    renderGame();
    disablePlayerButtons();

    setMessage("Cliquez sur « Distribuer ».");
}

/* ==========================================================
   ÉVÉNEMENTS
   ========================================================== */

dealButton.addEventListener("click", startRound);
hitButton.addEventListener("click", hit);
standButton.addEventListener("click", stand);
newButton.addEventListener("click", resetTable);

/* ==========================================================
   INITIALISATION
   ========================================================== */

resetTable();
