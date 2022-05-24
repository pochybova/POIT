
var x = new Array();
var y = new Array();
var counter = 0;
var gauge = undefined;
var socket = undefined;
$(document).ready(function() {
  namespace = '/test';

  socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port + namespace);
  socket.on('connect', function() {
  socket.emit('my_event', {data: 'I\'m connected!', value: 1}); });

  socket.on('my_response', function(msg) {
      if (msg.sensor !== undefined) {
	updateTable(msg);
	updateGraph(msg);
	updateGauge(msg);
      }
  });


  $('form#emit').submit(function(event) {
    socket.emit('my_event', {value: $('#emit_value').val()});
    return false; });
  $('#buttonVal').click(function(event) {
    //console.log($('#buttonVal').val());
    socket.emit('click_event', {value: $('#buttonVal').val()});
    return false; });
  $('#sliderVal').change(function(event) {
    console.log($('#sliderVal').val());
    socket.emit('slider_changed_event', {value: $('#sliderVal').val()});
    return false; });
  $('form#disconnect').submit(function(event) {
    socket.emit('disconnect_request');
    return false; }); 
  $('form#connect').submit(function(event) {
    console.log('connect')
  });
  
  $('#start').click(function() {
    startMeassure();
  });
  
  $('#stop').click(function() {
    stopMeassure();
  });
  
  $('#load_file').click(function() {
     var $link = "read/"+$('#load_file_value').val();
      
    $.ajax({
      type: "POST",
      url: $link,
      success:function(data) 
      { console.log(data);  
	data = data.replace(/'/g, '"');
	console.log(data);
        data = JSON.parse(data);
        console.log(data);    
        n = Object.keys(data).length;
        console.log(n);
        
        xl = [];
        yl = [];
        
        for (var i=0; i< n; i++){
          xl.push(new Date(data[i].time * 1000));
          yl.push(data[i].sensor); 
       }
	layout = {
          title: 'Data',
          xaxis: {
              title: 'x',
          },
          yaxis: {
              title: 'y',
              range: [0,5]
          }
        };
        var trace = [{
            x: xl,
            y: yl}];  
        
        console.log("traces", trace);
        Plotly.newPlot($('#plotdiv')[0],trace,layout); 
	initialiseGauge();
	gauge.value = yl[yl.length -1];       
      }
    }).done(function( o ) {
       // do something
    });    
  });
  
  $('#load_database').click(function() {
     var $link = "dbdata/"+$('#load_database_value').val();
      
    $.ajax({
      type: "POST",
      url: $link,
      success:function(data) 
      { console.log(data);  
	data = data.replace(/'/g, '"');
	console.log(data);
        data = JSON.parse(data);
        console.log(data);    
        n = Object.keys(data).length;
        console.log(n);
        
        xl = [];
        yl = [];
        
        for (var i=0; i< n; i++){
          xl.push(i);
          yl.push(data[i][0]); 
       }
	layout = {
          title: 'Data',
          xaxis: {
              title: 'x',
          },
          yaxis: {
              title: 'y',
              range: [0,5]
          }
        };
        var trace = [{
            x: xl,
            y: yl}];  
        
        console.log("traces", trace);
        Plotly.newPlot($('#plotdiv')[0],trace,layout); 
	initialiseGauge();
	gauge.value = yl[yl.length -1];       
      }
    }).done(function( o ) {
       // do something
    });    
  });
  
   initialiseGauge(); 
});

function updateTable(msg) {
  const mytable = document.getElementById("html-data-table");
  if (mytable !== null) {
    const newRow = document.createElement("tr");
		  
    const cell = document.createElement("td");
    cell.innerText = msg.sensor;
    newRow.appendChild(cell);
    
    const cellTime = document.createElement("td");
    cellTime.innerText = new Date(msg.time * 1000);
    newRow.appendChild(cellTime);
    
    const cellInput = document.createElement("td");
    cellInput.innerText = msg.input;
    newRow.appendChild(cellInput);
    mytable.appendChild(newRow);
  }
}

function updateGraph(msg) {
        x.push(new Date(msg.time * 1000));
        y.push(parseFloat(msg.sensor));
        trace = {
            x: x,
            y: y,
            name:'Napatie',
        };   
        
        layout = {
          title: 'Data',
          xaxis: {
              title: 'x',
          },
          yaxis: {
              title: 'y',
              range: [0,5]
          }
        };
        var traces = new Array();
        traces.push(trace);
        Plotly.newPlot($('#plotdiv')[0], traces, layout); 
}

function updateGauge(msg) {
      gauge.value = msg.sensor;                
}

function initialiseGauge() {
  gauge = new RadialGauge({
	  renderTo: 'canvasID',
	  width: 300,
	  height: 300,
	  units: "V",
	  minValue: 0,
	  maxValue: 5,
	  majorTicks: [
		  "0",
		  "0.5",
		  "1",
		  "1.5",
		  "2",
		  "2.5",
		  "3",
		  "3.5",
		  "4",
		  "4.5",
		  "5"
	  ],
	  minorTicks: 1,
	  strokeTicks: true,
	  highlights: [
		  {
			  "from": 4,
			  "to": 5,
			  "color": "rgba(200, 50, 50, .75)"
		  }
	  ],
	  colorPlate: "#fff",
	  borderShadowWidth: 0,
	  borders: false,
	  needleType: "arrow",
	  needleWidth: 2,
	  needleCircleSize: 7,
	  needleCircleOuter: true,
	  needleCircleInner: false,
	  animationDuration: 1500,
	  animationRule: "linear"
  });
  gauge.draw();
  gauge.value = "0";       
}

function startMeassure() {
  console.log('start');
  socket.emit('start', {value: $('#emit_value').val()})
}

function stopMeassure() {
  socket.emit('stop', {});
  x = [];
  y = [];
}
	
