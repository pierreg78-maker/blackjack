/* ==========================================================
   BLACKJACK - ATELIER MÉMO
   VERSION 1.1
   Distribution animée
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
   ANIMATION
========================================================== */

const DEAL_DELAY = 250;
const CARD_ANIMATION_DURATION = 280;

let animationInProgress = false;

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/* ==========================================================
   ÉTAT DU JEU
========================================================== */

let deck = [];
let playerHand = [];
let dealerHand = [];

let roundActive = false;
let dealerCardHidden = true;

/* ==========================================================
   PAQUET
========================================================== */

function createDeck() {

    const suits = ["♠","♥","♦","♣"];

    const ranks = [
        {label:"A",value:11},
        {label:"2",value:2},
        {label:"3",value:3},
        {label:"4",value:4},
        {label:"5",value:5},
        {label:"6",value:6},
        {label:"7",value:7},
        {label:"8",value:8},
        {label:"9",value:9},
        {label:"10",value:10},
        {label:"J",value:10},
        {label:"Q",value:10},
        {label:"K",value:10}
    ];

    const cards=[];

    suits.forEach(suit=>{
        ranks.forEach(rank=>{
            cards.push({
                suit:suit,
                label:rank.label,
                value:rank.value
            });
        });
    });

    return cards;

}

function shuffleDeck(cards){

    for(let i=cards.length-1;i>0;i--){

        const j=Math.floor(Math.random()*(i+1));

        [cards[i],cards[j]]=[cards[j],cards[i]];

    }

    return cards;

}

function drawCard(){

    if(deck.length===0){

        deck=shuffleDeck(createDeck());

    }

    return deck.pop();

}

/* ==========================================================
   SCORE
========================================================== */

function calculateScore(hand){

    let score=0;
    let aces=0;

    hand.forEach(card=>{

        score+=card.value;

        if(card.label==="A") aces++;

    });

    while(score>21 && aces>0){

        score-=10;
        aces--;

    }

    return score;

}

function isBlackjack(hand){

    return hand.length===2 && calculateScore(hand)===21;

}

/* ==========================================================
   CARTES
========================================================== */

function createCardElement(card,hidden=false){

    const div=document.createElement("div");

    div.className="card";

    if(hidden){

        div.classList.add("card-hidden");
        div.dataset.hidden="true";
        div.textContent="🂠";

        return div;

    }

    div.dataset.hidden="false";

    if(card.suit==="♥" || card.suit==="♦"){

        div.classList.add("red");

    }

    div.textContent=`${card.label}${card.suit}`;

    return div;

}

function animateCardArrival(card){

    if(!card.animate) return;

    card.animate(
        [
            {
                opacity:0,
                transform:"translateY(-30px) scale(.85)"
            },
            {
                opacity:1,
                transform:"translateY(0) scale(1)"
            }
        ],
        {
            duration:CARD_ANIMATION_DURATION,
            easing:"ease-out"
        }
    );

}

function updateScores(){

    playerScoreElement.textContent=
        playerHand.length
            ?calculateScore(playerHand)
            :"0";

    if(dealerHand.length===0){

        dealerScoreElement.textContent="0";
        return;

    }

    if(dealerCardHidden){

        dealerScoreElement.textContent=
            calculateScore([dealerHand[0]]);

    }else{

        dealerScoreElement.textContent=
            calculateScore(dealerHand);

    }

}

function appendAnimatedCard(container,card,hidden=false){

    const element=createCardElement(card,hidden);

    container.appendChild(element);

    animateCardArrival(element);

    updateScores();

}

function renderGame(){

    dealerCardsElement.innerHTML="";
    playerCardsElement.innerHTML="";

    dealerHand.forEach((card,index)=>{

        dealerCardsElement.appendChild(
            createCardElement(
                card,
                dealerCardHidden && index===1
            )
        );

    });

    playerHand.forEach(card=>{

        playerCardsElement.appendChild(
            createCardElement(card)
        );

    });

    updateScores();

}

/* ==========================================================
   MESSAGES
========================================================== */

function setMessage(text){

    messageElement.textContent=text;

}

/* ==========================================================
   BOUTONS
========================================================== */

function lockButtons(){

    dealButton.disabled=true;
    hitButton.disabled=true;
    standButton.disabled=true;
    newButton.disabled=true;

}

function enablePlayerButtons(){

    dealButton.disabled=true;
    hitButton.disabled=false;
    standButton.disabled=false;
    newButton.disabled=true;

}

function enableFinishedButtons(){

    hitButton.disabled=true;
    standButton.disabled=true;
    dealButton.disabled=true;
    newButton.disabled=false;

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
