import { initializeApp } from "https://www.gstatic.com/firebasejs/9.8.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.8.1/firebase-analytics.js";
import { getDatabase, get, ref, set, update, push, child } from "https://www.gstatic.com/firebasejs/9.8.1/firebase-database.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.8.1/firebase-auth.js";
import { make_experiment, collect_user_guess} from "./canvas.js"
import { numToWords } from "./numToWords.js"

//import { getStorage, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.8.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyA6mpeHIaKvZG2hys_nE3XHnKs-98Y5q7E",
  authDomain: "vissummaryinterface-sighted.firebaseapp.com",
  databaseURL: "https://vissummaryinterface-sighted-default-rtdb.firebaseio.com",
  projectId: "vissummaryinterface-sighted",
  storageBucket: "vissummaryinterface-sighted.appspot.com",
  messagingSenderId: "741545012089",
  appId: "1:741545012089:web:b3f444ec0afd32cf761da8",
  measurementId: "G-STNGMWY0DX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// turn on/off console logging
var DEBUG_STATE = true;
var DEBUG_STATE_C = false;

var TEST_PARTICIPANTID = 'JihoKim'
// Time Limit
var TIME_LIMIT_SEC = 300;

// subject-level variables as globals
// we need to declare all the variables that we need to record
var participant_id, stimuliOrder, conditionOrder;
var currStimuli = 0, currCondition = 0;
var sid = 0; //stimuli index
var time = TIME_LIMIT_SEC; //time taken in looking at the stimuli
//var audio = new Audio('../beep.wav');

var uid, pid;
var synth;
var stimuliPlaying = false;
var finishedSurvey = false;

var utterId;
var utterRate = 1.0;
var onStimuli = false;
var skipButtonActivated = false;

var sampleidx, sampleSize, dataArr, dataTransformArr, precision, dataset_label;
var datasets = []
var dataset_labels = [
  {
    "display" : "Production Output of a Manufacturing Plant",
    "x_label" : "Year",
    "x_prop" : "Year",
    "y_label" : "Product Count",
    "y_prop" : "Count",
    "x_unit" : "",
    "y_unit" : "Products",
    "descriptor" : "This line chart shows how the production output of a manufacturing plant changed over time"
  },
  {
    "display" : "Price of a Certain Stock",
    "x_label" : "Year",
    "x_prop" : "Year",
    "y_label" : "Price (Dollars)",
    "y_prop" : "Dollars",
    "x_unit" : "",
    "y_unit" : "Dollars",
    "descriptor" : "This line chart shows how the price of a stock changed over time",
  },
  {
    "display" : "Energy Consumption in a Building ",
    "x_label" : "Year",
    "x_prop" : "Year",
    "y_label" : "Consumption (Units)",
    "y_prop" : "Units",
    "x_unit" : "",
    "y_unit" : "units",
    "descriptor" : "This line chart shows how the energy consumption in a building changed over time",
  },
  {
    "display" : "Water Usage in a Certain Area",
    "x_label" : "Year",
    "x_prop" : "Year",
    "y_label" : "Water Usage (Gallons)",
    "y_prop" : "Gallons",
    "x_unit" : "",
    "y_unit" : "gallons",
    "descriptor" : "This line chart shows how the water usage in a certain area changed over time",
  },
  {
    "display" : "Average Visitor Count to a Public Facility",
    "x_label" : "Year",
    "x_prop" : "Year",
    "y_label" : "Visitor Count",
    "y_prop" : "People",
    "x_unit" : "",
    "y_unit" : "", 
    "descriptor" : "This line chart shows how the average visitor count to a public facility changed over time",
  }
];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

export function main() {

    //check if text-to-speech is supported by the browser
    if('speechSynthesis' in window){
        console.log("Web Speech API supported!")
    } else {
        console.log("Web Speech API not supported :-(")
        return;   
    }

    synth = window.speechSynthesis;

    for (let i = 1; i < 28; i++) {
        fetch('../data/benchmark/dataset' + i + '.csv')
        .then(response => response.text())
        .then(text => {
            let dataset = parseCSV(text)
            datasets.push(dataset);
            // console.log(dataset)
        }); 
    }

    // var stimuli_condition_arr = $.csv.toArrays($('#stimuli-condition-csv').html())

    //Firebase Anonymous Auth
    const auth = getAuth();
    signInAnonymously(auth).catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        logger('auth error code: ' + errorCode);
        logger('auth error msg: ' + errorMessage);
    });

    onAuthStateChanged(auth, (user) => {
        if (user) {
            uid = user.uid;
            pid = getPid();
            logger("user signed in. pid: " + pid);
        } else {
            if (!finishedSurvey) {
                get(ref(database, 'users/count')).then((snapshot) => {
                    set(ref(database, 'users/count'), snapshot.val() - 1);
                });
            }
            logger("user signed out")
        }
    });
    
    hide_all();

    // configure some buttons
    $("#consent_form").submit(function() {
        get(ref(database, 'users')).then((snapshot) => {
            if (snapshot.exists()) {
                var uidDict = snapshot.val();
                if (!(uid in uidDict) || uid === "7BU31oIvAjRZ7pvObiRg815t2ZA3" || pid === "Louie") {
                    // Add uid to db uid list
                    set(ref(database, 'users/'+uid), false);
                    // increase counter
                    var count = snapshot.child("count").val();
                    set(ref(database, 'users/count'), count + 1);
                    console.log("count: " + count);
                    // get stimuli and condition order
                    shuffleArray(dataset_labels);
                    stimuliOrder = getRandomIntegers(0, 27, 5);
                    console.log("stimuli: " + stimuliOrder);
                    show_demographicSurvey();
                }
                else if (uidDict[uid]) {
                    $("#error").html("It looks like you have already completed the survey. If you haven't, please use a different device. Your survey code was: " + uid);
                    show_error();
                }
                else {
                    $("#error").html("It looks like you have already completed the survey. If you haven't, please use a different device. Your survey code was: " + uid);
                    //$("#error").html("It looks like you have work in progress. You must to continue from where you have left.");
                    show_error();
                }
            } else {
                console.log("Could not read \'count\'");
            }
        }).catch((error) => {
          console.error(error);
        });
        return false;
    });
    $("#next_button").click(function() {
        show_stimuli();
        return false;
    });
    $("#demographicSurvey_form").submit(submit_demographicSurvey);
    $("#canvasSubmit").click(submit_canvas);
    $("#feedback_form").submit(submit_feedback);
    $("#confirmation_form").submit(submit_confirmation);

    $("#utter_start_button").click(function() {

    });

    var utter_test = new SpeechSynthesisUtterance("This is an example data. 2023, one million units")
    $("#rate_decrease_button").click(function() {
        utterRate -= 0.1;
        $("#utterRate").html(Math.round(utterRate * 10) / 10)
        if (!stimuliPlaying) {
            synth.cancel()
            setTimeout(function() {
                utter_test.rate = utterRate;
                synth.speak(utter_test);
            }, 250);
        }
        return false;
    });
    $("#rate_increase_button").click(function() {
        utterRate += 0.1;
        $("#utterRate").html(Math.round(utterRate * 10) / 10)
        if (!stimuliPlaying) {
            synth.cancel()
            setTimeout(function() {
                utter_test.rate = utterRate;
                synth.speak(utter_test);
            }, 250);
        }
        return false;
    });

    //keybind for data navigation
    // document.addEventListener('keydown', function(event) {
    //     if (!onStimuli) return;
    //     if(event.keyCode == 37) {
    //         $("#utter_prev_button").click();
    //     }
    //     else if(event.keyCode == 39) {
    //         $("#utter_next_button").click();
    //     }
    // });

    window.onbeforeunload = function() { return "Your work will be lost."; };

    // show consent form
    $('#consent').show();
}

function show_demographicSurvey() {
    hide_all();
    $('#demographicSurvey').show();
}

function submit_demographicSurvey() {
    var gender = $("input[name='gender']:checked").val();
    var language = $("input[name='language']:checked").val();
    var freq = $("input[name='encounter_frequency']:checked").val();
    var hasImpairment = $("input[name='impairment']:checked").val();

    set(ref(database, 'survey/' + uid), {
        uid: uid,
        pid: pid,
        stimuli_order: stimuliOrder,
        gender: gender,
        education: $('#response_education').val(),
        age: $('#response_age').val(),
        english: language,
        frequency: freq,
        hasImpairment: hasImpairment,
        responses: []
    });

    show_ready();

    return false;
}

function show_ready() {
    hide_all();
    if (sid == 0) { //tutorial
        $("#readyPage-tutorial").show();
    }
    else {
        $("#readyPage-" + (sid - 1)).show();
    }
    $("#next_button").show();
}

function show_stimuli() {
    hide_all(); 
    $('#skipbutton').prop("disabled",true);
    onStimuli = true;

    //Load appropriate data based on stimuli & condition
    var csvid;
    dataset_label = dataset_labels[sid]
    dataArr = datasets[stimuliOrder[sid]];

    var scale = getRandomFloat(1, 10)
    var exp = getRandomInt(0, 6)
    scale = scale * 10 ** exp
    var transform = getRandomFloat(1, 10)
    var transformexp = getRandomInt(-3, 0)
    transform = transform * 10 ** transformexp
    precision = 3 // getRandomInt(2,8)

    if (dataset_label.x_prop == "Month") {
        var startMonth = getRandomInt(0, 11)
        var startYear = getRandomInt(1960, 2021)
        dataTransformArr = dataArr.map(function(x) { return [ MONTHS[(Math.round(x[0] * 19) + startMonth)%12] + ", " + (startYear + Math.floor((Math.round(x[0] * 19) + startMonth)/12)),
                                                                parseFloat(((Math.abs(x[1] + gaussianRandom(0, 0.05)) + transform) * scale).toPrecision(precision))]; })
    }
    else {
        var startYear = getRandomInt(1800, 2000)
        var interval = getRandomInt(1, 5)
        dataTransformArr = dataArr.map(function(x) { return [Math.round(x[0] * 19) * interval + startYear, 
                                                                parseFloat(((Math.abs(x[1] + gaussianRandom(0, 0.05)) + transform) * scale).toPrecision(precision))]; });
        $("#chart_startTime").html(startYear);
        $("#chart_endTime").html(19 * interval + startYear);
    }
    
    console.log(dataTransformArr)

    sampleSize = getRandomInt(3, 20)
    sampleidx = getSampleIdx(sampleSize, 19)
    var sampleArr = []
    for (const idx of sampleidx) {
        sampleArr.push(dataTransformArr[idx])
    }
    console.log(sampleArr)
    sampleArr = sampleArr.map(function(x) {return [formatYearForSpeech(x[0]), numToWords(x[1])];});

    if (sid != 0) {
        $("#stimuli_title").html("Task " + sid);
    }
    $("#chart_description").html(dataset_label["descriptor"]);
    $("chart_samplesize").html(sampleSize);
    $("#chart_labelx").html(dataset_label["x_label"]);
    $("#chart_labely").html(dataset_label["y_label"]);

    var utterStart = new SpeechSynthesisUtterance("Start of data")
    var utterEnd = new SpeechSynthesisUtterance("End of data")
    utterEnd.addEventListener("end", (event) => {
        $('#skipbutton').html('Continue')
        $('#skipbutton').prop("disabled",false);
    });

    utterId = 0;
    $('#utter_start_button').html("Start Playing");
    $('#utter_start_button').prop("disabled",false);
    $("#utter_start_button").unbind()
    $("#utter_start_button").click(function() {
        stimuliPlaying = true
        var utt_list = [];
        synth.cancel()
        for (let i = 0; i < sampleArr.length; i++) {
            var utt = new SpeechSynthesisUtterance(sampleArr[i][0] + " " + dataset_label["x_unit"] + ", " + sampleArr[i][1] + " " + dataset_label["y_unit"])
            if (i == sampleArr.length - 1) {
                utt.addEventListener("end", (event) => {
                    synth.speak(utterEnd)
                    $('#utter_start_button').html("Finished Playing");
                    stimuliPlaying = false
                });
            }
            else {
                utt.addEventListener("end", (event) => {
                    synth.speak(utt_list[i+1])
                });
            }
            utt.rate = utterRate;
            utt_list.push(utt)
        }
        setTimeout(function() {
             synth.speak(utt_list[0])
        }, 500);
        $('#utter_start_button').html("Playing...");
        $('#utter_start_button').prop("disabled",true);
        return false;
    });

    $("#stimuli").show();
    $("#skipbutton").click(function() {
        show_assessment();
        // clearInterval(timer);
    });
}

function show_assessment() {
    hide_all();
    onStimuli = false;

    if (sid != 0) {
        $("#assessment_title").text("Task " + sid)
    }
    $("#assessment").show();

    make_experiment(interpolatePoints(dataTransformArr), dataset_label);
    $("#canvasContainer").show();
}

// submitting user guess
function submit_canvas() {
    //convert user guess to csv string
    var userData = collect_user_guess();

    //post assessment+canvas data to db
    var postData = {
        timestamp: getDateTime(),
        stimuli: stimuliOrder[sid],
        dataArr: arrToCSVString(dataTransformArr),
        sampleidx: sampleidx.join(","),
        size: sampleSize,
        time: time,
        order: sid,
        // precision: precision,
        // Q0: $("#response_Q0").val(),
        // Q1: $("#response_Q1").val(),
        // Q2: $("#response_Q2").val(),
        // Q3: $("#response_Q3").val(),
        // Q4: $("#response_Q4").val(),
        // Q5: $("#response_Q5").val(),
        // Q6: $("#response_Q6").val(),
        Q7: arrToCSVString(userData)
    };
    const dataRef = ref(database, 'survey/' + uid + '/responses');
    const newPostRef = push(dataRef);
    set(newPostRef, postData);   

    if (sid == 4) { // end of task
        show_feedback();
    } else {
        sid += 1;
        show_ready();
    }
}

function show_feedback() {
    hide_all();
    $("#feedback").show();
}

function submit_feedback() {
    var postData = {
        feedback0: $("#response_feedback_0").val(),
        feedback1: $("#response_feedback_1").val(),
        feedback2: $("#response_feedback_2").val()
    };
    const dataRef = ref(database, 'users/' + uid + '/feedback');
    set(dataRef, postData);
    // show_confirmation();
    hide_all();
    submit_confirmation();
}

function show_confirmation() {
    hide_all();
    $("#surveyCode").html(uid);
    $("#confirmation").show();
}

function submit_confirmation() {
    set(ref(database, 'users/'+uid), true)
    show_thankYou();
}

function show_thankYou() {
    hide_all();
    $("#thankyou").show();
}

function show_error() {
    hide_all();
    $("#errorMessage").show();
}

// hides all divs
function hide_all() {

    $('#consent').hide();
    $('#demographicSurvey').hide();
    $("#readyPage-tutorial").hide();
    $("#readyPage-0").hide();
    $("#readyPage-1").hide();
    $("#readyPage-2").hide();
    $("#readyPage-3").hide();
    $("#next_button").hide();
    $("#stimuli").hide();
    $("#assessment").hide();
    $("#feedback").hide();
    $("#confirmation").hide();
    $("#thankyou").hide();
    $("#errorMessage").hide();
    
    $(window).scrollTop(0);
}

/* HELPER FUNCTIONS BELOW */
function logger(msg) {
    if (DEBUG_STATE)
	console.log(msg);
}

// http://stackoverflow.com/a/19176102/76259
function getDateTime() {
    var now     = new Date(); 
    var year    = now.getFullYear();
    var month   = now.getMonth()+1; 
    var day     = now.getDate();
    var hour    = now.getHours();
    var minute  = now.getMinutes();
    var second  = now.getSeconds(); 
    if(month.toString().length == 1) {
        var month = '0'+month;
    }
    if(day.toString().length == 1) {
        var day = '0'+day;
    }   
    if(hour.toString().length == 1) {
        var hour = '0'+hour;
    }
    if(minute.toString().length == 1) {
        var minute = '0'+minute;
    }
    if(second.toString().length == 1) {
        var second = '0'+second;
    }   
    var dateTime = year+'-'+month+'-'+day+' '+hour+':'+minute+':'+second;   
    return dateTime;
}

function parseCSV(text) {
    // Parse the CSV text
    const lines = text.split('\n');
    var df = []
    lines.forEach(line => {
        if (line.length != 0 && line.indexOf('x') < 0) {
            var row = line.replace(/(\r\n|\n|\r)/gm, "").split(',');
            row = row.map(item => parseFloat(item)) 
            df.push(row)
        }
    });
    return df
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function sampleArr(arr, k) {

}

function getSampleIdx(n, len) {
    const uniqueIntegers = new Set();

    while (uniqueIntegers.size < n) {
        uniqueIntegers.add(getRandomInt(0, len));
    }

    return Array.from(uniqueIntegers).sort((a, b) => a - b);
}

function getRandomInt(x, y) {
    return Math.floor(Math.random() * (y - x + 1)) + x;
}

function getRandomFloat(x, y) {
    return Math.random() * (y - x) + x;
}

function getRandomIntegers(min, max, count) {
    let arr = [];
    for (let i = min; i <= max; i++) {
        arr.push(i);
    }
    shuffleArray(arr)
    return arr.slice(0, count);
}

function gaussianRandom(mean=0, stdev=1) {
    const u = 1 - Math.random(); // Converting [0,1) to (0,1]
    const v = Math.random();
    const z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    // Transform to the desired mean and standard deviation:
    return z * stdev + mean;
}

function interpolatePoints(points) {
    var interpolatedPoints = [];

    for (var i = 0; i < points.length - 1; i++) {
        var start = points[i];
        var end = points[i + 1];

        interpolatedPoints.push(start); // Include the start point

        // Interpolate intermediate points
        for (var t = 0.2; t < 1; t += 0.2) {
            var interpolatedX = start[0] + t * (end[0] - start[0]);
            var interpolatedY = start[1] + t * (end[1] - start[1]);
            interpolatedPoints.push([interpolatedX, interpolatedY]);
        }
    }

    interpolatedPoints.push(points[points.length - 1]); // Include the end point

    return interpolatedPoints;
}

function arrToCSVString(arr) {
    var csvstr = ""
    arr.forEach(function(rowArray) {
        let row = rowArray.join(",");
        csvstr += row + "\r\n";
    });
    return csvstr
}

function getPid() {
    // Create URLSearchParams object from the current window's URL
    const params = new URLSearchParams(window.location.search);

    // Get individual parameters using .get()
    const pid = params.get('PROLIFIC_PID'); // 'value1'
    // const param2 = params.get('param2'); // 'value2'

    return pid;
}

function generateLogarithmicRandomNumber() {
    // Generate a random number between 0 and 1
    var randomNumber = Math.random();

    // Transform this number logarithmically
    var logNumber = Math.pow(10, randomNumber * Math.log10(10));

    return logNumber;
}

function formatYearForSpeech(year) {
    // Convert the year to a string
    let yearStr = year.toString();

    // Split the year into two parts if it's a four-digit year
    if (yearStr.length === 4) {
        return yearStr.substring(0, 2) + " " + yearStr.substring(2);
    }

    return yearStr;
}