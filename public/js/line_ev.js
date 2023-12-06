export function line_ev (true_values, aggregate_values, dataset, options) {
/**
 * Line Chart for Expectation Visualization.
 * @param {Array} true_values An array of pairs [[x1, y1], [x2, y2], ...] corresponding
 *  to the true values. See below note on how to access this data.
 * @param aggregate_values An array of array of paris, with each subject being an outer array,
 *  and each inner array corresponding to an array of guess pairs: [[1776 4] [1777 6]]
 * @param {Object} dataset Data pertaining to the processing and display of the
 *  true_values.
 * @param {Object} options A set of options to change how the chart is displayed.
 *    demo {boolean} default false. If true will create a chart suitable for background.
 *    agg_points {boolean} default false. If true will create a circle at each aggregate point.
 *
 * An important note about how values may be represented.
 * There are two ways we represent values here:
 *  1) As a javascript object, where the keys are x values, and values are
 *     y values. In the CO2 example x is years, y is tons of carbon.
 *  2) As an array of pairs: [[x1 y1], [x2 y2], ...]. For the CO2 example
 *     xn will be the years, yn will be tons of carbon.
 * You can easily switch between these two representations using lodash,
 * (https://lodash.com/docs) specifically the _.toPairs and _.fromPairs method.
 * Note that the _.toPairs will result in x1 being a string, which might not be
 * desireable. If so, feel free to use convert_obj_to_array.
 *
 * Useful tips for dealing with the array of pairs:
 *  1) To extract all the x values from true_value you can do: _(true_values).map(0).value()
 *  2) Extract y values: _(true_values).map(1).value()
 *
 * Second, be aware of the various coordinate systems we are dealing with:
 * 1) SVG space. Note that for SVG the upper left is (0,0). This will be the
 *    result of a mouse onclick() call.
 * 2) Chart space. Basically SVG space minus the margins. When using the x or y
 *    scales (e.g. x.invert()) you are operating in chart space. Use the
 *    svg_to_chart function to switch between these two spaces.
 */
  var MARGIN_DEFAULT = {top: 20, right: 20, bottom: 30, left: 80};
  var opts = _.merge({
    verbose: false,
    update_feedback: false,
    agg_points: false,
	agg_fade: false,
	agg_animate: false,
    demo : false},
    options);
  var line_ev = {};
  var x;
  var y;
  var xAxis = null;
  var yAxis = null;
  var margin = MARGIN_DEFAULT;
  var svg = null;
  var xTicks = null;
  var x_coordinates = null;
  var user_guess = null;
  var clicked = false;
  var chart_height;
  var chart_width;
  var LEFT_BUTTON = 0;
  var MIDDLE_BUTTON = 1;
  var RIGHT_BUTTON = 2;
  var can_edit = true;
  var indexed_data = [];
  line_ev.user_done = false; // true if a user has guessed for all data points
  line_ev.last_feedback = null;

  var user_guess_slope = null;
  var actual_data_slope = null;
  var line_feedbacks = {
	  "0" : ["Excellent!", "Well done!", "Super impressive!"], // over 90% of the inflextion slopes are correct.
	  "1" : ["You did pretty good.", "Not too shabby.", "Close but no cigar."], // over 50%
	  "2" : ["Not bad.", "Not quite there yet.", "Better than bad but worse than good."], // 33%
	  "3" : ["Hm. Not so good.", "Seems like you were a ways off.", "I think you need more training, grasshopper."] // less 1/3
	}

  //TODO: Create screen<->chart conversion functions
  var guess_line = d3.svg.line()
    //.curve(d3.curveCardinal)
    //.interpolate(d3.curveCardinal)
    .interpolate("cardinal")
    .x(function(d) { return d[0]; })
    .y(function(d) { return d[1]; });

  function svg_to_chart(pt) {
    return [pt[0] - margin.left, pt[1] - margin.top];
  }

  document.onmousedown = function(e) {
    if (e.button == LEFT_BUTTON) {
      //e.preventDefault();
      clicked = true;
    }
  };

  document.onmouseup = function(e) {
    if (e.button == LEFT_BUTTON) {
      clicked = false;
    }
  };

  function type(n) { return typeof(n);}

  line_ev.render_chart = function (total_width, total_height, elem) {
    if (opts.verbose) {
      console.log("\n==== Render Chart: " + dataset.display + " ===");
      console.log("First data point: " + true_values[0] +"\t" + true_values[0].map(type));
    }
    chart_width = total_width - margin.left - margin.right;
    chart_height = total_height - margin.top - margin.bottom;

    x = d3.scale.linear()
        .range([0, chart_width])
        //.ticks(20);

    y = d3.scale.linear()
        .range([chart_height, 0]);

    xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    svg = elem;
    svg = svg.attr("width", total_width)
       .attr("height", total_height)
       .on("mousemove", function() { if (clicked) { tick(d3.mouse(this));} })
       .on("click", function() { tick(d3.mouse(this)); })
       .append("g")
       .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    x.domain(d3.extent(_(true_values).map(0).value()));
    y.domain(d3.extent(_(true_values).map(1).value()));

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + chart_height + ")")
        .call(xAxis.tickFormat(d3.format()))
        .append("text")
        .attr("x", total_width - 70)
        .attr("y", -5)
        .style("text-anchor", "end")
        .text(dataset.x_label);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text(dataset.y_label);

  	if (opts.demo) {
  		svg.append("rect")
  			.attr("width", "100%")
  			.attr("height", "100%")
  			.attr("fill", "#f2f2f2");
  	}

  	if (opts.demo === false) {
  		svg.append("g")
  			.attr("class", "grid")
  			.attr("transform", "translate(0," + chart_height + ")")
  			.call(xAxis
  				.tickSize(-chart_height, 0, 0)
  				.tickFormat("")
  			);

  		svg.append("g")
  			 .attr("class", "grid")
  			 .call(yAxis
  				 .tickSize(-chart_width, 0, 0)
  				 .tickFormat("")
  			 );
  	}

    svg.append("path").attr("class", "line");

    // user_guess = init_user_data(_(true_values).map(0).value().map(x))
    // user_guess_minx = _.minBy(Object.keys(user_guess), function(key) { return parseFloat(key); })
    // user_guess_maxx = _.maxBy(Object.keys(user_guess), function(key) { return parseFloat(key); })
    // user_guess[user_guess_minx] = y(y.domain()[0] + (y.domain()[1] - y.domain()[0]) / 2)
    // user_guess[user_guess_maxx] = user_guess[user_guess_minx]
    x_coordinates =_(true_values).map(0).value().map(x);
    var minx = Math.min(...x_coordinates);
    var maxx = Math.max(...x_coordinates);
    user_guess = {};
    user_guess[minx] = y(y.domain()[0] + (y.domain()[1] - y.domain()[0]) / 2);
    user_guess[maxx] = user_guess[minx];
    line_ev.update(convert_obj_to_array(user_guess));
  };

  line_ev.reset = function() {
    can_edit = true;
    clear(user_guess);
    svg.selectAll(".comparisonLine").remove();
    d3.select("#canvasSubmit").attr("disabled", "disabled");
    line_ev.user_done = false;
    can_edit = true;
    return convert_obj_to_array(user_guess);
  };

  line_ev.disable_edit = function() {
    can_edit = false;
  };

  line_ev.update = function (data) {
    var points = svg.selectAll(".group-points").data(data, function(d) { return d[0]; });
    points.enter()
          .append("g")
          .attr("class", "group-points")
          .append("circle")
          .attr("r", 2)
          .attr("class", "points");

    points.select("circle")
          .attr("cx", function (d) { return d[0]; })
          .attr("cy", function (d) { return d[1]; });

    points.exit().remove();

    d3.select(".line").attr("d", guess_line(data));
  };

  /* Takes raw user guesses, matches them to the nearest ticks, converts from chart to input data,
   and returns array pairs [[1700 1934], [1880 2333], ...]  of results suitable for comparing to the
   input data */
  line_ev.user_guess_to_data = function() {
    var g = convert_obj_to_array(user_guess);
    g = _.unzip(g);
    var xs = g[0].map(x.invert); // Convert chart coordinates to data x values (e.g. years)
    var ys = g[1].map(y.invert); // Convert chart coordinates to data y values (e.g. co2)
    return _.zip(xs, ys); // Zip em up and sort according to x value!
  }

  // line_ev.draw_actual = function() {
  //   line_ev.disable_edit()
  //   var indices =  data_to_ticks(true_values, x.ticks(), false);
  //   indexed_data = index_data(true_values, indices, false);

  //   var path = svg.append("path")
  //   .datum(indexed_data)
		// .attr("class", "comparisonLine")
		// .attr("d", actual_line(indexed_data));

		// var totalLength = path.node().getTotalLength();

		// path.attr("stroke-dasharray", totalLength + ' ' + totalLength)
		// 	.attr("stroke-dashoffset", totalLength)
		// 	.transition()
		// 		.duration(4000)
		// 		.ease("linear")
		// 		.attr('stroke-dashoffset', 0);
  // };

  line_ev.noFeedback = function() {

  }

  function getStringForPoint(direction, bufferX, bufferY) {
    var pointArrayUp = [10,3,0,10,0,14,10,7,20,14,20,10];
    var pointArrayDown = [0,3,0,7,10,14,20,7,20,3,10,10];
    var thisArray;
    if (direction == "p") {
      thisArray = pointArrayUp;
    } else {
      thisArray = pointArrayDown;
    }
    var finalPointString = '';
    for (i = 0; i < thisArray.length; i++) {
        if (i === 0) {
          finalPointString += (parseFloat(thisArray[i]) + bufferX);
        }
        else if (i % 2 === 0) {
          finalPointString += " " + (parseFloat(thisArray[i]) + bufferX);
        } else {
          finalPointString += "," + (parseFloat(thisArray[i]) + bufferY);
        }
    }
    return finalPointString;
  }

  function tick(pt) {
    if (can_edit === false)
      return;

      /* Ticks are generated in SVG space */
    pt = svg_to_chart(pt);
    //console.log(d3.keys(user_guess))
    pt[0] = find_closest(x_coordinates, pt[0]);
    pt[1] = Math.min(pt[1], chart_height);
    pt[1] = Math.max(pt[1], margin.top);
    user_guess[pt[0]] = pt[1];

    d3.select("#canvasSubmit").attr("disabled", null);

    return line_ev.update(convert_obj_to_array(user_guess));
  }

  /* Set all values to null on an object */
  function clear(obj) {
    for (var key in obj) {
      if (!obj.hasOwnProperty(key)) continue;
      obj[key] = null;
    }
  }

  /* Given an array of values (haystack) [x1, x2,  ...] and a target
     value (needle) x, return the nearest x value from haystack */
  function find_closest(haystack, needle) {
    var dist = haystack.map(function (n, idx) { return [Math.abs( needle - n ), n];});
    dist.sort(function (a, b) {
      if (a[0] < b[0]) {
        return -1;
      } else if (a[0] > b[0]) {
        return 1;
      } else {
        return 0;
      }
    });
      return dist[0][1];
  }

  // function init_user_data(ticks) {
  //   var user_guess = {};
  //   ticks.forEach(function (n) {
  //     user_guess[n] = null;
  //   });
  //   return user_guess;
  // }

  /* Covert an object to a array of arrays: {k1:v1, k2:v2} -> [[k1 v1], [k2 v2]] */
  function convert_obj_to_array(obj) {
    return d3.zip(d3.keys(obj).map(parseFloat),
                  d3.values(obj)).filter(function (n) { return n[1] !== null;})
            .sort((a, b) => {return a[0] - b[0];});
  }

  function data_to_ticks(data, ticks, values_are_nested) {
  	var indices_out = [];
  	var data_to_scan = data;
  	if (values_are_nested) {
  		data_to_scan = data.values;
  	}
  	for (var i = 0; i < data_to_scan.length; i++) {
  		var current = data_to_scan[i];
  		if (ticks.indexOf(Number(current[0])) >= 0) {
  			indices_out.push(i);
  		}
  	}
  	return indices_out;
  }

  function index_data(data, indices, is_aggregate) {
  	var values_out = [];
  	if (is_aggregate) {
  		data.forEach(function (n) {
  			var output = n;
  			var current = output.values;
  			var current_out = [];
  			indices.forEach(function (m) {
  				current_out.push(current[m]);
  			});
  			output.values = current_out;
  			values_out.push(output);
  		});
  	}
  	else {
  		indices.forEach(function (n) {
  		  values_out.push(data[n]);
  		});
  	}
  	return values_out;
  }

  function get_break_indices(data, break_points) {
	  var indices = [];
	  var haystack = [];
    // Note: this likely could be haystack = _(data).map(0).value();
	  for (var i = 0; i < data.length; i++) {
		  haystack.push(data[i][0]);
	  }

	  for (var i = 0; i < break_points.length; i++) {
		  indices.push(haystack.indexOf(find_closest(haystack, break_points[i])));
	  }
	  return indices;
  }

  return line_ev;
}