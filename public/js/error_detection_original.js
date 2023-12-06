// turn on/off console logging
var DEBUG_STATE = true;

// subject-level variables as globals
var assignment_id, worker_id, hit_id, submit_to;

var ts_consent_start,  ts_instruction_start;

var recaptcha_response = '';
var recaptcha_success = false;

//treatment variables
var country = 'usa'
var format;
var initial_risk_order, sorted_risk_order;

var questions = ['Weather','Drownings','Murder','Cars','Suicides','Robbery','Cancer','Bankruptcies'];
var question_counter = -1
var order = [true, true, true, true, false, false, false, false] //whether we are giving them the correct or incorrect answer
// fisher-yates shuffle to randomize elements of an array
// ripped off from d3.js: http://bost.ocks.org/mike/shuffle/
var x_in_y = 0
questions = shuffle(questions);
order = shuffle(order);

var judgements = new Array(); //judgements[i] is 0-1 where 1 means they thought that question was correct
var confidences = new Array(); //confidence[i] is 50,60,70,80,90,100
var error_rates = new Array(); //error_rates[i] is what the risk is multiplied by (e.g. for correct statistics it is 1)
var row_numbers = new Array(); //row_numbers[i] is which fake row we used for question i (if we used a real one it will be -999)
var ts_judgements = new Array(); //timestamp for beginning judgement on question i
var ts_confidences = new Array(); //timestamp for beginning confidence on question i
var displayed_question_stats = new Array(); //value i is the actual displayed statistic.  So if we want to display a true value, it's question_statistics[q][country][format]

question_statistics =
    {
	"planes":{
	    "usa":{
		"absolute":"1",
		"1_in_x":"1 out of every 320,000,000",
		"x_in_y":"31 out of every 10,000,000,000",
		"proportion":".0000000031",
		"percent":".00000031",
		"probability":".00000031",
	    },
	    "germany":{
		"absolute":"28",
		"1_in_x":"1 out of every 2,900,000",
		"x_in_y":"34 out of every 100,000,000",
		"proportion":".00000034",
		"percent":".000034",
		"probability":".000034",
	    },
	    "phrase": "died in plane accidents on large COUNTRYADJ air carriers and commuters airlines in 2016."
	},
	"terrorism":{
	    "usa":{
		"absolute":"67",
		"1_in_x":"1 out of every 4,900,000",
		"x_in_y":"21 out of every 100,000,000",
		"proportion":".00000021",
		"percent":".000021",
		"probability":".000021",
	    },
	    "germany":{
		"absolute":"12",
		"1_in_x":"1 out of every 6,800,000",
		"x_in_y":"15 out of every 100,000,000",
		"proportion":".00000015",
		"percent":".000015",
		"probability":".000015",
	    },
	    "phrase":"died from terrorist attacks inside COUNTRYN last year, counting both the victims and perpetrators."
	},
	"weather":{
	    "usa":{
		"absolute":"460",
		"1_in_x":"1 out of every 710,000",
		"x_in_y":"14 out of every 10,000,000",
		"proportion":".0000014",
		"percent":".00014",
		"probability":".00014",
	    },
	    "germany":{
		"absolute":"140",
		"1_in_x":"1 out of every 570,000",
		"x_in_y":"18 out of every 10,000,000",
		"proportion":".0000018",
		"percent":".00018",
		"probability":".00018",
	    },
	    "phrase":"died in weather related fatalities in 2016.  By deaths due to weather, we mean deaths due to lightning, tornadoes, hurricanes, wind, flood, rip currents, cold, winter, and heat."
	},
	"drownings":{
	    "usa":{
		"absolute":"4,000",
		"1_in_x":"1 out of every 81,000",
		"x_in_y":"12 out of every 1,000,000",
		"proportion":".000012",
		"percent":".0012",
		"probability":".0012",
	    },
	    "germany":{
		"absolute":"540",
		"1_in_x":"1 out of every 150,000",
		"x_in_y":"65 out of every 10,000,000",
		"proportion":".0000065",
		"percent":".00065",
		"probability":".00065",
	    },
	    "phrase":"died from drowning in 2016."
	},
	"murder":{
	    "usa":{
		"absolute":"17,000",
		"1_in_x":"1 out of every 19,000",
		"x_in_y":"53 out of every 1,000,000",
		"proportion":".000053",
		"percent":".0053",
		"probability":".0053",
	    },
	    "germany":{
		"absolute":"880",
		"1_in_x":"1 out of every 94,000",
		"x_in_y":"11 out of every 1,000,000",
		"proportion":".000011",
		"percent":".0011",
		"probability":".0011",
	    },
	    "phrase":"died from murder or non-negligent manslaughter in 2016. We refer to both murder and non-negligent manslaughter. Non-negligent manslaughter is any death caused by injuries received in a fight, argument, quarrel, assault or commission of a crime."
	},
	"cars":{
	    "usa":{
		"absolute":"23,000",
		"1_in_x":"1 out of every 14,000",
		"x_in_y":"69 out of every 1,000,000",
		"proportion":".000069",
		"percent":".0069",
		"probability":".0069",
	    },
	    "germany":{
		"absolute":"1,500",
		"1_in_x":"1 out of every 54,000",
		"x_in_y":"19 out of every 1,000,000",
		"proportion":".000019",
		"percent":".0019",
		"probability":".0019",
	    },
	    "phrase":"died as passenger car occupants in 2016.  Passenger cars include cars, pickup trucks, and SUVs."
	},
	"suicides":{
	    "usa":{
		"absolute":"44,000",
		"1_in_x":"1 out of every 7,400",
		"x_in_y":"14 out of every 100,000",
		"proportion":".00014",
		"percent":".014",
		"probability":".014",
	    },
	    "germany":{
		"absolute":"10,000",
		"1_in_x":"1 out of every 8,100",
		"x_in_y":"12 out of every 100,000",
		"proportion":".00012",
		"percent":".012",
		"probability":".012",
	    },
	    "phrase":"died from suicide in 2016."
	},
	"robbery":{
	    "usa":{
		"absolute":"580,000",
		"1_in_x":"1 out of every 560",
		"x_in_y":"18 out of every 10,000",
		"proportion":".0018",
		"percent":".18",
		"probability":".18",
	    },
	    "germany":{
		"absolute":"43,000",
		"1_in_x":"1 out of every 1,900",
		"x_in_y":"52 out of every 100,000",
		"proportion":".00052",
		"percent":".052",
		"probability":".052",
	    },
	    "phrase":"were robbery victims in COUNTRYN the past year.  By robbery we mean completed or attempted theft of property or cash, directly from a person, by force or threat of force, with or without a weapon, and with or without injury."
	},
	"cancer":{
	    "usa":{
		"absolute":"600,000",
		"1_in_x":"1 out of every 550",
		"x_in_y":"18 out of every 10,000",
		"proportion":".0018",
		"percent":".18",
		"probability":".18",
	    },
	    "germany":{
		"absolute":"230,000",
		"1_in_x":"1 out of every 360",
		"x_in_y":"28 out of every 10,000",
		"proportion":".0028",
		"percent":".28",
		"probability":".28",
	    },
	    "phrase":"died from any type of cancer in 2016.  In counting cancer deaths, we include all types of cancer."
	},
	"bankruptcies":{
	    "usa":{
		"absolute":"770,000",
		"1_in_x":"1 out of every 420",
		"x_in_y":"24 out of every 10,000",
		"proportion":".0024",
		"percent":".24",
		"probability":".24",
	    },
	    "germany":{
		"absolute":"95,000",
		"1_in_x":"1 out of every 860",
		"x_in_y":"12 out of every 10,000",
		"proportion":".0012",
		"percent":".12",
		"probability":".12",
	    },
	    "phrase":"filed for bankruptcy in 2016. By bankruptcy filings we mean non-business filings."
	},
	"cardio":{
	    "usa":{
		"absolute":"800,000",
		"1_in_x":"1 out of every 400",
		"x_in_y":"25 out of every 10,000",
		"proportion":".0025",
		"percent":".25",
		"probability":".25",
	    },
	    "germany":{
		"absolute":"360,000",
		"1_in_x":"1 out of every 230",
		"x_in_y":"43 out of every 10,000",
		"proportion":".0043",
		"percent":".43",
		"probability":".43",
	    },
	    "phrase":"died from cardiovascular disease in 2016. Cardiovascular disease includes: cerebrovascular disease or stroke, cholesterol, heart disease, and hypertension."
	},
	"deaths":{
	    "usa":{
		"absolute":"2,700,000",
		"1_in_x":"1 out of every 120",
		"x_in_y":"83 out of every 10,000",
		"proportion":".0083",
		"percent":".83",
		"probability":".83",
	    },
	    "germany":{
		"absolute":"920,000",
		"1_in_x":"1 out of every 89",
		"x_in_y":"11 out of every 1,000",
		"proportion":".011",
		"percent":"1.1",
		"probability":"1.1",
	    },
	    "phrase":"died in 2016.  This includes all causes of death."
	}
    }

//populate question data

f_country =
    {
	"usa":"the United States",
	"germany":"Germany"
    }

adj_country =
    {
	"usa":"U.S.",
	"germany":"German"
    }

pop_country = 
	{
	"usa": "325 million",
	"germany": "82 million"
	}
pop_country_numeric =
    {
	"usa": "325000000",
	"germany": "82000000"
    }

function main() {
    validate_forms();
    // create fake assignment id, hit id, and worker id if none provided
    if ($.url().attr('query') == "") {
	logger('creating fake assignment');
	var params = create_test_assignment();
	var query_str = window.location.pathname + '?' + $.param(params);
	window.history.pushState("", "", query_str);
    }

    // parse url parameters
    assignment_id = $.url().param('assignmentId');
    worker_id = $.url().param('workerId');
    hit_id = $.url().param('hitId');
    submit_to = $.url().param('turkSubmitTo');
    // disable below by setting equal to undefined
    format = $.url().param('format');
    
    // hide everything on the page
    hide_all();

    if (assignment_id == 'ASSIGNMENT_ID_NOT_AVAILABLE') {
	$('#preview').show();
	return;
    } else {
	if (format === undefined) {
	    format = 1 + Math.floor(Math.random() * (4))
	    if(format == 1){
		format = "absolute"
	    }
	    else if(format == 2){
		format = "1_in_x"
	    }
	    else if(format == 3){
		format="x_in_y"
	    }
	    else if(format == 4){
		format="percent"
	    }
	    /*
	    else if(format == 5){
		format="proportion"
	    }
	    else if(format == 6){
		format="probability"
	    }
	    */
	    //format = "absolute"
	    //format = "1_in_x"
	    //format = "x_in_y"
	    //format = "percent"
	    //format = "proportion"
	    //format = "probability"
	}
	logger(format)
    }
    // show consent form
    $('#consent').show();
    ts_consent_start = getDateTime();
}

// hides all divs
function hide_all() {
    $('#preview').hide();
    $('#consent').hide();
    $('#captcha').hide();
    $('#instructions').hide()
    $('#judgement_error').hide()
    $('#confidence').hide()    
    $('#confidence_error').hide()    
    $('#error_detection').hide();    
    $('#redirect-container').hide();
    $('#final_submit').hide()
}

function show_submit_page(){
    $('#final_submit').show()
    $('form#submit_to_turk').attr('action', submit_to + '/mturk/externalSubmit');
    var formats = {"x_in_y": "1",
		   "1_in_x": "2",
		   "absolute": "3",
		   "percent": "4",		   
		   "proportion": "5",
		   "probability": "6"
		  };
    logger('format is')
    logger(format)
    //parse ts_questions
    logger('assignment is')
    logger(assignment_id)
    ts_submitted = getDateTime();

    var options = ['drowning', 'cancer', 'murder', 'drug overdose', 'suicide'];
    options = shuffle(options);

    $.each(options, function(n, option) {
	var html = '<div class="radio"><label><input type="radio" name="screener" id="screener_' + 
	    option + '" value="' + 
	    option + '">death from ' + 
	    option + '</label></div>';
	$('#screener_row').append(html);
    });
    
    params = {
	assignmentId: assignment_id,
	workerId: worker_id,
	hitId: hit_id,
	country: country,
	recaptcha_response: recaptcha_response,
	recaptcha_success: recaptcha_success,
	displayed_question_stats: displayed_question_stats.join("|"),	
	judgement_order: questions.join("|"),
	judgements: judgements.join("|"),
	confidences: confidences.join("|"),
	ts_judgements: ts_judgements.join("|"),
	ts_confidences: ts_confidences.join("|"),
	row_numbers: row_numbers.join("|"),
	error_rates: error_rates.join("|"),
	ts_consent_start: ts_consent_start,
	ts_instruction_start: ts_instruction_start,	
	format_: formats[format], //if you change it to format instead of format_ this will break
	ts_submitted_: ts_submitted // if you change it to ts_submitted instead of ts_submitted_ this will break
    };
    logger(params)
    $.each(params, function (name, val) {
	$('form#submit_to_turk').append('<input type=hidden name="' + name + '" value="' + val + '" />');
    });
}

function show_next_survey_question(){
    hide_all();
    question_counter += 1
    logger(question_counter)

    if (question_counter >= questions.length){
	hide_all()
	show_submit_page();
    }    
    else{
	ts_q_start = getDateTime();
	ts_judgements.push(ts_q_start);
	//set the html in the error_detection div
	q = questions[question_counter]
	logger(q)
	row_number = 1 + Math.floor(Math.random() * (100)) // 1 - 100
	logger(row_number)
	real_answer = order[question_counter]
	logger(real_answer) //we should probably remove this in production TODO

	//push error rates and row numbers
	if (real_answer){
	    error_rates.push(1)
	    row_numbers.push(-999)
	}
	else{
	    error_rates.push(fake_question_statistics[row_number][q.toLowerCase()][country]['error_factor'])
	    row_numbers.push(row_number)
	}
	
	html = ''
	html += '<h2> <b>' + q + '</b></td>';
	html += '<h4> Out of the '
	html += pop_country[country]
	html += ' <span id="country_pop"></span> '
	html += 'people alive in '
	html += f_country[country]
	html += ' in 2016 ... </h4>'

	var phrase = question_statistics[q.toLowerCase()]['phrase'];
	var parts = phrase.split('. ');

	var first_sentence, second_sentence;
	if (parts.length > 1) {
	    first_sentence = parts.shift() 		
	    if (format != 'proportion' && format != 'probability'){
		first_sentence += '.';
	    }
	    else{
		first_sentence += ' ';
	    }
	    second_sentence = parts.join('. ');
	} else {
	    first_sentence = parts[0];
	    if (format == 'proportion' && format != 'probability'){
		first_sentence = first_sentence.slice(0, -1) + ' '
	    }
	    second_sentence = '';
	}
	html += '<li data-id=' + q.toLowerCase() + ' class=list-group-item>';
	html += '<table width="100%"><tr>';
	html += '<td width=20px align=left><span class="drag-handle" style = "display: none">↕</span></td>';
	//logger(format)
	//html += '<td width=100px><b>' + q + ':</b></td>';
	html += '<td>'	    
	var displayed_stat = ''

	if (format == 'absolute' || format == '1_in_x' || format == 'x_in_y'){
	    if (real_answer){
		html += question_statistics[q.toLowerCase()][country][format]+ ' of these people ' + first_sentence
		displayed_stat = question_statistics[q.toLowerCase()][country][format]
	    }
	    else{
		html += fake_question_statistics[row_number][q.toLowerCase()][country][format]+ ' of these people ' + first_sentence
		displayed_stat = fake_question_statistics[row_number][q.toLowerCase()][country][format]
	    }
	}
	else if (format == 'percent'){
	    if (real_answer){	    
		html += question_statistics[q.toLowerCase()][country][format]+ '% of these people ' + first_sentence
		displayed_stat = question_statistics[q.toLowerCase()][country][format]
	    }
	    else {
		html += fake_question_statistics[row_number][q.toLowerCase()][country][format]+ '% of these people ' + first_sentence
		displayed_stat = fake_question_statistics[row_number][q.toLowerCase()][country][format]
	    }
	}
	else if (format == 'probability'){
	    if (real_answer){	    
		html += 'the probability that one of these people, selected at random, ' + first_sentence + ' was ' + question_statistics[q.toLowerCase()][country][format] + '%'
	    }
	    else {
		html += 'the probability that one of these people, selected at random, ' + first_sentence + ' was ' + fake_question_statistics[row_number][q.toLowerCase()][country][format] + '%'
	    }
	}
	else if (format == 'proportion'){
	    if (real_answer){	    
		html += 'the proportion of these people who ' + first_sentence + 'was ' + question_statistics[q.toLowerCase()][country][format]
	    }
	    else{	    
		html += 'the proportion of these people who ' + first_sentence + 'was ' + fake_question_statistics[row_number][q.toLowerCase()][country][format]
	    }
	}
	if (second_sentence.length > 0){
	    html += '<a href=# data-toggle="tooltip" title="' + second_sentence + '"><sup>*</sup></a>';
	}

	displayed_question_stats.push(displayed_stat)
	
        html += '</td>';
        html += '</tr></table>';
	html += '</li>';

	html += '<br/>';	
	html = html.replace(/COUNTRYN/g, f_country[country]);
	html = html.replace(/COUNTRYADJ/g, adj_country[country]);
	
	html += '<form action="javascript:submit_judgement();" onSubmit="return validate_judgement();">'
	html += '<p> Does this risk level look correct or not? </p>'
	html += '<div class="radio"><label><input type="radio" name="judgement" id="low" value="low"> I think this is at least 10 times too small</label></div>'
	html += '<div class="radio"><label><input type="radio" name="judgement" id="correct" value="correct"> I think this is approximately correct</label></div>'
	html += '<div class="radio"><label><input type="radio" name="judgement" id="high" value="high"> I think this is at least 10 times too large</label></div>'
	html += '<p>Please do not look up the answers on the internet. <b>We are only interested in your best guess</b>.</p>'
	html += '<div id="judgement_error" class="error-message"></div>'
	html += '<center><input type="submit" id="submit_judgement" name="submit" value="Continue" class="btn btn-default"></center><br>'
	html += '</form>'
	$('#show_risk').html(html)
	$('#judgement_error').hide()
	$('#confidence').hide()
	$('#show_risk').show()	
	//show the div
	$('#error_detection').show();

	logger('got here')
    }
}
function validate_judgement(){
    //confirm that one of the two radio boxes are checked
    if (!$("input[name='judgement']:checked").val()) {
	$('#judgement_error').html('You must choose one of the options above.')
	$('#judgement_error').show()
	return false;
    }
    $('#judgement_error').hide()
    $('#low,#correct,#high').attr('disabled', true);
    return true;
}

function submit_judgement(){
    //log answer to judgement question
    var radios = document.getElementsByName('judgement');
    judgements.push($("input[name='judgement']:checked").val())

    //log confidences
    ts_c_start = getDateTime();    
    ts_confidences.push(ts_c_start);    
    //hide judgement question
    //$('#show_risk').hide()
    $('#submit_judgement').hide();
    
    //show confidence question
    /*
    html = ''
    html += '<form action="javascript:submit_confidence();" onSubmit="return validate_confidence();">'
    html += '<p> How confident are you that your decision is correct? </p>'
    html += '<input type="radio" name="confidence" id="50" value="50"> 50% confident - I would expect to get 50% of questions like this correct <br>'
    html += '<input type="radio" name="confidence" id="60" value="60"> 60% confident - I would expect to get 60% of questions like this correct <br>'
    html += '<input type="radio" name="confidence" id="70" value="70"> 70% confident - I would expect to get 70% of questions like this correct <br>'
    html += '<input type="radio" name="confidence" id="80" value="80"> 80% confident - I would expect to get 80% of questions like this correct <br>'
    html += '<input type="radio" name="confidence" id="90" value="90"> 90% confident - I would expect to get 90% of questions like this correct <br>'
    html += '<input type="radio" name="confidence" id="100" value="100"> 100% confident - I would expect to get 100% of questions like this correct <br>'    
    html += '<input type="submit" name="submit" value="Submit"> <br>'
    html += '</form>'
    $('#confidence').html(html)
    */

    // short circuiting this, as we've decided to take out confidence ratings
    // $('#confidence').show()
    show_next_survey_question();
}
function validate_confidence(){

    if(!$("input[name='confidence']:checked").val()) {
	$('#confidence_error').html('You must choose one of the options above.')
	$('#confidence_error').show()
	return false;
    }
    $('#confidence_error').hide()
    return true;
}
function submit_confidence(){
    confidences.push($("input[name='confidence']:checked").val());

    $("input[name='confidence']").prop('checked', false);

    //show the next judgement question
    show_next_survey_question()
}
function validate_forms() {
    // set error message placement
    $.validator.setDefaults({
	errorPlacement: function(error, element) {
	    if (element.next().prop('tagName') == 'SELECT')
		error.insertAfter(element.next());
	    else if (element.attr('type') === 'radio')
		error.appendTo(element.parent());
	    else
		error.insertAfter(element);
	}
    });

    $('#consent_form').validate({
	rules: {
	    consent_checkbox: {
		required: true
	    }
	}
    });

    $('#instructions_form').validate({
		rules: {
			instructions_checkbox: {
			required: true
			}
		}
	});
}


function submit_consent() {
    $('#consent').slideUp(function() {
	ts_instruction_start = getDateTime();
    });
    hide_all()
    $('#captcha').show();
}

function submit_captcha() {
    $('#consent').slideUp(function() {
	ts_instruction_start = getDateTime();
    });
    hide_all()
    $('#instructions').show();
}

function submit_instructions(){
    $('#instructions').slideUp(function() {
    });
    
    show_next_survey_question();
}
// generate fake assignment_id, worker_id, and hit_id
function create_test_assignment() {
    var characters = 'ABCDEFGHIJoKLMNOPQRSTUVWXYZ0123456789';
    characters = characters.split('');

    suffix = shuffle(characters).slice(0, 12).join('');

    return {assignmentId: 'ASSIGNMENT_' + suffix,
	    hitId: 'HIT_' + suffix,
	    turkSubmitTo: 'https://workersandbox.mturk.com',
	    workerId: 'WORKER_' + suffix};
}

function verifyRecaptchaCallback(g_recaptcha_response) {
    //console.log('frontend response');

    // store to global
    recaptcha_response = g_recaptcha_response;

    var post_data = {'g-recaptcha-response': g_recaptcha_response};
    //console.log(post_data);

    $.post('captcha.php', post_data, function( data ) {
	// were we successful?
	//console.log('backend response');
	//console.log(data);
	if (data == "success") {
	    recaptcha_success = true;

	    var html = '<center><input type=submit id=submit_captcha value=Continue class="btn btn-default" /></center>';
	    $('#submit_captcha_row').html(html);
	}
    });
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

function shuffle(n){for(var t,e,r=n.length;r;)e=0|Math.random()*r--,t=n[r],n[r]=n[e],n[e]=t;return n}
