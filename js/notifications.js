const VAPID_PUBLIC_KEY =
"BIcHDriG6nrQOcZAYcfyWEOZ5KZqmCV7bNGWXHoKY_9R5Eb76NaEEj-n64z7n-uHD3cHpjBoWaOLdlI8b-iioMI";



async function enableNotifications() {


    if (!("Notification" in window)) {

        alert("Notifications not supported");

        return;
    }


    const permission =
        await Notification.requestPermission();



    if (permission !== "granted") {

        document.getElementById(
            "notificationStatus"
        ).textContent =
        "Notifications disabled";

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



    document.getElementById(
        "notificationStatus"
    ).textContent =
    "✅ Notifications enabled";

}



async function saveSubscription(subscription) {


    const json =
    subscription.toJSON();


    const playerId =
    localStorage.getItem("playerId");


    console.log("Player ID:", playerId);
    console.log("Subscription:", json);



    if (!playerId) {

        alert("No player logged in");

        return;

    }



    const { data, error } =
    await db
    .from("push_subscriptions")
    .insert(
    {
        player_id: playerId,

        endpoint:
        json.endpoint,

        p256dh:
        json.keys.p256dh,

        auth:
        json.keys.auth

    },
    {
        onConflict: "endpoint"
    }
    )
    .select();



    console.log("DATA:", data);
    console.log("ERROR:", error);



    if(error){

        alert(error.message);

        return;

    }


    alert("Notification subscription saved!");

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
            char => char.charCodeAt(0)
        )
    );

}




document
.getElementById("enableNotifications")
.addEventListener(
    "click",
    enableNotifications
);