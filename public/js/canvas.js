import {line_ev} from "./line_ev.js"

d3.line_ev = line_ev;

var aggregate_data;
var options = { verbose: true,
                agg_points: true,
                update_feedback: true };
var chart;

//var text_feedback_initial = document.getElementById("textFeedback").innerHTML

var show_agg = true;

//var feedback_call = feedback_options[2].call;

export function make_experiment(dataset) {
  d3.select("svg").selectAll("*").remove();
  d3.select("#canvasSubmit").attr("disabled", false);

  d3.csv(dataset.true_values,
    _.partial(parse_row, dataset),
    function(error, actual_data) {
      var true_values = _.zip(_(actual_data).map(dataset.x_prop).value(),
      _(actual_data).map(dataset.y_prop).value());
      chart = new d3.line_ev(true_values, aggregate_data, dataset, options);
      chart.render_chart(960, 500, d3.select("svg"));
      d3.select("#canvasClear").on("click", function () {
        d3.select("#canvasSubmit").attr("disabled", false);
        d3.select("svg").selectAll("*").remove();
        d3.selectAll('.feedback a').attr("class", "abled")
        d3.selectAll('.show_agg a').attr("class", "abled")
        document.getElementById('canvasSubmit').innerHTML = "I'm done"
        make_experiment(dataset);
      });
    });
};

export function collect_user_guess() {
  return chart.user_guess_to_data()
}

function populate_list(id, items, onclick) {
  d3.select("#" + id)
    .append("ul")
    .classed("nav nav-pills mode-switch", true)
    .selectAll("." + id)
    .data(items)
    .enter()
    .append("li")
    .classed("switch-measurement " + id, true)
    .classed("active", function(d, i) { if (id =="feedback") {return i === 2;} else {return i === 0;}})  // First entry is active by default
    .append("a")
    .on("click", onclick)
    .html(function (d) { return d.display; });
}

// populate_list("datasource", datasets, function (d) {
//     d3.selectAll(".datasource").classed("active", false);
//     d3.select(this.parentNode).classed("active", true);
//     d3.select("svg").selectAll("*").remove();
// 	document.getElementById("dataDescriptor").innerHTML = "";
// 	document.getElementById("textFeedback").innerHTML = text_feedback_initial
// 	document.getElementById('feedbackDiv').style.display = "none"
//   document.getElementById('feedbackLegend').innerHTML = "";
//   d3.selectAll('.feedback a').attr("class", "abled")
//   d3.selectAll('.show_agg a').attr("class", "abled")
//    document.getElementById('canvasSubmit').innerHTML = "I'm done"
//     make_experiment(d);
//   });

// populate_list("feedback", feedback_options, function (d) {
//     d3.selectAll(".feedback").classed("active", false);
//     d3.select(this.parentNode).classed("active", true);
//     feedback_call = d.call;
//     // draw_feedback();
//  });

function parse_row(dataset, row) {
  row[dataset.x_prop] = +row[dataset.x_prop];
  row[dataset.y_prop] = +row[dataset.y_prop];
	return row;
}
