```javascript
"use strict";

console.log("Le script Blackjack est bien chargé.");

const dealButton = document.getElementById("dealBtn");
const messageElement = document.getElementById("message");
const goldElement = document.getElementById("gold");

goldElement.textContent = "TEST";

dealButton.addEventListener("click", function () {
    messageElement.textContent = "Le bouton Distribuer fonctionne !";
});
