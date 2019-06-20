window.onload = function () {
    const path = require("path")
    let soundButtons = document.querySelectorAll(".button-sound")
    console.log()
    for (let i = 0; i < soundButtons.length; i++) {
        let soundButton = soundButtons[i];
        let soundName = soundButton.getAttribute("data-sound")
        prepareButton(soundButton, soundName)
    }

    function prepareButton(buttonEl, soundName) {
        console.log(soundName)

        var audio = new Audio(path.join(__dirname, "/voice/", soundName + ".mp3"))


        buttonEl.addEventListener("click", function () {

            audio.currentTime = 0;
            audio.play()
        }, false)
    }

    document.querySelector("#a").addEventListener("click", function () {
        alert(1)
    })
}