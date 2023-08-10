   
   const FSVGTOCODE_VERSION = "0.1.5";
   
   // State-class
   class State {

    constructor() {
      this.toolDown = false;
      this.toolDown_x = 0.0;
      this.toolDown_y = 0.0;
      this.inSubpath = false;
      this.cur_x = 0.0;
      this.cur_y = 0.0;
      this.gcode = [];
      this.nextCode = "";
      this.lastCode = "";
      this.last_x2 = 0.0;
      this.last_y2 = 0.0;

      this.min_x = 99999.0;
      this.min_y = 99999.0;
      this.max_x = -99999.0;
      this.max_y = -99999.0;

      this.segments = 20;
      this.DEBUG = true;
      this.scale_x = 1.0;
      this.scale_y = 1.0;
      this.offset_x = 0.0;
      this.offset_y = 0.0;

      this.local_scale_x = 1.0;
      this.local_scale_y = 1.0;
      this.local_offset_x = 0.0;
      this.local_offset_y = 0.0;
      this.local_invert_x = false;
      this.local_invert_y = false;
      this.local_matrix = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0];

      this.gcode_tool_down = "M3 S1000";
      this.gcode_tool_up = "M5";
      this.gcode_init="G01 E0\nG21 ;Millimeter Units\nG90 ;Absolute Positioning";
    }

    setToolDownGcode(gcode) {
      this.gcode_tool_down = gcode;
    }

    setToolUpGcode(gcode) {
      this.gcode_tool_up = gcode;
    }

    setInitGcode(gcode) {
      this.gcode_init = gcode;
    }
  }



  function toolDown(state, x, y) {
    if(!state.toolDown_state) {
      state.gcode.push(state.gcode_tool_down);
      state.toolDown_state = true;
      state.toolDown_x = x;
      state.toolDown_y = y;
    }      
    return state.gcode;
  }

  function toolUp(state, x, y) {
    if(state.toolDown_state) {
      state.gcode.push(state.gcode_tool_up);
      state.toolDown_state = false;
    }
    return state.gcode;
  }
  function parseCoords(d, pos, num=2) {
    coords = d[pos].split(',');    
    let coord = [];
    if(coords.length < 2 && num == 2) {
      if(d.length >= pos+2) {
        coord.push(parseFloat(d[pos++].trim()));
        coord.push(parseFloat(d[pos++].trim()));
      } else {
        coord.push(parseFloat(d[pos++].trim()));
      }
    }
    else {
      pos++;
      for(let i = 0; i < coords.length; i++) {
        coord.push(parseFloat(coords[i].trim()));
      }
    }
    return [coord,pos];
  }

  function trimFixed(num) {
    num = num.toFixed(16);
    while(num.includes(".") && (num.endsWith("0") || num.endsWith("."))) {
      num = num.substring(0, num.length-1);
    }
    return num;
  }

  function addGcode(state, code, x, y, extra="") {
    let x_temp = parseFloat(x);
    let y_temp = parseFloat(y);
    
    if(state.local_invert_x) x_temp *= -1;
    if(state.local_invert_y) y_temp *= -1;

    x_temp *= (state.scale_x * state.local_scale_x);
    y_temp *= (state.scale_y * state.local_scale_y);

    x_temp += state.offset_x + state.local_offset_x;
    y_temp += state.offset_y + state.local_offset_y;
    
/*
    let matrix = state.local_matrix;

    x_temp = matrix.a*x_temp + matrix.c*y_temp + matrix.e;
    y_temp = matrix.b*x_temp + matrix.d*y_temp + matrix.f;

    x_temp *= state.scale_x;
    y_temp *= state.scale_y;
    x_temp += state.offset_x;
    y_temp += state.offset_y;
*/
    //if(x_temp.toString().includes("e")) x_temp = trimFixed(x);
    //if(y_temp.toString().includes("e")) y_temp = trimFixed(y);

    if(x_temp < state.min_x) state.min_x = x_temp;
    if(y_temp < state.min_y) state.min_y = y_temp;
    if(x_temp > state.max_x) state.max_x = x_temp;
    if(y_temp > state.max_y) state.max_y = y_temp;

    state.gcode.push(code + " X" + x_temp.toFixed(4) + " Y" + y_temp.toFixed(4) +((extra!="")?" " + extra:""));
    return state.gcode;
  }

  function parsePathD(state, d) {
    d = d.trim();
    d = d.split(/[\s]+/g);
    for(var i = 0; i < d.length; i++) {
      d[i] = d[i].trim();
    }

    //console.log(d);
    let pos = 0;

    let done = false;


    state.cur_x = 0.0; 
    state.cur_y = 0.0;
    let coord = [];
    state.nextCode = "";
    state.lastCode = "";
    state.last_x2 = 0.0;
    state.last_y2 = 0.0;

    state.toolDown_state = false;
    state.toolDown_x = 0.0;
    state.toolDown_y = 0.0;

    while(pos < d.length && !done) {
      state.inSubpath = (!isNaN(d[pos][0]) || d[pos][0] == '-');
      var type = state.inSubpath?state.nextCode:d[pos++];
      if(state.inSubpath && state.lastCode.toLowerCase() == "m" && type.toLowerCase() == "l") state.inSubpath = false;
      if(state.DEBUG) state.gcode.push(";Type: " + type + " Scale: " + state.local_scale_x.toFixed(3) + ", " + state.local_scale_y.toFixed(3) + " Offset: " + state.local_offset_x.toFixed(3) + ", " + state.local_offset_y.toFixed(3));      
      switch(type) {
        case "M":
        case "m":
          state.gcode = toolUp(state, state.cur_x, state.cur_y);
          [coord,pos] = parseCoords(d,pos);
          if(type == "M") {
            state.cur_x = coord[0];
            state.cur_y = coord[1];
          } else {
            state.cur_x += coord[0];
            state.cur_y += coord[1];
          }            
          state.gcode = addGcode(state,"G0", state.cur_x, state.cur_y);
          state.nextCode = (type == "M")?"L":"l";
          break;
        case "L":
        case "l":
          state.gcode = toolDown(state, state.cur_x, state.cur_y);
          [coord,pos] = parseCoords(d,pos);            
          if(type == "L") {
            state.cur_x = coord[0];
            state.cur_y = coord[1];
          } else {
            state.cur_x += coord[0];
            state.cur_y += coord[1];
          }
          
          state.gcode = addGcode(state,"G1", state.cur_x, state.cur_y);
          state.nextCode = type;
          break;
        case "H":
        case "h":
          state.gcode = toolDown(state, state.cur_x, state.cur_y);
          [coord,pos] = parseCoords(d,pos, 1);            
          if(type == "H") state.cur_x = coord[0];
          else  state.cur_x += coord[0]; 
          state.gcode = addGcode(state,"G1", state.cur_x, state.cur_y);
          state.nextCode = type;
          break;
        case "V":
        case "v":
          state.gcode = toolDown(state, state.cur_x, state.cur_y);
          [coord,pos] = parseCoords(d,pos, 1);
          if(type == "V") state.cur_y = coord[0];
          else  state.cur_y += coord[0];
          state.gcode = addGcode(state,"G1", state.cur_x, state.cur_y);
          state.nextCode = type;
          break;
        case "Z":
        case "z":
          state.gcode = addGcode(state,"G1",state.toolDown_x, state.toolDown_y);
          state.cur_x = state.toolDown_x;
          state.cur_y = state.toolDown_y;
          break;
        case "C": // Cubic Bezier curve
        case "c":
          state.gcode = toolDown(state, state.cur_x, state.cur_y);
          // coords now has start control point, end control point, end point
          // we need to convert the bezier curve to a series of line segments
          // we'll use 10 segments for now
          var x_start = state.cur_x;
          var y_start = state.cur_y;
          
          [coord,pos] = parseCoords(d,pos);
          var x1 = coord[0];
          var y1 = coord[1];
          [coord,pos] = parseCoords(d,pos);
          var x2 = coord[0];
          var y2 = coord[1];
          [coord,pos] = parseCoords(d,pos);
          var x_end = coord[0];
          var y_end = coord[1];

          if(type == "c") { // relative
            x1 += state.cur_x;
            y1 += state.cur_y;
            x2 += state.cur_x;
            y2 += state.cur_y;
            x_end += state.cur_x;
            y_end += state.cur_y;
          }

          if(state.DEBUG) {
            state.gcode.push(";Cubic Bezier Curve");
            state.gcode.push(";Start: " + x_start + ", " + y_start);
            state.gcode.push(";Control 1: " + x1 + ", " + y1);
            state.gcode.push(";Control 2: " + x2 + ", " + y2);
            state.gcode.push(";End: " + x_end + ", " + y_end);
          }

          var t = 0.0;           
        
          var dt = 1.0/state.segments;
          var x_last = x_start;
          var y_last = y_start;
          for(var i = 0; i < state.segments; i++) {
            t += dt;
            var x_temp = (1-t)*(1-t)*(1-t)*x_start + 3*(1-t)*(1-t)*t*x1 + 3*(1-t)*t*t*x2 + t*t*t*x_end;
            var y_temp = (1-t)*(1-t)*(1-t)*y_start + 3*(1-t)*(1-t)*t*y1 + 3*(1-t)*t*t*y2 + t*t*t*y_end;
            state.gcode = addGcode(state,"G1", x_temp,y_temp);
            x_last = x_temp;
            y_last = y_temp;
          }

          state.last_x2 = x2;
          state.last_y2 = y2;
          state.cur_x = x_end;
          state.cur_y = y_end;

          if(state.DEBUG) state.gcode.push(";Cubic Bezier Curve Done");
          
          state.nextCode = type;
          
          break;
        case "Q": // Bezier curve
        case "q":
          state.gcode = toolDown(state, state.cur_x, state.cur_y);
          // coords now has start control point, end point
          // we need to convert the bezier curve to a series of line segments
          // we'll use 10 segments for now
          var x_start = state.cur_x;
          var y_start = state.cur_y;

          [coord,pos] = parseCoords(d,pos);
          var x1 = coord[0];
          var y1 = coord[1];
          [coord,pos] = parseCoords(d,pos);
          var x_end = coord[0];
          var y_end = coord[1];
          if(type == "q") { // relative
            x1 += state.cur_x;
            y1 += state.cur_y;
            x_end += state.cur_x;
            y_end += state.cur_y;
          }
          var t = 0.0;           

          var dt = 1.0/state.segments;
          var x_last = x_start;
          var y_last = y_start;
          for(var i = 0; i < state.segments; i++) {
            t += dt;
            var x_temp = (1-t)*(1-t)*x_start + 2*(1-t)*t*x1 + t*t*x_end;
            var y_temp = (1-t)*(1-t)*y_start + 2*(1-t)*t*y1 + t*t*y_end;
            state.gcode = addGcode(state,"G1", x_temp,y_temp);
            x_last = x_temp;
            y_last = y_temp;
          }

          state.cur_x = x_end;
          state.cur_y = y_end;

          state.nextCode = type;            
          break;
        case "S": // Smooth curve
        case "s":
          state.gcode = toolDown(state, state.cur_x, state.cur_y);
          // coords now has end control point, end point
          // we need to convert the bezier curve to a series of line segments
          // we'll use 10 segments for now
          var x_start = state.cur_x;
          var y_start = state.cur_y;

          [coord,pos] = parseCoords(d,pos);
          var x2 = coord[0];
          var y2 = coord[1];
          [coord,pos] = parseCoords(d,pos);
          var x_end = coord[0];
          var y_end = coord[1];
          if(type == "s") { // relative
            x2 += state.cur_x;
            y2 += state.cur_y;
            x_end += state.cur_x;
            y_end += state.cur_y;
          }
          var x1 = x_start;
          var y1 = y_start;

          // If previous point was smooth or cubic, use previous control point
          if(state.lastCode == "S" || state.lastCode == "s" || state.lastCode == "C" || state.lastCode == "c") {
            // reflect previous control point
            x1 = 2*x_start-state.last_x2;
            y1 = 2*y_start-state.last_y2;
          }
          if(state.DEBUG) {
            state.gcode.push(";Smooth Cubic Bezier Curve");
            state.gcode.push(";Start: " + x_start + ", " + y_start);
            state.gcode.push(";Control 1: " + x1 + ", " + y1);
            state.gcode.push(";Control 2: " + x2 + ", " + y2);
            state.gcode.push(";End: " + x_end + ", " + y_end);
          }
          state.last_x2 = x2;
          state.last_y2 = y2;

          var t = 0.0;           

          var dt = 1.0/state.segments;
          var x_last = x_start;
          var y_last = y_start;
          for(var i = 0; i < state.segments; i++) {
            t += dt;
            var x_temp = (1-t)*(1-t)*(1-t)*x_start + 3*(1-t)*(1-t)*t*x1 + 3*(1-t)*t*t*x2 + t*t*t*x_end;
            var y_temp = (1-t)*(1-t)*(1-t)*y_start + 3*(1-t)*(1-t)*t*y1 + 3*(1-t)*t*t*y2 + t*t*t*y_end;
            state.gcode = addGcode(state,"G1", x_temp,y_temp);
            x_last = x_temp;
            y_last = y_temp;
          }
          state.nextCode = type;

          state.cur_x = x_end;
          state.cur_y = y_end;
          
          break;
          case "A": // Arc
          case "a":

            // ToDo: Implement proper arc
            state.gcode.push(";Arc");

            state.gcode = toolDown(state, state.cur_x, state.cur_y);
            // coords now has rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, end point
            // we need to convert the arc to a series of line segments
            // we'll use 10 segments for now
            var x_start = state.cur_x;
            var y_start = state.cur_y;

            [coord,pos] = parseCoords(d,pos);
            var rx = coord[0];
            var ry = coord[1];
            var x_axis_rotation = d[pos++];
            var large_arc_flag = d[pos++];
            var sweep_flag = d[pos++];

            state.gcode.push(";rx: " + rx + ", ry: " + ry + ", x-axis-rotation: " + x_axis_rotation + ", large-arc-flag: " + large_arc_flag + ", sweep-flag: " + sweep_flag);

            [coord,pos] = parseCoords(d,pos);
            var x_end = coord[0];
            var y_end = coord[1];


            if(type == "a") { // relative
              x_end += state.cur_x;
              y_end += state.cur_y;
            }
            var t = 0.0;
            var dt = 1.0/state.segments;
            var x_last = x_start;
            var y_last = y_start;
            for(var i = 0; i < state.segments; i++) {
              t += dt;
              var x_temp = (1-t)*x_start + t*x_end;
              var y_temp = (1-t)*y_start + t*y_end;
              state.gcode = addGcode(state,"G1", x_temp,y_temp);
              x_last = x_temp;
              y_last = y_temp;
            }

            state.cur_x = x_end;
            state.cur_y = y_end;
            state.nextCode = type;              
            break;
        default:
         console.log("Command not found: pos " +pos + " type " + type + " prev " + d[pos-2] + " next " + d[pos-1] +  " " + d[pos]);
         done = true;
      }
      state.lastCode = type;
    }
    state.gcode = toolUp(state, state.cur_x, state.cur_y);
    return state.gcode;
  }


  function processConfig(state, config) {
    if(config.hasOwnProperty("tool_down_gcode")) state.setToolDownGcode(config.tool_down_gcode);
    if(config.hasOwnProperty("tool_up_gcode")) state.setToolUpGcode(config.tool_up_gcode);
    if(config.hasOwnProperty("init_gcode")) state.setInitGcode(config.init_gcode);
    if(config.hasOwnProperty("scale_x")) state.scale_x = config.scale_x;
    if(config.hasOwnProperty("scale_y")) state.scale_y = config.scale_y;
    if(config.hasOwnProperty("segments")) state.segments = config.segments;
    if(config.hasOwnProperty("DEBUG")) state.DEBUG = config.DEBUG;
    if(config.hasOwnProperty("offset_x")) state.offset_x = config.offset_x;
    if(config.hasOwnProperty("offset_y")) state.offset_y = config.offset_y;    
    
  }

  function processTransform(state, transform) {
    transform = transform.trim();
    // Use regex to find function names
    var functions = [...transform.matchAll(/([a-zA-Z]+\([0-9\.\,\-\s]+\))/g)];
    //console.log(functions);
    for(var i = 0; i < functions.length; i++) {
      var matchedFunction = functions[i][0];
      var functionName = matchedFunction.substring(0, matchedFunction.indexOf("(")).toLowerCase();

      var data = matchedFunction.substring(matchedFunction.indexOf("(")+1, matchedFunction.indexOf(")")).split(",");
      if(data.length == 1) data = matchedFunction.substring(matchedFunction.indexOf("(")+1, matchedFunction.indexOf(")")).split(" ");

      for(var j = 0; j < data.length; j++) {
        data[j] = parseFloat(data[j].trim());
      }

      if(functionName == "scale") {
        state.local_scale_x *= data[0];
        state.local_scale_y *= data[1];
      }
      if(functionName == "translate") {
        state.local_offset_x += data[0];
        state.local_offset_y += data[1];
      }
      if(functionName == "rotate") {
        let angle = data[0] * Math.PI / 180.0;
        let cos = Math.cos(angle);
        let sin = Math.sin(angle);
        let x = data[1];
        let y = data[2];
        state.local_scale_x *= cos;
        state.local_scale_y *= cos;
        state.local_offset_x += x - x*cos + y*sin;
        state.local_offset_y += y - x*sin - y*cos;
      }
      if(functionName == "matrix") {
        // Perform matrix multiplication
        let a = data[0];
        let b = data[1];
        let c = data[2];
        let d = data[3];
        let e = data[4];
        let f = data[5];
        //if(a == 0 || d == 0) continue;
        state.local_scale_x *= (a*state.local_scale_x)+state.local_scale_x*c;
        state.local_scale_y *= (d*state.local_scale_y)+state.local_scale_y*b;
        state.local_offset_x += e;
        state.local_offset_y += f;
      }
    }
    if(state.local_scale_x < 0) state.local_invert_x = true; else state.local_invert_x = false;
    if(state.local_scale_y < 0) state.local_invert_y = true; else state.local_invert_y = false;

    state.local_scale_x = Math.abs(state.local_scale_x);
    state.local_scale_y = Math.abs(state.local_scale_y);

    if(state.DEBUG) {
      console.log("Local Scale: " + state.local_scale_x + ", " + state.local_scale_y);
      console.log("Local Offset: " + state.local_offset_x + ", " + state.local_offset_y);
    }
    return state;
  }

  function processElement(state, element) {

    state.local_scale_x = 1.0;
    state.local_scale_y = 1.0;
    state.local_offset_x = 0.0;
    state.local_offset_y = 0.0;
    state.local_invert_x = false;
    state.local_invert_y = false;

    var parent = element.parentElement;
    // Process parent element transforms
    while(parent != null && parent.tagName.toLowerCase() != "svg") {

      var transform = parent.getAttribute("transform");
      if(transform != null) {
        state = processTransform(state, transform);
      }
      parent = parent.parentElement;
    }
    var transform = element.getAttribute("transform");
    if(transform != null) {
      state = processTransform(state, transform);
    }
    state.local_matrix = element.getCTM();
    

    return state;
  }

  function fSVGtoGcode(data, config={}) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(data, "image/svg+xml");
    const errorNode = doc.querySelector("parsererror");
    if (errorNode) {
      console.log("Failed to parse SVG"+ errorNode.textContent);
      return [";Failed to parse SVG" + errorNode.textContent];
    }
    var state = new State();
    processConfig(state, config);

    var svg = doc.getElementsByTagName("svg")[0];
    if(svg.getAttribute("width") != null && svg.getAttribute("width").includes("in")) {
      state.scale_x *= 25.4;
      state.scale_y *= 25.4;      
    }
    var paths = doc.getElementsByTagName("path");
   

    console.log("Found " + paths.length + " paths");

    for(var i = -1; i < paths.length; i++) {
      if(i == -1) {
        state.gcode = state.gcode_init.split("\n");
      } else {                

        var path = paths[i];

        if(state.DEBUG && path.getAttribute("id") != null) {
          console.log("Path: " + path.getAttribute("id"));
        }        

        state = processElement(state, path);
        
        var d = path.getAttribute("d");
        state.gcode = parsePathD(state, d);
      }
    }

    var polylines = doc.getElementsByTagName("polyline");

    for(let i = 0; i < polylines.length; i++) {
      let polyline = polylines[i];
      state = processElement(state, polyline);
      let points = polyline.getAttribute("points");
      points = points.split(/[\s]+/g);
      console.log(state);
      for(let j = 0; j < points.length; j++) {
        points[j] = points[j].trim();
      }
      state.gcode.push(state.gcode_tool_down);
      for(let j = 0; j < points.length; j++) {
        let point = points[j].split(",");
        if(point.length != 2) continue;
        let x = parseFloat(point[0]);
        let y = parseFloat(point[1]);
        if(j == 0) state.gcode = addGcode(state, "G0", x, y);
        else state.gcode = addGcode(state, "G1", x, y);
      }

      state.gcode.push(state.gcode_tool_up);
    }

    var polygons = doc.getElementsByTagName("polygon");
    for(let i = 0; i < polygons.length; i++) {
      let polygon = polygons[i];
      state = processElement(state, polygon);
      let points = polygon.getAttribute("points");
      points = points.split(/[\s]+/g);
      for(let j = 0; j < points.length; j++) {
        points[j] = points[j].trim();
      }
      state.gcode.push(state.gcode_tool_down);
      cur_x = 0.0;
      cur_y = 0.0;
      for(let j = 0; j < points.length; j++) {
        let point = points[j].split(",");
        if(point.length != 2) continue;
        let x = parseFloat(point[0]);
        let y = parseFloat(point[1]);
        if(j == 0) state.gcode = addGcode(state, "G0", x, y);
        else state.gcode = addGcode(state, "G1", x, y);
        cur_x = x;
        cur_y = y;
      }
      let first_point = points[0].split(",");
      if(cur_x != first_point[0] || cur_y != first_point[1]) state.gcode = addGcode(state, "G1",first_point[0],first_point[1]);
      state.gcode.push(state.gcode_tool_up);
    }

    var circles = doc.getElementsByTagName("circle");
    for(let i = 0; i < circles.length; i++) {
      let circle = circles[i];

      state = processElement(state, circle);

      let cx = circle.getAttribute("cx");
      let cy = circle.getAttribute("cy");
      let r = parseFloat(circle.getAttribute("r"));
      
      state.gcode.push(";Circle");
      let start_x = parseFloat(cx)-r;
      state.gcode = addGcode(state, "G0", start_x, cy);
      state.gcode.push(state.gcode_tool_down);
      state.gcode = addGcode(state, "G2", start_x, cy, "I" + r*state.scale_x*state.local_scale_x + " J0");
      state.gcode.push(state.gcode_tool_up);
      state.gcode.push(";Circle Done");
    }

    var ellipses = doc.getElementsByTagName("ellipse");

    for(let i = 0; i < ellipses.length; i++) {
      let ellipse = ellipses[i];

      state = processElement(state, ellipse);
      let cx = parseFloat(ellipse.getAttribute("cx"));
      let cy = parseFloat(ellipse.getAttribute("cy"));
      let rx = parseFloat(ellipse.getAttribute("rx"));
      let ry = parseFloat(ellipse.getAttribute("ry"));
      
      state.gcode.push(";Ellipse");
      /*
      let ratio = rx/ry;

      // Calculate start and end angles of each arc
      let sphereSizes = [
         (rx>ry)?ry/ratio:rx/ratio,
         (rx>ry)?rx/ratio:ry/ratio,
         (rx>ry)?ry/ratio:rx/ratio,
         (rx>ry)?rx/ratio:ry/ratio
      ];

      // Calculate center point of each arc
      let centers = [
        { x: cx + (sphereSizes[0]-rx)/2.0, y: cy },
        { x: cx, y: cy + (-sphereSizes[1]+ry)/2.0 },
        { x: cx + (-sphereSizes[1]+rx)/2.0, y: cy },
        { x: cx, y: cy + (sphereSizes[3]-ry)/2.0 }
      ];
      let start_x = parseFloat(cx)-parseFloat(rx);

      gcode.push("G0 X" + start_y + " Y" + cy);

      // Generate G-code for each arc
      for (let i = 0; i < 4; i++) {
        let arc = angles[i];
        let center = centers[i];
        gcode.push(`G2 X${center.x} Y${center.y} I${rx} J${ry}`);
      }
      */
      let start_x = cx+rx;
      let start_y = cy;

      // Estimate the ellipse with line segments
      state.gcode = addGcode(state, "G0", start_x, start_y);
      state.gcode.push(state.gcode_tool_down);
      for (let i = 0; i < state.segments*2; i++) {
        let x_ellipse = cx + rx * Math.cos(2 * Math.PI * i / (state.segments*2));
        let y_ellipse = cy + ry * Math.sin(2 * Math.PI * i / (state.segments*2));
        gcode = addGcode(state, "G1", x_ellipse, y_ellipse); // move to point on ellipse
        
      }
      state.gcode = addGcode(state, "G1", start_x, start_y);
      state.gcode.push(state.gcode_tool_up);
      state.gcode.push(";Ellipse Done");
    }

    var lines = doc.getElementsByTagName("line");
    for(let i = 0; i < lines.length; i++) {
      let line = lines[i];
      state = processElement(state, line);
      let x1 = line.getAttribute("x1");
      let y1 = line.getAttribute("y1");
      let x2 = line.getAttribute("x2");
      let y2 = line.getAttribute("y2");       
      state.gcode.push(";Line");        
      state.gcode = addGcode(state, "G0", x1, y1);
      state.gcode.push(state.gcode_tool_down);
      state.gcode = addGcode(state, "G1", x2, y2);
      state.gcode.push(state.gcode_tool_up);
      state.gcode.push(";Line Done");
    }

    var rects = doc.getElementsByTagName("rect");
    for(let i = 0; i < rects.length; i++) {
      let rect = rects[i];
      let x = parseFloat(rect.getAttribute("x"));
      let y = parseFloat(rect.getAttribute("y"));
      let width = parseFloat(rect.getAttribute("width"));
      let height = parseFloat(rect.getAttribute("height"));
      state.gcode.push(";Rectangle");
      state.gcode = addGcode(state, "G0", x, y);
      state.gcode.push(state.gcode_tool_down);
      state.gcode = addGcode(state, "G1", x+width, y);
      state.gcode = addGcode(state, "G1", x+width, y+height);
      state.gcode = addGcode(state, "G1", x, y+height);
      state.gcode = addGcode(state, "G1", x, y);
      state.gcode.push(state.gcode_tool_up);
      state.gcode.push(";Rectangle Done");
    }

    /*
    var gcode = [];
    for (var i = 0; i < points.length; i++) {
      var point = points[i];
      for (var j = 0; j < point.length; j++) {
        var p = point[j];
        gcode.push("G1 X" + p[0] + " Y" + p[1]);
      }
    }*/

    
    let gcode_lines = state.gcode.length;
    
    // Add some statistics to the beginning of the G-code
    state.gcode.unshift(";Max X: " + state.max_x + "mm Y: " + state.max_y + "mm");
    state.gcode.unshift(";Min X: " + state.min_x + "mm Y: " + state.min_y + "mm");
    state.gcode.unshift(";Scale X: " + state.scale_x + " Y: " + state.scale_y);
    state.gcode.unshift(";Offset X: " + state.offset_x + " Y: " + state.offset_y);
    state.gcode.unshift(";Total G-code Lines: " + gcode_lines);
    state.gcode.unshift(";Date " + new Date().toISOString());
    state.gcode.unshift(";Generated by fSVGtoGcode.js v" + FSVGTOCODE_VERSION);
    return state.gcode;
  }
