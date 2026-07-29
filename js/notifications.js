const VAPID_PUBLIC_KEY =
"BBt6PowMI31jAOlh3v-FN9mh22Yt57DIA-hCzHUm171Y6ETFeVqb6K0SeFkp7uBcVpcHbTh1fwIihRjQYm3Xcmo";



async function enableNotifications() {


    if (!("Notification" in window)) {

        alert("Notifications are not supported");

        return;

    }



    const permission =
    await Notification.requestPermission();



    if (permission !== "granted") {

        document.getElementById(
            "notificationStatus"
        ).textContent =
        "Notifications denied";

        return;

    }



    const registration =
    await navigator.serviceWorker.ready;



    let subscription =
    await registration.pushManager.getSubscription();



    if (!subscription) {


        subscription =
        await registration.pushManager.subscribe({

            userVisibleOnly: true,

            applicationServerKey:
            urlBase64ToUint8Array(
                VAPID_PUBLIC_KEY
            )

        });

    }



    await saveSubscription(subscription);


}



async function saveSubscription(subscription) {


    const playerId =
    localStorage.getItem("playerId");


    const { data: authData, error: authError } =
    await db.auth.getSession();

    console.log("SESSION:", authData);
    console.log("AUTH ERROR:", authError);

    if (!playerId) {

        alert(
            "No player logged in"
        );

        return;

    }



    const json =
    subscription.toJSON();



    const { data, error } =
    await db
    .from("push_subscriptions")
    .insert({
        player_id: playerId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth
    })
    .select();



    console.log(
        "Saved:",
        data
    );


    console.log(
        "Error:",
        error
    );



    if(error){

        alert(
            error.message
        );

        return;

    }



    document.getElementById(
        "notificationStatus"
    ).textContent =
    "✅ Notifications enabled";

}




function urlBase64ToUint8Array(base64String) {


    const padding =
    "=".repeat(
        (4 - base64String.length % 4) % 4
    );



    const base64 =
    (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");



    const rawData =
    window.atob(base64);



    return Uint8Array.from(
        [...rawData].map(
            char =>
            char.charCodeAt(0)
        )
    );

}




document
.getElementById("enableNotifications")
.addEventListener(
    "click",
    enableNotifications
);