```javascript
/* ==========================================================
   BLACKJACK - ATELIER MÉMO
   Partie 3 : moteur du jeu + pièces d'or
   Fichier : script.js
   ========================================================== */

"use strict";

/* ==========================================================
   CONFIGURATION
   ========================================================== */

const API_URL =
    "https://script.google.com/macros/s/AKfycbyh1LbQNETMy0GS7A5SzACTPMYlFEal9W3-XZozkwzIkAAUhlo_InN-5FOrI9eEqPoEeA/exec";

const CLE_PROFIL_ACTIF = "vitrineProfilActif";
const MISE_PAR_DEFAUT = 10;
const MINIMUM_CROUPIER = 17;

/* ==========================================================
   ÉLÉMENTS HTML
   ========================================================== */

const goldElement = document.getElementById("gold");
const betElement = document.getElementById("bet");

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
let dealerHand = [];
let playerHand = [];

let activeProfile = null;
let goldBalance = 0;
let currentBet = MISE_PAR_DEFAUT;

let roundActive = false;
let dealerCardHidden = true;
let transactionInProgress = false;

/* ==========================================================
   OUTILS GÉNÉRAUX
   ========================================================== */

function setMessage(text) {
    messageElement.textContent = text;
}

function generateTransactionId(type) {
    const randomPart = Math.random().toString(36).slice(2, 10);

    return [
        "blackjack",
        type,
        Date.now(),
        randomPart
    ].join("-");
}

function getProfileId(profile) {
    if (!profile) {
        return "";
    }

    return (
        profile.id ||
        profile.identifiant ||
        profile.profileId ||
        profile.profilId ||
        ""
    );
}

function getProfileName(profile) {
    if (!profile) {
        return "";
    }

    return (
        profile.prenom ||
        profile.nom ||
        profile.name ||
        "Joueur"
    );
}

function extractBalance(data) {
    const possibleValues = [
        data?.solde,
        data?.nouveauSolde,
        data?.profil?.solde,
        data?.profile?.solde,
        data?.pieces,
        data?.gold
    ];

    for (const value of possibleValues) {
        const numericValue = Number(value);

        if (Number.isFinite(numericValue)) {
            return numericValue;
        }
    }

    return null;
}

function updateBalanceDisplay() {
    goldElement.textContent = goldBalance;
    betElement.textContent = currentBet;
}

/* ==========================================================
   PROFIL ACTIF
   ========================================================== */

function loadLocalProfile() {
    const savedProfile = localStorage.getItem(CLE_PROFIL_ACTIF);

    if (!savedProfile) {
        activeProfile = null;
        return false;
    }

    try {
        activeProfile = JSON.parse(savedProfile);
    } catch (error) {
        console.error("Profil local illisible :", error);
        activeProfile = null;
        return false;
    }

    const localBalance = Number(
        activeProfile.solde ??
        activeProfile.pieces ??
        activeProfile.gold
    );

    if (Number.isFinite(localBalance)) {
        goldBalance = localBalance;
    }

    return Boolean(getProfileId(activeProfile));
}

function saveLocalProfile() {
    if (!activeProfile) {
        return;
    }

    activeProfile.solde = goldBalance;

    localStorage.setItem(
        CLE_PROFIL_ACTIF,
        JSON.stringify(activeProfile)
    );
}

async function synchronizeProfile() {
    if (!activeProfile) {
        return false;
    }

    const profileId = getProfileId(activeProfile);

    if (!profileId) {
        return false;
    }

    try {
        /*
         * Le doGet actuel renvoie normalement la liste des profils.
         * On recherche ensuite le profil actif dans cette liste.
         */

        const response = await fetch(
            `${API_URL}?action=listerProfils&t=${Date.now()}`,
            {
                method: "GET",
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error(`Erreur HTTP ${response.status}`);
        }

        const data = await response.json();

        const profiles =
            data.profils ||
            data.profiles ||
            data.resultats ||
            [];

        if (Array.isArray(profiles)) {
            const serverProfile = profiles.find((profile) => {
                return String(getProfileId(profile)) === String(profileId);
            });

            if (serverProfile) {
                activeProfile = {
                    ...activeProfile,
                    ...serverProfile
                };

                const serverBalance = extractBalance(serverProfile);

                if (serverBalance !== null) {
                    goldBalance = serverBalance;
                }

                saveLocalProfile();
                updateBalanceDisplay();

                return true;
            }
        }

        /*
         * Certains serveurs renvoient directement le profil demandé.
         */

        const directBalance = extractBalance(data);

        if (directBalance !== null) {
            goldBalance = directBalance;
            saveLocalProfile();
            updateBalanceDisplay();
            return true;
        }

        return false;
    } catch (error) {
        console.warn(
            "Synchronisation impossible, utilisation du solde local :",
            error
        );

        updateBalanceDisplay();
        return false;
    }
}

/* ==========================================================
   COMMUNICATION AVEC GOOGLE APPS SCRIPT
   ========================================================== */

async function sendTransaction(action, amount, reason, transactionId) {
    if (!activeProfile) {
        throw new Error("Aucun profil actif.");
    }

    const profileId = getProfileId(activeProfile);

    if (!profileId) {
        throw new Error("Le profil actif ne possède pas d'identifiant.");
    }

    const payload = {
        action,
        profilId: profileId,
        idProfil: profileId,
        identifiant: profileId,
        prenom: getProfileName(activeProfile),
        montant: amount,
        quantite: amount,
        motif: reason,
        source: "blackjack",
        jeu: "blackjack",
        transactionId
    };

    const response = await fetch(API_URL, {
        method: "POST",

        /*
         * text/plain évite généralement la requête OPTIONS
         * problématique avec certaines applications Apps Script.
         */
        headers: {
            "Content-Type": "text/plain;charset=utf-8"
        },

        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.ok === false || data.success === false) {
        throw new Error(
            data.message ||
            data.erreur ||
            data.error ||
            "La transaction a été refusée."
        );
    }

    return data;
}

async function debitBet() {
    const transactionId = generateTransactionId("mise");

    const data = await sendTransaction(
        "depense",
        currentBet,
        "Mise au blackjack",
        transactionId
    );

    const serverBalance = extractBalance(data);

    if (serverBalance !== null) {
        goldBalance = serverBalance;
    } else {
        goldBalance -= currentBet;
    }

    saveLocalProfile();
    updateBalanceDisplay();
}

async function creditWinnings(amount, reason) {
    if (amount <= 0) {
        return;
    }

    const transactionId = generateTransactionId("gain");

    const data = await sendTransaction(
        "gain",
        amount,
        reason,
        transactionId
    );

    const serverBalance = extractBalance(data);

    if (serverBalance !== null) {
        goldBalance = serverBalance;
    } else {
        goldBalance += amount;
    }

    saveLocalProfile();
    updateBalanceDisplay();
}

/* ==========================================================
   CRÉATION DU PAQUET
   ========================================================== */

function createDeck() {
    const suits = ["♠", "♥", "♦", "♣"];

    const cards = [
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
        for (const card of cards) {
            newDeck.push({
                suit,
                label: card.label,
                value: card.value
            });
        }
    }

    return newDeck;
}

function shuffleDeck(cards) {
    for (let index = cards.length - 1; index > 0; index--) {
        const randomIndex = Math.floor(
            Math.random() * (index + 1)
        );

        [cards[index], cards[randomIndex]] =
            [cards[randomIndex], cards[index]];
    }

    return cards;
}

function drawCard() {
    if (deck.length === 0) {
        deck = shuffleDeck(createDeck());
    }

    return deck.pop();
}

/* ==========================================================
   CALCUL DES SCORES
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
     * Un as vaut 11, sauf si cela fait dépasser 21.
     * Dans ce cas, il vaut automatiquement 1.
     */

    while (score > 21 && aceCount > 0) {
        score -= 10;
        aceCount--;
    }

    return score;
}

function isBlackjack(hand) {
    return (
        hand.length === 2 &&
        calculateScore(hand) === 21
    );
}

/* ==========================================================
   AFFICHAGE DES CARTES
   ========================================================== */

function createCardElement(card, hidden = false) {
    const cardElement = document.createElement("div");
    cardElement.className = "card";

    if (hidden) {
        cardElement.textContent = "🂠";
        cardElement.setAttribute(
            "aria-label",
            "Carte cachée du croupier"
        );

        return cardElement;
    }

    const isRedSuit =
        card.suit === "♥" ||
        card.suit === "♦";

    if (isRedSuit) {
        cardElement.classList.add("red");
    }

    cardElement.textContent = `${card.label}${card.suit}`;

    cardElement.setAttribute(
        "aria-label",
        `${card.label} de ${card.suit}`
    );

    return cardElement;
}

function renderGame() {
    dealerCardsElement.innerHTML = "";
    playerCardsElement.innerHTML = "";

    dealerHand.forEach((card, index) => {
        const hidden =
            dealerCardHidden &&
            index === 1;

        dealerCardsElement.appendChild(
            createCardElement(card, hidden)
        );
    });

    playerHand.forEach((card) => {
        playerCardsElement.appendChild(
            createCardElement(card)
        );
    });

    const playerScore = calculateScore(playerHand);

    playerScoreElement.textContent =
        playerHand.length > 0 ? playerScore : "0";

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
   BOUTONS
   ========================================================== */

function setButtonsDuringRound() {
    dealButton.disabled = true;
    hitButton.disabled = false;
    standButton.disabled = false;
    newButton.disabled = true;
}

function setButtonsAfterRound() {
    dealButton.disabled = false;
    hitButton.disabled = true;
    standButton.disabled = true;
    newButton.disabled = false;
}

function disableAllButtons() {
    dealButton.disabled = true;
    hitButton.disabled = true;
    standButton.disabled = true;
    newButton.disabled = true;
}

/* ==========================================================
   DÉMARRAGE D'UNE MANCHE
   ========================================================== */

async function startRound() {
    if (transactionInProgress || roundActive) {
        return;
    }

    if (!activeProfile) {
        setMessage(
            "Aucun profil actif. Sélectionnez d'abord un joueur dans la vitrine."
        );
        return;
    }

    if (goldBalance < currentBet) {
        setMessage(
            `Il faut ${currentBet} pièces d'or pour jouer.`
        );
        return;
    }

    transactionInProgress = true;
    disableAllButtons();
    setMessage("Enregistrement de la mise…");

    try {
        await debitBet();
    } catch (error) {
        console.error("Erreur pendant la mise :", error);

        setMessage(
            `Impossible d'enregistrer la mise : ${error.message}`
        );

        transactionInProgress = false;
        setButtonsAfterRound();
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
    transactionInProgress = false;

    renderGame();
    setButtonsDuringRound();

    const playerHasBlackjack = isBlackjack(playerHand);
    const dealerHasBlackjack = isBlackjack(dealerHand);

    if (playerHasBlackjack || dealerHasBlackjack) {
        await resolveInitialBlackjack();
        return;
    }

    setMessage("À vous de jouer : tirer ou rester ?");
}

/* ==========================================================
   BLACKJACK À LA DISTRIBUTION
   ========================================================== */

async function resolveInitialBlackjack() {
    dealerCardHidden = false;
    renderGame();

    const playerHasBlackjack = isBlackjack(playerHand);
    const dealerHasBlackjack = isBlackjack(dealerHand);

    if (playerHasBlackjack && dealerHasBlackjack) {
        await finishRound(
            "push",
            "Égalité : deux blackjacks !"
        );

        return;
    }

    if (playerHasBlackjack) {
        await finishRound(
            "blackjack",
            "Blackjack ! Vous gagnez."
        );

        return;
    }

    await finishRound(
        "loss",
        "Le croupier a un blackjack."
    );
}

/* ==========================================================
   ACTION : TIRER
   ========================================================== */

function hit() {
    if (!roundActive || transactionInProgress) {
        return;
    }

    playerHand.push(drawCard());
    renderGame();

    const playerScore = calculateScore(playerHand);

    if (playerScore > 21) {
        finishRound(
            "loss",
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

async function stand() {
    if (!roundActive || transactionInProgress) {
        return;
    }

    transactionInProgress = true;
    disableAllButtons();

    dealerCardHidden = false;
    renderGame();

    setMessage("Le croupier joue…");

    while (
        calculateScore(dealerHand) < MINIMUM_CROUPIER
    ) {
        dealerHand.push(drawCard());
    }

    renderGame();

    const playerScore = calculateScore(playerHand);
    const dealerScore = calculateScore(dealerHand);

    if (dealerScore > 21) {
        await finishRound(
            "win",
            "Le croupier dépasse 21. Vous gagnez !"
        );

        return;
    }

    if (playerScore > dealerScore) {
        await finishRound(
            "win",
            "Votre main est la meilleure. Vous gagnez !"
        );

        return;
    }

    if (playerScore < dealerScore) {
        await finishRound(
            "loss",
            "Le croupier gagne cette manche."
        );

        return;
    }

    await finishRound(
        "push",
        "Égalité : votre mise est rendue."
    );
}

/* ==========================================================
   FIN DE MANCHE ET PAIEMENTS
   ========================================================== */

async function finishRound(result, message) {
    if (!roundActive && result !== "loss") {
        return;
    }

    roundActive = false;
    transactionInProgress = true;
    dealerCardHidden = false;

    disableAllButtons();
    renderGame();

    let payout = 0;
    let payoutReason = "";

    switch (result) {
        case "blackjack":
            /*
             * La mise a déjà été débitée.
             * Paiement total : mise + bénéfice de 1,5 fois la mise.
             *
             * Pour une mise de 10 :
             * 10 rendues + 15 gagnées = 25 créditées.
             */
            payout = Math.floor(currentBet * 2.5);
            payoutReason = "Blackjack naturel";
            break;

        case "win":
            /*
             * Mise rendue + gain égal à la mise.
             * Pour une mise de 10 : 20 pièces créditées.
             */
            payout = currentBet * 2;
            payoutReason = "Victoire au blackjack";
            break;

        case "push":
            /*
             * Égalité : remboursement simple de la mise.
             */
            payout = currentBet;
            payoutReason = "Remboursement après égalité";
            break;

        case "loss":
        default:
            payout = 0;
            break;
    }

    if (payout > 0) {
        setMessage(`${message} Enregistrement des pièces…`);

        try {
            await creditWinnings(
                payout,
                payoutReason
            );

            setMessage(
                `${message} ${payout} pièces d'or créditées.`
            );
        } catch (error) {
            console.error(
                "Erreur pendant le versement :",
                error
            );

            setMessage(
                `${message} Le versement n'a pas pu être enregistré : ${error.message}`
            );
        }
    } else {
        setMessage(message);
    }

    transactionInProgress = false;
    setButtonsAfterRound();
}

/* ==========================================================
   RÉINITIALISATION VISUELLE
   ========================================================== */

function resetTable() {
    if (transactionInProgress) {
        return;
    }

    /*
     * Ce bouton ne prélève aucune nouvelle mise.
     * Il vide simplement la table.
     */

    roundActive = false;
    dealerCardHidden = true;

    deck = [];
    dealerHand = [];
    playerHand = [];

    renderGame();
    setButtonsAfterRound();

    if (activeProfile) {
        setMessage(
            `${getProfileName(activeProfile)}, cliquez sur « Distribuer ».`
        );
    } else {
        setMessage(
            "Sélectionnez d'abord un profil dans la vitrine."
        );
    }
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

async function initializeGame() {
    currentBet = MISE_PAR_DEFAUT;
    betElement.textContent = currentBet;

    const profileFound = loadLocalProfile();

    resetTable();
    updateBalanceDisplay();

    if (!profileFound) {
        goldBalance = 0;
        updateBalanceDisplay();

        setMessage(
            "Aucun profil actif. Ouvrez d'abord la vitrine et choisissez un joueur."
        );

        dealButton.disabled = true;
        return;
    }

    setMessage(
        `Bienvenue ${getProfileName(activeProfile)}. Synchronisation du solde…`
    );

    await synchronizeProfile();

    setMessage(
        `${getProfileName(activeProfile)}, cliquez sur « Distribuer ».`
    );

    dealButton.disabled = goldBalance < currentBet;

    if (goldBalance < currentBet) {
        setMessage(
            `Votre solde est de ${goldBalance} pièces. Il en faut ${currentBet} pour jouer.`
        );
    }
}

initializeGame();
```

