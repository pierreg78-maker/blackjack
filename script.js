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
   RÉVÉLATION DE LA CARTE CACHÉE
========================================================== */

async function revealDealerCard(){

    if(!dealerCardHidden) return;

    dealerCardHidden=false;

    renderGame();

    await wait(DEAL_DELAY);

}

/* ==========================================================
   DÉBUT D'UNE PARTIE
========================================================== */

async function startRound(){

    if(roundActive || animationInProgress) return;

    animationInProgress=true;

    lockButtons();

    deck=shuffleDeck(createDeck());

    playerHand=[];
    dealerHand=[];

    roundActive=true;
    dealerCardHidden=true;

    dealerCardsElement.innerHTML="";
    playerCardsElement.innerHTML="";

    updateScores();

    setMessage("Distribution des cartes...");

    // joueur
    const p1=drawCard();
    playerHand.push(p1);
    appendAnimatedCard(playerCardsElement,p1);

    await wait(DEAL_DELAY);

    // croupier
    const d1=drawCard();
    dealerHand.push(d1);
    appendAnimatedCard(dealerCardsElement,d1);

    await wait(DEAL_DELAY);

    // joueur
    const p2=drawCard();
    playerHand.push(p2);
    appendAnimatedCard(playerCardsElement,p2);

    await wait(DEAL_DELAY);

    // carte cachée
    const d2=drawCard();
    dealerHand.push(d2);
    appendAnimatedCard(dealerCardsElement,d2,true);

    await wait(DEAL_DELAY);

    animationInProgress=false;

    if(isBlackjack(playerHand) || isBlackjack(dealerHand)){

        await resolveInitialBlackjack();
        return;

    }

    enablePlayerButtons();

    setMessage("À vous de jouer.");

}

/* ==========================================================
   BLACKJACK NATUREL
========================================================== */

async function resolveInitialBlackjack(){

    animationInProgress=true;

    lockButtons();

    await revealDealerCard();

    const playerBJ=isBlackjack(playerHand);
    const dealerBJ=isBlackjack(dealerHand);

    animationInProgress=false;

    if(playerBJ && dealerBJ){

        finishRound("Égalité : deux blackjacks.");
        return;

    }

    if(playerBJ){

        finishRound("Blackjack ! Vous gagnez !");
        return;

    }

    finishRound("Le croupier a un blackjack.");

}

/* ==========================================================
   TIRER
========================================================== */

async function hit(){

    if(!roundActive || animationInProgress) return;

    animationInProgress=true;

    lockButtons();

    const card=drawCard();

    playerHand.push(card);

    appendAnimatedCard(playerCardsElement,card);

    await wait(DEAL_DELAY);

    const score=calculateScore(playerHand);

    if(score>21){

        await revealDealerCard();

        animationInProgress=false;

        finishRound("Vous dépassez 21.");

        return;

    }

    if(score===21){

        animationInProgress=false;

        await stand();

        return;

    }

    animationInProgress=false;

    enablePlayerButtons();

    setMessage("Tirer ou rester ?");

}

/* ==========================================================
   RESTER
========================================================== */

async function stand(){

    if(!roundActive || animationInProgress) return;

    animationInProgress=true;

    lockButtons();

    await revealDealerCard();

    while(calculateScore(dealerHand)<17){

        const card=drawCard();

        dealerHand.push(card);

        appendAnimatedCard(
            dealerCardsElement,
            card
        );

        await wait(DEAL_DELAY);

    }

    animationInProgress=false;

    determineWinner();

}

/* ==========================================================
   DÉTERMINATION DU GAGNANT
   ========================================================== */


function determineWinner(){

    const playerScore=calculateScore(playerHand);
    const dealerScore=calculateScore(dealerHand);

    if(dealerScore>21){

        finishRound(
            "Le croupier dépasse 21. Vous gagnez !"
        );
        return;

    }

    if(playerScore>dealerScore){

        finishRound(
            "Votre main est la meilleure. Vous gagnez !"
        );
        return;

    }

    if(playerScore<dealerScore){

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

function finishRound(message){

    roundActive=false;
    dealerCardHidden=false;
    animationInProgress=false;

    renderGame();

    enableFinishedButtons();

    setMessage(message);

}

/* ==========================================================
   NOUVELLE PARTIE
========================================================== */

function resetTable(){

    if(animationInProgress) return;

    roundActive=false;
    dealerCardHidden=true;

    deck=[];
    playerHand=[];
    dealerHand=[];

    renderGame();

    dealButton.disabled=false;
    hitButton.disabled=true;
    standButton.disabled=true;
    newButton.disabled=true;

    setMessage("Cliquez sur « Distribuer ».");

}

/* ==========================================================
   ÉVÉNEMENTS
========================================================== */

dealButton.addEventListener("click",startRound);
hitButton.addEventListener("click",hit);
standButton.addEventListener("click",stand);
newButton.addEventListener("click",resetTable);

/* ==========================================================
   INITIALISATION
========================================================== */

resetTable();
