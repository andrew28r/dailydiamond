if ("serviceWorker" in navigator) {

    navigator.serviceWorker.register(
        "./service-worker.js"
    )
    .then(() => {

        console.log(
            "Service worker registered"
        );

    })
    .catch(error => {

        console.log(
            "Service worker error",
            error
        );

    });

}

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

document
.getElementById("sendTestNotification")
.addEventListener(
"click",
sendTestNotification
);



async function sendTestNotification(){
console.log("Sending notification...");

const playerId =
localStorage.getItem("playerId");


if(!playerId){

alert("No player logged in");

return;

}



const {data,error} =
await db.functions.invoke(
"send-notification",
{

body:{

playerId: playerId,

title:
"💎 Daily Diamond",

body:
"Today's challenge is ready!"

}

}

);



if(error){

console.log(error);

alert(
"Notification failed"
);

return;

}



alert(
"Notification sent!"
);


}