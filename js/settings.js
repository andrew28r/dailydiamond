document.addEventListener("DOMContentLoaded", async () => {


const username =
localStorage.getItem("playerId");


document.getElementById(
"settingsUsername"
).textContent =
username || "Not logged in";



updateNotificationStatus();


});




function updateNotificationStatus(){


const status =
document.getElementById(
"notificationStatus"
);



if(!("Notification" in window)){

status.textContent =
"Notifications not supported";

return;

}



if(Notification.permission === "granted"){

status.textContent =
"✅ Notifications enabled";

}



else if(Notification.permission === "denied"){

status.textContent =
"❌ Notifications blocked. Enable in iPhone Settings";

}



else {

status.textContent =
"Not enabled";

}


}


document.getElementById("backBtn").onclick = () => {
    window.location.href = "index.html";
};

if ("serviceWorker" in navigator) {

    navigator.serviceWorker.register(
        "./service-worker.js"
    );

}