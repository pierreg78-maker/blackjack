"use strict";

document.getElementById("gold").textContent = "TEST";

document
    .getElementById("dealBtn")
    .addEventListener("click", function () {
        document.getElementById("message").textContent =
            "Le bouton Distribuer fonctionne !";
    });
