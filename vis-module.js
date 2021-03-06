/*

PLOT SPECTRA and LIGHT CURVES
vis-module.js

----------------------------------------------------------------------------
The MIT License (MIT)

Copyright (c) 2014 - Tarif Haque, Rollin Thomas, Sarah Poon 
Lawrence Berkeley National Laboratory

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
----------------------------------------------------------------------------

# Primary Data Overlays
Primary data associated with the target spectrum and overlays are comprised of 
one to many channels.  A HighCharts series represents a single channel, or 
error associated with that channel. Primary data is assumed to be permanently 
plotted on the chart, whereas overlays may be charted and uncharted.

The user selects overlays to plot from the select tool. If an overlay is selected, it is kept
on the chart until the chart is cleared or the overlay is unfavorited. An overlay may be 
comprised of several channels. When the user selects an overlay, all channels associated 
with that overlay are plotted.

Every overlay has a number (ID) associated with it. The overlay number is determined by the order 
in which the overlay appears in the JSON data. Because an overlay may be comprised of one to
many channels, several HighCharts series may have the same overlay ID; if this is the case, 
these series belong to the same overlay, and are charted and uncharted simultaneously.   
    
# Uniquely identifying a series on the chart
All channels must have a unique channel name. Every series plotted on the chart has a unique ID, 
which is a string concatenation of the following flags: 

"t" + ("d" or "o") + ("s" or "e") + channel name
"t" = appended to the beginning of the string if the series is a transform
"d" = if the series belongs to primary data
"o" = if the series belongs to an overlay
"s" = if the series charts a spline curve
"e" = if the series charts error associated with the spline

Thus, a series on the chart may be uniquely identified given these criteria. All channels 
must have unique names. Being able to unqiuely identify a series on the chart is important 
for removing specific series from the chart. 

If the series belongs to an overlay, the "overlayid" attribute associated with the series 
references the overlay number to which the series belongs.

# Transforming Data Channels
Only data channels (series) may be transformed. When transformed, a duplicate of the series
is made, and the transform is applied to the duplicate; the transform duplicate is then plotted 
to the chart. Only one transform of a data channel may exist at any given time.

# Dynamically Generating Transform UIs 
A UI must be generated for any given transform. Thus, after the user selects a transform, a function 
is called to populate the UI assoiciated with that transform. For example, generateMovingAverageUI() 
is called if the user wishes to apply a moving average to data channel(s). 

# Atomic Lines
For now, we store atomic lines in a dictionary locally. The atc-lines content defines a line list for 
each species in a dictionary. The species name is the key, and the value is a list of wavelengths.  
Thus, each species will has a unique name. For example, the convention used for the neutral hydrogen 
species is "H I" where 'H' is the atomic symbol of the element and then a Roman numeral, where 'I' 
means neutral, II means singly ionized, III means doubly ionized, etc. There are a limited list of 
these species that are provided.

*************************************************************************************************/

    var atc_lines = {
      "H_I" : [[410, 434, 486, 656], "#FF0000"],
      "Test" : [[300, 325, 520, 300], "#00FF00"]
    };

    /* Chart Settings */
    var chartData = {
      title : {
        text: 'Spectrum'
      },

      chart: {
         zoomType: 'xy'
      },

      legend: {
        enabled: true,
        maxHeight: 60,
        align: "center"
      },

      xAxis: {
        title: {text: 'X'}
      },

      yAxis: {
        title: {text: 'Y'}
      },

      line: {
        marker: {
          enabled: false
        }
      },

      series: []
    };

    /* Display full numbers on axis instead of metric prefixes like "k" */
    Highcharts.setOptions({
      lang: {
        numericSymbols: null
      }
    });

    var spectrumData;
    var chart;
    var selectedOverlays = [];
    var prevHighlightedOverlay;
    var overlaysPerLoad = 15;
    var overlaysLoaded = 0;
    var numOverlays;

    /* jQuery attributes for select2 UI elements. */
    var selectleft;
    var selecttransform;
    var selectspecies;

    selectleft = $("#select-left").select2({
      placeholder: "Select an Overlay",
      allowClear: true
    });

    selecttransform = $("#select-transform").select2({
      placeholder: "Select a Transform",
      allowClear: true
    });

    selectspecies = $("#select-species").select2({
      placeholder: "Select a Species",
      allowClear: true
    });

    /* Event listener: highlighting an overlay. */ 
    selectleft.on("select2-highlight", 
      function(e) {
        if (e.val != prevHighlightedOverlay) {
          plotHighlightedOverlay(e.val);
        }
        prevHighlightedOverlay = e.val;
      }
    );

    /* Event listener: selecting an overlay. */
    selectleft.on("select2-selecting", 
      function(e) {
        if (!isSelectedOverlay(e.val)) {
          selectedOverlays.push(e.val);
          
          /* Add the selected overlay to the favorites list UI. */
          var x = document.getElementById("select-favorites");
          var option = document.createElement("option");
          option.value = e.val;
          option.text = e.object.text;
          x.add(option);
        }
      } 
    );

    /* Event listener for selecting a transform. */
    selecttransform.on("select2-selecting",
      function(e) {
        if (e.val === "moving-average") 
          generateMovingAverageUI();
      }
    );

    /* Event listener for selecting an atomic species. */
    selectspecies.on("select2-selecting",
      function(e) {
        var x = document.getElementById("shift-forms");
        var speciesName = e.val;
        var speciesColor = atc_lines[speciesName][1];
        
        /* Form input IDs for shift parameters. */ 
        var zInputID = "z" + speciesName;
        var vInputID = "v" + speciesName;
        
        /* 
        Dynamically add form for populating parameters of atomic species shifts. 
        Intermingling so much HTML in JavaScript is probably awful design... sorry. 
        */

        var newShiftFormRow = "<div class='row' id=" + speciesName + ">";
        
        var label = "<div class='col-sm-4'> <div class='input-group input-group-sm'>";
        var label2 = "<span class='input-group-addon' style='background-color: "  +  speciesColor  + " '> " + speciesName + " </span> </div> </div>"; 

        var zInput = "<div class='col-sm-4'> <div class='input-group input-group-sm'>";
        var zInput2 = "<span class='input-group-addon'>Z</span> <input id='" + zInputID + "' type='number' class='form-control' value='0'> </div> </div>"; 
        
        var vInput = "<div class='col-sm-4'> <div class='input-group input-group-sm'>";
        var vInput2 = "<span class='input-group-addon'>V</span> <input id='" + vInputID + "' type='number' class='form-control' value='0'> </div> </div>";
        var endShiftFormRow = "</div>";
        
        x.innerHTML = x.innerHTML + newShiftFormRow + label + label2 + zInput + zInput2 + vInput + vInput2 + endShiftFormRow;
      }
    );

    /* Event listener for removing an atomic species. */
    selectspecies.on("select2-removed",
      function(e) {
        var speciesName = e.val;
        var speciesShiftForm = document.getElementById(speciesName);
        if (speciesShiftForm != null) {
          speciesShiftForm.parentNode.removeChild(speciesShiftForm);
        }
      }
    );     

    /* Generates the Moving Average UI. */
    function generateMovingAverageUI() {
      var ui = document.getElementById('transform-ui');
      
      var begin = "<br> <div class='row'>";
      var selectchannels = "<div class='col-md-6'> <center> <span class='label label-info'>Select Channels</span> </center> <select multiple id='select-channels' style='width:100%'> </select> </div>";
      var numberinput = "<div class='col-md-6'> <center> <span class='label label-info'>Half-Width (Number of Points)</span> </center> <input type='number' id='inputHalfWidth' class='form-control'> </div>";
      var end = "</div>";

      var buttongroup = "<center> <br> <div class='btn-group'>";
      var clearbutton = "<button type='button' onclick='removeAllTransforms()' class='btn btn-success'>"; 
      var clearicon = "<span class='glyphicon glyphicon-remove'></span> Clear Transforms </button>";

      var applybutton = "<button type='button' onclick='applyMovingAverageTransform()' class='btn btn-warning'>";
      var applyicon = "<span class='glyphicon glyphicon-send'></span> Submit </button> </div> </center>";

      ui.innerHTML = begin + selectchannels + numberinput + end + buttongroup + clearbutton + clearicon + applybutton + applyicon;
      
      selectchannels = $("#select-channels").select2({
        allowClear: true
      });

      for (var i = 0; i < spectrumData.data.channels.length; i++) {
        channelName = spectrumData.data.channels[i].name; 
        $('#select-channels').append('<option value="' + channelName + '">' + (i + 1) + ":" + channelName + '</option>');
      }
    }

    function applyMovingAverageTransform() {
      /* Retrieve the channels to apply transform to. */
      var selectchannels = $('#select-channels');
      var selections = $(selectchannels).select2('data');
      var halfWidth = parseInt(document.getElementById('inputHalfWidth').value);

      /* Apply moving average transform to all selected channels. */
      for (var i = 0; i < selections.length; i++) {

        /* Remove a prior version of the transformed series if one exists. */
        var transformedSeriesId = "t" + "d" + "s" + selections[i].id;
        var transformedSeries = chart.get(transformedSeriesId);
        if (transformedSeries != null) transformedSeries.remove();

        /* Retrieve series to transform by its ID */
        var seriesId = "d" + "s" + selections[i].id;
        var singleSeries = chart.get(seriesId);

        var newSeriesData = [];

        /* Apply transform to the single series. */
        for (var j = halfWidth; j < singleSeries.xData.length; j = j + 1 + (halfWidth * 2)) {
          var sum = 0;

          for (var k = j - halfWidth; k < (j + halfWidth + 1); k++) {
            sum = sum + singleSeries.yData[k];
          }

          var average = sum / ((2 * halfWidth) + 1);

          if (!isNaN(average)) newSeriesData.push([singleSeries.xData[j], average]);
        }

        var newSeries = {
          id   : "t" + seriesId,
          name :  singleSeries.name + " (transformed)",
          type : 'spline',
          data : newSeriesData,
          marker: {
            enabled: false
          }
        };

        chart.addSeries(newSeries);
      }
    }

    /* Initial ajax call to load data into chart. Because I see no reason otherwise,
       we store the spectrum data globally in the spectrumData attribute. */
    
    // $.getJSON('https://portal-auth.nersc.gov/atc/rest/fits/example4?', function(data) {        
      /* Set some global variables. */
      // spectrumData = data;
      // numOverlays = spectrumData.meta.num_overlays;
      
      // loadOverlays();
      // initializeChart();
      // loadAtomicSpecies();
    // });  

    /* Iterates through all series on the chart and removes
       the series if it is a transform. */
    function removeAllTransforms() {
      var seriesLength = chart.series.length;
      for (var i = seriesLength - 1; i > -1; i--) {
          if (isTransformedSeries(chart.series[i].options.id))
            chart.series[i].remove();
      }
    }

    /* Close the modal dialog for loading files. */
    function closeModalDialog() {
      var loading_dialog = $('#loadSpectrumModal');
      loading_dialog.modal('hide');
    }

    /* Load spectrum data from a local JSON source. */
    function loadFileAsText()
    {
      closeModalDialog();

      var fileToLoad = document.getElementById("fileToLoad").files[0];
      var fileReader = new FileReader();
      fileReader.onload = function(fileLoadedEvent)
      {
        var textFromFileLoaded = fileLoadedEvent.target.result;
        spectrumData = $.parseJSON(textFromFileLoaded);
        console.log(spectrumData);
        loadOverlays();
        initializeChart();
      };
      fileReader.readAsText(fileToLoad, "UTF-8");
    }

    /* Populates select box with available overlays. */
    function loadOverlays() {
      var overlays = spectrumData.overlays;

      /* This global variable is set each time more overlays are loaded. */
      overlaysLoaded = overlaysLoaded + Object.keys(overlays).length;

      updateProgressBar(overlaysLoaded, numOverlays);
      for (var i = 0; i < overlays.length; i++) {
        var name = overlays[i].name;
        var overlayID = i + 1;
        $('#select-left').append('<option value="' + overlayID + '">' + overlayID + ":" + name + '</option>');
      }
    }

    /* Update the loaded overlays progress bar to reflect added overlays. */
    function updateProgressBar(overlaysLoaded, totalOverlays) {

      var $bar = $("#overlays-progress");
      var percent = (overlaysLoaded/totalOverlays) * 100;
      var display = overlaysLoaded + "/" + totalOverlays;

      /* update the progress bar width */
      $bar.css('width', percent + '%');
      
      /* and display the numeric value */
      $bar.html(display);

    }

    /* Called when the user wishes to load more overlays into overlay select tool. */
    function loadMoreOverlays() {
      var btn = $('#loadMore');
      btn.button('loading');

      $.getJSON('https://portal-auth.nersc.gov/atc/rest/fits/example4?skip=' + overlaysPerLoad + '&data=0&meta=0', function(data) {
          size = data.overlays.length;
          start = spectrumData.overlays.length;
          overlaysLoaded = overlaysLoaded + size;

            for (var i = 0; i < size; i++) {
              spectrumData.overlays.push(data.overlays[i]);
              name = data.overlays[i].name;
              $('#select-left').append('<option value="' + (start + i + 1) + '">' + (start + i + 1) + ":" + name + '</option>');
              btn.button('reset');
              updateProgressBar(overlaysLoaded, numOverlays);
            }
      });
    }

    /* Populates the atomic lines UI with available atomic species. */
    function loadAtomicSpecies() {
      $.each(atc_lines, function(speciesName, linesList) {
        $('#select-species').append('<option value="' + speciesName + '">' + speciesName + ": [" + linesList[0] + "]" + '</option>');
      });
    }

    /* Plots an atomic lines species on the chart. */
    function plotSpecies(speciesName, linesList, color) {
      for (var i = 0; i < linesList.length; i++) {
        addPlotLine(speciesName, linesList[i], color);
      }
    }

    /* 
    Applies a doppler (z) + redshift (v) to the given species. Returns
    the lines list of the shifted species. 
    */
    function applyShift(linesList, z, v) {
      var shiftedSpecies = [];
      var c = 300;
      for (var i = 0; i < linesList.length; i++) {
        shiftedLine = linesList[i] * (1 + z) / (1 + (v / c));
        shiftedSpecies.push(shiftedLine);
      }
      return shiftedSpecies;
    }

    /* 
    Plots a single plot line associated with a species on chart.
    The id is simply the species name that the line belongs to. 
    Thus, the plotLineID is NOT unqiue to a line! The assumption here
    is that all lines of a species are charted and uncharted simultaneously.
    */
    function addPlotLine(plotLineID, wavelengthInNanometers, speciesColor) {
      chart.xAxis[0].addPlotLine({
        value: wavelengthInNanometers * 10,
        color: speciesColor,
        width: 1.5,
        id: plotLineID
      });
    }

    /* Unchart all species and wipe species parameter forms. */
    function clearAllSpecies() {
      removeAllSpecies();
      wipeSpeciesShiftForms();
      unselectAllSpecies();
    }

    /* Unselects all species from the species select box. */
    function unselectAllSpecies() {
      $("#select-species").select2("val", "");
    }

    function wipeSpeciesShiftForms() {
      var shiftforms = document.getElementById("shift-forms");
      shiftforms.innerHTML = "<br>";
    }

    /* Uncharts all atomic lines species from the chart. */
    function removeAllSpecies() {
      $.each(atc_lines, function(speciesName, linesList) {
        removeSpecies(speciesName);
      });
    }

    /* Given the species name, removes a specific species from the chart. */
    function removeSpecies(speciesName) {
        chart.xAxis[0].removePlotLine(speciesName);
    }

    /* Plots the selected atomic line specie(s) to the chart. */
    function plotSelectedSpecies() {
      /* Wipe all species from chart. */
      removeAllSpecies();

      /* Retrieve the species to plot. */
      var species = $('#select-species');
      var selections = $(species).select2('data');


      /* Plot the selected species. */
      var keys = [];
      for (var key in selections) {
        if (selections.hasOwnProperty(key)) {
          var speciesName = selections[key].id;
          
          /* Default parameter values. */
          var zParam = 0;
          var vParam = 0;

          /* Retrieve parameter values from form. */
          zParam = parseFloat(document.getElementById("z" + speciesName).value);
          vParam = parseFloat(document.getElementById("v" + speciesName).value);
          
          var speciesLines = atc_lines[speciesName][0];
          var speciesColor = atc_lines[speciesName][1];
          plotSpecies(speciesName, applyShift(speciesLines, zParam, vParam), speciesColor);
        }
      }
    }

    function generatePermalink() {
      document.getElementById("permalink").innerHTML = "<br> Summarize chart here. <br>";
    }

    function displayPermalinkSummary() {
      var overlaysList = selectedOverlays.toString();
      document.getElementById("permalink").innerHTML = "<br> Overlays selected: [" + overlaysList + "]<br>";
    }

    /* Called after the user highlights an overlay to plot. */
    function plotHighlightedOverlay(overlayID) {
      /* Only plot highlighted overlay if it has not already been plotted. */
      if (!hasBeenPlotted(overlayID)) {

        /* Remove overlays that are NOT selected overlays or data. */
        var seriesLength = chart.series.length;
        for (var i = seriesLength - 1; i > -1; i--) {
            if (!(isSelectedOverlay(chart.series[i].options.overlayid) || isDataSeries(chart.series[i].options.id)))
              chart.series[i].remove();
        } 

        /* Plot all channels of the highlighted overlay if has not already been plotted. */
        plotOverlay(spectrumData.overlays[overlayID - 1], overlayID);
      }

    }

    function unfavoriteOverlay() {
      var x = document.getElementById("select-favorites");
      if (x.selectedIndex != -1) {
        overlayID = $("#select-favorites option:selected").val();
        removeElement(selectedOverlays, overlayID.toString());
        removeOverlay(overlayID);
        x.remove(x.selectedIndex);
      }
    }

    /* Helper method that removes all elements in array with a value of key. */
    function removeElement(array, key) {
      for(var i = array.length - 1; i >= 0; i--) {
        if(array[i] === key) {
           array.splice(i, 1);
        }
      }
    }

    /* Remove all series from the chart with the given overlayID. */
    function removeOverlay(overlayID) {
      var seriesLength = chart.series.length;
      for (var i = seriesLength - 1; i > -1; i--) {
          if (chart.series[i].options.overlayid == overlayID)
            chart.series[i].remove();
      }
    }

    /* Removes all overlays from the chart. */
    function removeOverlays() {
      var seriesLength = chart.series.length;
      for (var i = seriesLength - 1; i > -1; i--) {
          if (isOverlaySeries(chart.series[i].options.id))
            chart.series[i].remove();
      }
    }

    /* Called if the user wishes to clear all overlays from chart. */
    function clearAllOverlays() {
      while (selectedOverlays.length > 0) {
        selectedOverlays.pop();
      }
      removeOverlays();
      $('#select-favorites').find('option').remove().end();
    }

    /* Returns true if an overlay with a given ID has already been plotted. */
    function hasBeenPlotted(overlayID) {
      for (var i = 0; i < chart.series.length; i++) {
        seriesID = chart.series[i].options.overlayid;
        if (seriesID == overlayID) return true;
      }
      return false;
    }

    /* Given an overlay ID, returns true if the overlay is a selected overlay. */
    function isSelectedOverlay(targetOverlayID) {
      for (var i = 0; i < selectedOverlays.length; i++) {
        overlayID = selectedOverlays[i];
        if (overlayID == targetOverlayID) return true;
      }
      return false;       
    }

    /* Given a series ID, determines whether the series belongs to an overlay. */
    function isOverlaySeries(seriesID) {
      if (seriesID.charAt(0) == "o") return true;
      else return false;
    }

    /* Given a series ID, determines whether the series is a transformed series. */
    function isTransformedSeries(seriesID) {
      if (seriesID.charAt(0) == "t") return true;
      else return false; 
    }

    /* Given a series ID, determines whether the series is a data series. 
      (Includes tranformed data series). */
    function isDataSeries(seriesID) {
      if (seriesID.charAt(0) == "d" || seriesID.charAt(1) == "d") return true;
      else return false;
    }

    /* 
    Plots a single channel + error on the chart.
    channel: contains channel data
    channelType: "data" or "overlay"
    overlayNumber: if channelType is not an overlay, null. otherwise provide the overlay number.   
    */
    function plotChannel(channel, channelType, overlayNumber) {
      var skipChannel = 0;
      var channelData = [];
      var errorData = [];

      var seriesId;

      if (channelType === "data") {
        seriesId = "d";
      } else {
        seriesId = "o";
      }

      var displayName = "(data) " + channel.name;

      /* Determine the diplay name if channel is an overlay. */
      if (channelType === "overlay") {
        displayName = "(overlay " + overlayNumber + ") " + channel.name;
      }

      /* Render channel content as a vertical line. */
      if (channel.content[0].length == 1) {

      }

      /* Render channel content without error. */
      if (channel.content[0].length == 2) {
        
      /* Format data in the way HighCharts expects it */
      for (var j = 0; j < channel.content.length; j++) {

        point = channel.content[j]; 

        /* Ignore channel if content tuples are different sizes. */
        if (point.length != 2) {
          skipChannel = 1;
          break;
        } else {
            x = point[0];
            y = point[1];
            channelData.push([x, y]); 
          }
        }

        if (!skipChannel) {           
          var singleSeries = {
              id   : seriesId + "s" + channel.name,
              name : displayName,
              type : 'spline',
              data : channelData,
              overlayid : overlayNumber
          };

          chart.addSeries(singleSeries);
        }
      } 

      /* Render channel content with error. */
      if (channel.content[0].length == 3) {

      /* Format data in the way HighCharts expects it */
      for (var j = 0; j < channel.content.length; j++) {
          
          point = channel.content[j];

          /* Ignore channel if content tuples are different sizes. */
          if (point.length != 3) { 
            skipChannel = 1;
            break; 
          } else {
            x = point[0];
            y = point[1];
            channelData.push([x, y]);
            error = point[2];
            errorData.push([x, y - error, y + error]);
          }

        }
      
        if (!skipChannel) {
          var singleSeries = {
              id   : seriesId + "s" + channel.name,
              name : displayName,
              type : 'spline',
              data : channelData,
              overlayid : overlayNumber
          };

          var errorSeries = {
            id   : seriesId + "e" + channel.name,
            name : displayName + " error",
            type : 'areasplinerange',
            data : errorData,
            overlayid : overlayNumber
        };

        chart.addSeries(singleSeries);
        chart.addSeries(errorSeries);
      }
      }
    }

    /* Charts the name, axis labels, and channels of the primary data spectra */ 
    function plotData(data) {
      chart.setTitle({text: data.name});

      chart.xAxis[0].update({
        title: {text: spectrumData.meta.labels[0] + " (" + spectrumData.meta.units[0] + ")"}
      });

      chart.yAxis[0].update({
        title: {text: spectrumData.meta.labels[1] + " (" + spectrumData.meta.units[1] + ")"}
      });

      for (var i = 0; i < data.channels.length; i++) {
        plotChannel(data.channels[i], "data", null);
      }
    }

    /* Plots an overlay. */ 
    function plotOverlay(overlay, id) {
      for (var i = 0; i < overlay.channels.length; i++) {
        plotChannel(overlay.channels[i], "overlay", id);
      }
      chart.redraw();
    }

    /* Wipes all series (including data) from chart. */
    function removeAllSeries() {
      while (chart.series.length > 0) {
        chart.series[0].remove(false);
      }
      chart.redraw();
    }

    function initializeChart() {
      $('#container').highcharts(chartData);
      chart = $('#container').highcharts();
      plotData(spectrumData.data);
      loadAtomicSpecies();
    }