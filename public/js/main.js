import { initializeApp } from "https://www.gstatic.com/firebasejs/9.8.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.8.1/firebase-analytics.js";
import { getDatabase, get, ref, set, update, push, child } from "https://www.gstatic.com/firebasejs/9.8.1/firebase-database.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.8.1/firebase-auth.js";
import { make_experiment, collect_user_guess} from "./canvas.js"

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

var uid;
var stimuliOrder;
var conditionOrder;
var finishedSurvey = false;

var utterId;
var utterRate = 1.4;
var onStimuli = false;
var skipButtonActivated = false;

var datasets = [
  {
    "display" : "Life Expectancy of Venezuela",
    "true_values" : "data/s0.csv",
    "x_label" : "Year",
    "x_prop" : "Year",
    "y_label" : "Life Expectancy (Age)",
    "y_prop" : "Age",
    "descriptor" : "This line chart shows how the life expectancy of Venezuela changed over time.",
  },
  {
    "display" : "Military Expenditure of Argentina",
    "true_values" : "data/s1.csv",
    "x_label" : "Year",
    "x_prop" : "Year",
    "y_label" : "Military Expenditure (Dollars)",
    "y_prop" : "Military Expenditure (Dollars)",
    "descriptor" : "This line chart shows how the military expenditure of Argentina changed over time.",
  },
  {
    "display" : "Air Pollution in London",
    "true_values" : "data/s2.csv",
    "x_label" : "Year",
    "x_prop" : "Year",
    "y_label" : "Suspended Particulate Matter (SPM)",
    "y_prop" : "Suspended Particulate Matter (SPM)",
    "descriptor" : "This line chart shows how the air pollution of London changed over time.",
  },
  {
    "display" : "Alcohol Consumption of Americans",
    "true_values" : "data/s3.csv",
    "x_label" : "Year",
    "x_prop" : "Year",
    "y_label" : "Alcohol Consumption per Individual (Liters)",
    "y_prop" : "Alcohol Consumption per Capita (Liters)",
    "descriptor" : "This line chart shows how the alcohol consumption of Americans changed over time.",
  },
  {
    "display" : "GDP of Costa Rica",
    "true_values" : "data/s4.csv",
    "x_label" : "Year",
    "x_prop" : "Year",
    "y_label" : "GDP per Capita (Dollars)",
    "y_prop" : "GDP per Capita (Dollars)",
    "descriptor" : "This line chart shows how the GDP of Costa Rica changed over time.",
  },
];

export function main() {

    //check if text-to-speech is supported by the browser
    if('speechSynthesis' in window){
        console.log("Web Speech API supported!")
    } else {
        console.log("Web Speech API not supported :-(")
        return;   
    }

    var stimuli_condition_arr = $.csv.toArrays($('#stimuli-condition-csv').html())

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
            logger("user signed in: " + uid);
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
                if (!(uid in uidDict) || uid === "wm0pnZMYJGVrUjoAC902PRDVUSr1") {
                    // Add uid to db uid list
                    set(ref(database, 'users/'+uid), false);
                    // increase counter
                    var count = snapshot.child("count").val();
                    set(ref(database, 'users/count'), count + 1);
                    console.log("count: " + count);
                    // get stimuli and condition order
                    var stimuliOrderStr = stimuli_condition_arr[count + 1][0]
                    var conditionOrderStr = stimuli_condition_arr[count + 1][1]
                    stimuliOrder = [stimuliOrderStr[0], stimuliOrderStr[1], stimuliOrderStr[2], stimuliOrderStr[3]];
                    conditionOrder = [conditionOrderStr[0], conditionOrderStr[1], conditionOrderStr[2], conditionOrderStr[3]];
                    console.log('stimuli: ' + stimuliOrder);
                    console.log('condition: ' + conditionOrder);
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
    $("#assessment_form").submit(submit_assessment);
    $("#canvasSubmit").click(submit_canvas);
    $("#feedback_form").submit(submit_feedback);
    $("#confirmation_form").submit(submit_confirmation);

    $("#rate_decrease_button").click(function() {
        utterRate -= 0.1;
        $("#utterRate").html(Math.round(utterRate * 10) / 10)
        return false;
    });
    $("#rate_increase_button").click(function() {
        utterRate += 0.1;
        $("#utterRate").html(Math.round(utterRate * 10) / 10)
        return false;
    });

    //keybind for data navigation
    document.addEventListener('keydown', function(event) {
        if (!onStimuli) return;
        if(event.keyCode == 37) {
            $("#utter_prev_button").click();
        }
        else if(event.keyCode == 39) {
            $("#utter_next_button").click();
        }
    });

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

    set(ref(database, 'survey/' + uid), {
        uid: uid,
        condition_order: conditionOrder,
        stimuli_order: stimuliOrder,
        gender: gender,
        education: $('#response_education').val(),
        age: $('#response_age').val(),
        english: language,
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
    onStimuli = true;

    //Load appropriate data based on stimuli & condition
    var csvid;
    var dataset;
    if (sid == 0) {
        csvid = '#s0-csv';
        dataset = datasets[sid];
    }
    else {
        csvid = '#s';
        var stimuli = stimuliOrder[sid-1];
        csvid = csvid + stimuli;

        var condition = conditionOrder[sid-1];
        if (condition % 2 == 0) {
            csvid = csvid + "-sampled";
        }
        if (condition > 2) {
            csvid = csvid + "-rounded";
        }
        csvid = csvid + "-csv";

        //Alter Title & Descriptions
        $("#stimuli_title").html("Task " + sid);
        dataset = datasets[stimuli];
    }
    $("#chart_description").html(dataset["descriptor"]);
    $("#chart_labelx").html(dataset["x_label"]);
    $("#chart_labely").html(dataset["y_label"]);

    var dataArr = $.csv.toArrays($(csvid).html())

    const synth = window.speechSynthesis

    var utterStart = new SpeechSynthesisUtterance("Start of data")
    var utterEnd = new SpeechSynthesisUtterance("End of data")

    utterId = 0;
    $("#utter_next_button").unbind()
    $("#utter_prev_button").unbind()
    $("#utter_next_button").click(function() {
        var utt;
        synth.cancel()
        utterId++;
        if (utterId >= dataArr.length) {
            utterId = dataArr.length;
            utt = utterEnd;
        }
        else {
            utt = new SpeechSynthesisUtterance(dataArr[utterId][0] + ", " + dataArr[utterId][1])
        }
        utt.rate = utterRate;
        synth.speak(utt)
        return false;
    });
    $("#utter_prev_button").click(function() {
        var utt;
        synth.cancel()
        utterId--;
        if (utterId <= 0) {
            utterId = 0;
            utt = utterStart;
        }
        else {
            utt = new SpeechSynthesisUtterance(dataArr[utterId][0] + ", " + dataArr[utterId][1])
        }
        utt.rate = utterRate;
        synth.speak(utt)
        return false;
    });

    $("#timer_text").text(Math.floor(TIME_LIMIT_SEC/60) + " minutes " + TIME_LIMIT_SEC%60 + " seconds ");
    $("#stimuli").show();

    var countDownDate = new Date(new Date().getTime() + (TIME_LIMIT_SEC * 1000));
    skipButtonActivated = false;
    $('#skipbutton').html('Need at least 3 minutes before you can skip!')
    $('#skipbutton').prop("disabled",true);
    // Update the countdown every 1 second
    var timer = setInterval(function() {

      var now = new Date().getTime();
      var distance = countDownDate - now;

      var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      var seconds = Math.floor((distance % (1000 * 60)) / 1000);
      time = TIME_LIMIT_SEC - (minutes * 60 + seconds);

      $("#timer_text").text(minutes + " minutes " + seconds + " seconds ");

      if (!skipButtonActivated && minutes == 1) {
        $('#skipbutton').html('Skip to task!')
        $('#skipbutton').prop("disabled",false);
        skipButtonActivated = true;
      }

      if (distance < 0) {
        time = TIME_LIMIT_SEC;
        show_assessment();
        clearInterval(timer);
      }
    }, 1000);

    $("#skipbutton").click(function() {
        show_assessment();
        clearInterval(timer);
    });
}

function show_assessment() {
    hide_all();
    onStimuli = false;

    if (sid != 0) {
        $("#assessment_title").text("Task " + sid)
    }
    $("#assessment").show();

    if (sid == 0) {
        make_experiment(datasets[0]);
    }
    else {
        make_experiment(datasets[stimuliOrder[sid-1]]);
    }
    $("#canvasContainer").show();
}

// submitting user guess
function submit_canvas() {
    if (1 <= sid && sid <= 4) {
        //convert user guess to csv string
        var userData = collect_user_guess();
        var csvstr = ""
        userData.forEach(function(rowArray) {
            let row = rowArray.join(",");
            csvstr += row + "\r\n";
        });

        //post assessment+canvas data to db
        var postData = {
            timestamp: getDateTime(),
            stimuli: stimuliOrder[sid-1],
            condition: conditionOrder[sid-1],
            time: time,
            order: sid,
            Q0: $("#response_Q0").val(),
            Q1: $("#response_Q1").val(),
            Q2: $("#response_Q2").val(),
            Q3: $("#response_Q3").val(),
            Q4: $("#response_Q4").val(),
            Q5: $("#response_Q5").val(),
            Q6: $("#response_Q6").val(),
            Q7: csvstr
        };
        const dataRef = ref(database, 'survey/' + uid + '/responses');
        const newPostRef = push(dataRef);
        set(newPostRef, postData);   
    }

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
    show_confirmation();
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

