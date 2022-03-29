const webSocket = new WebSocket("ws://192.168.8.188:3000")   //creating a websocket object // ip address of the router

var remoteVolumeSlider = document.getElementById("remoteVolumeRange");
var localVolumeSlider = document.getElementById("localVolumeRange");


navigator.getUserMedia = navigator.getUserMedia ||
navigator.webkitGetUserMedia ||
navigator.mozGetUserMedia;


// for reading messages from server to us
webSocket.onmessage = (event) => {                 // when any event (clicking etc.)  happens in the webpage this fn will execute
    handleSignallingData(JSON.parse(event.data))  // getting the recieved data and pass it to the handleSignallingData fn  
}

function handleSignallingData(data) {
    switch (data.type) {                    //checking the data type
        case "answer":
            peerConn.setRemoteDescription(data.answer)  // setting the description of the remote user <- answer property is passed into this
            break
        case "candidate":                               // If the received message has candidates, candidate property will be passed to the below fn.
            peerConn.addIceCandidate(data.candidate)
    }
}

let username
function sendUsername() {

    username = document.getElementById("username-input").value
    sendData({                                                      //running the sendData function for sending details to the server
        type: "store_user"                                          // Here {type: "store_user"} added as a input
    })
}

function sendData(data) {
    data.username = username                        // adding a username property
    webSocket.send(JSON.stringify(data))     //converting the data object to a string and sending
}


let localStream            // to store our video+audio stream
let peerConn

function startCall() {
    document.getElementById("video-call-div").style.display = "inline" // When the start call button pressed,  video-call-div will be rendered as an inline element. 


    //navigator.getUserMedia(constraints, successCallback, errorCallback);  how fn works


    // var audioContext = new AudioContext()
    // var gainNode = audioContext.createGain();
    navigator.getUserMedia({            // getting the video and audio streams, 1st parameter -> video and audio details
        video: {
            frameRate: 24,              // creating a video property specifying the details of the video
            width: {
                min: 480, ideal: 720, max: 1280
            },
            aspectRatio: 1.33333
        },
        audio: true

    }, (stream) => {                    //stream as the second parameter for getUserMedia fn
        // audioSource = audioContext2.createMediaStreamSource(stream);
        // audioDestination = audioContext2.createMediaStreamDestination();
        // audioSource.connect(gainNode);
        // gainNode.connect(audioDestination);
        // gainNode.gain.value = 2;

        // //uncomment above


        // // window.localStream = audioDestination.stream;
        // strm = audioDestination.stream;

        // let x = stream.getAudioTracks();
        // console.log(x)

        
        localStream = stream
        document.getElementById("local-video").srcObject = localStream  //getting the local stream (video + audio) to html

        


        /* for mic audio visulizer*/

        audioContext = new AudioContext();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

        analyser.smoothingTimeConstant = 0.8;
        analyser.fftSize = 1024;

        microphone.connect(analyser);
        analyser.connect(javascriptNode);
        javascriptNode.connect(audioContext.destination);

        canvasContextLocal = $("#canvas-local")[0].getContext("2d");

        javascriptNode.onaudioprocess = function() {
            var array = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(array);
            var values = 0;

            var length = array.length;
            for (var i = 0; i < length; i++) {
                values += (array[i]);
            }

            var average = values / length;

    //          console.log(Math.round(average - 40));

            canvasContextLocal.clearRect(0, 0, 150, 300);
            canvasContextLocal.fillStyle = '#BadA55';
            canvasContextLocal.fillRect(0, 300 - average, 150, 300);
            canvasContextLocal.fillStyle = '#262626';
            canvasContextLocal.font = "48px impact";
            canvasContextLocal.fillText(Math.round(average - 40), -2, 300);

        }
            // end of mic level visualizer code
        


        let configuration = {
            //array of ice servers
            iceServers: [

                {                                                         // passing a array of stun servers, with key "urls"
                    "urls": ["stun:stun.l.google.com:19302",              // by passing multiple stun servers, there will be multiple ice candidates to make the peer connection
                        "stun:stun1.l.google.com:19302",
                        "stun:stun2.l.google.com:19302"]
                }
            ]
        }

        //creating new object for peer connection
        peerConn = new RTCPeerConnection(configuration)   // passing above configurations
        peerConn.addStream(localStream)                   // adding our stream to other person

        peerConn.onaddstream = (e) => {                    // callback fn for streaming
            document.getElementById("remote-video").srcObject = e.stream   //displaying other person's stream on html
           
            audioContext2 = new AudioContext();
            analyser2 = audioContext2.createAnalyser();
            microphone2 = audioContext2.createMediaStreamSource(e.stream);
            javascriptNode2 = audioContext2.createScriptProcessor(2048, 1, 1);

            analyser2.smoothingTimeConstant = 0.8;
            analyser2.fftSize = 1024;

            microphone2.connect(analyser2);
            analyser2.connect(javascriptNode2);
            javascriptNode2.connect(audioContext2.destination);

            canvasContextRemote = $("#canvas-remote")[0].getContext("2d");

            javascriptNode2.onaudioprocess = function() {
                var array = new Uint8Array(analyser2.frequencyBinCount);
                analyser2.getByteFrequencyData(array);
                var values = 0;

                var length = array.length;
                for (var i = 0; i < length; i++) {
                    values += (array[i]);
                }

                var average2 = values / length;
                console.log(average2)

        //          console.log(Math.round(average - 40));

                canvasContextRemote.clearRect(0, 0, 150, 300);
                canvasContextRemote.fillStyle = '#BadA55';
                canvasContextRemote.fillRect(0, 300 - average2, 150, 300);
                canvasContextRemote.fillStyle = '#262626';
                canvasContextRemote.font = "48px impact";
                canvasContextRemote.fillText(Math.round(average2 - 40), -2, 300);

            } 
        
        }

        peerConn.onicecandidate = ((e) => {      // If an 'event' e happens, then this function will run
            if (e.candidate == null)
                return
            sendData({                          // when there are candidates they will be sent to the other user with thype "store candidates"
                type: "store_candidate",
                candidate: e.candidate
            })
        })

        createAndSendOffer()      // this fn send offer details to the other user

    }, (error) => {              //3rd parameter -> error message to display if there is anything wrong
        console.log(error)
    })
}

audioBandwidth = 50;
videoBandwidth = 256;
function setBandwidth(sdp) {
    sdp = sdp.replace(/a=mid:audio\r\n/g, 'a=mid:audio\r\nb=AS:' + audioBandwidth + '\r\n');
    sdp = sdp.replace(/a=mid:video\r\n/g, 'a=mid:video\r\nb=AS:' + videoBandwidth + '\r\n');
    return sdp;
}

function createAndSendOffer() {
    // running the create offer  method
    peerConn.createOffer((offer) => {
        offer.sdp = setBandwidth(offer.sdp);
        sendData({
            type: "store_offer",
            offer: offer
        })

        peerConn.setLocalDescription(offer)     // setting the description of the remote peer connection
    }, (error) => {
        console.log(error)
    })
}

let isAudio = true

// function muteAudio() {

//     let audio = document.getElementById("remote-video")
//     isAudio = !isAudio
//     if(isAudio){
//     audio.volume = 0.1;
//     }else{
//         audio.volume = 1;
//     }
// }


function muteAudio() {
    isAudio = !isAudio
    localStream.getAudioTracks()[0].enabled = isAudio  // getting the audio track of our local stream , by [0] we are selecting the first audio track
}   

localVolumeSlider.oninput = function() {
    console.log(localVolumeSlider.value)
    localStream.getAudioTracks()[0].volume = (localVolumeSlider.value)/100;
  }


remoteVolumeSlider.oninput = function() {
    let audio = document.getElementById("remote-video")
    console.log(remoteVolumeSlider.value)
    audio.volume = (remoteVolumeSlider.value)/100;
  }



let isVideo = true
function muteVideo() {
    isVideo = !isVideo
    localStream.getVideoTracks()[0].enabled = isVideo
}


