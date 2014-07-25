# Plot Spectra and Light Curves
### A Visual Analytics Tool for and Comparing Supernova Spectra and Light Curves

The Dark Energy Survey's supernova (DES-SN) science working group is a geographically-dispersed team of scientists who use observations of distant Type Ia supernovae (SNe) to understand the origin of the accelerating expansion of our universe and to uncover the nature of Dark Energy. DES-SN uses a globally-distributed collection of telescopes, including the world's largest telescopes, to gather spectroscopic follow-up observations. These observations are used to classify the supernovae, measure their redshifts, and extract information to be used to control systematic errors in cosmological inferences. Supernova candidates are chosen for follow-up after analysis and review of fits to light curves, which are represented as time-series measurements of fluxes from DES imaging data.

There are a number of different kinds of light curve fitting programs used by the supernova community today. This visualization tool allows for the comparison of spectra and light curve fits side-by-side. The template-based interface enables scientists to compare a target supernova to known supernovae by allowing the user to cycle through visual overlays representing known supernovae and transpose these overlays atop target spectrum or light curves. Our design is sufficiently general that it can support both large spectroscopic data sets and these smaller light curve analyses.

### Functionality
The tool supports two views: (1) a spectrum view and (2) a light curve view. Both views draw from a core functionality of selecting, plotting and comparing fits:

- Scroll through comparison spectra or light curves in the form of visual overlays.
- Individually select overlays to transpose on top of the target spectrum that is being studied.
- “Favorite” an overlay or several overlays that fit the target spectrum well.
- Capture the state of the visualization after overlays have been selected. 

Spectrum View
- Apply an on-the-fly moving average transform to the target spectrum.
- Overlay atomic species on the target spectrum, and apply redshifts (z) and doppler shifts (v) to individual species.

### Libraries
The tool is dependent on the following JavaScript libraries, which are delivered via CDN:
- jQuery 2.1.1
- HighCharts
- Bootstrap 3
- Select2 3.5.1

### Primary Data Overlays
Primary data associated with the target spectrum and overlays are comprised of one to many channels.  A HighCharts series represents a single channel, or error associated with that channel. Primary data is assumed to be permanently plotted on the chart, whereas overlays may be charted and uncharted.

The user selects overlays to plot from the select tool. If an overlay is selected, it is kept
on the chart until the chart is cleared or the overlay is unfavorited. An overlay may be 
comprised of several channels. When the user selects an overlay, all channels associated 
with that overlay are plotted.

Every overlay has a number (ID) associated with it. The overlay number is determined by the order 
in which the overlay appears in the JSON data. Because an overlay may be comprised of one to
many channels, several HighCharts series may have the same overlay ID; if this is the case, 
these series belong to the same overlay, and are charted and uncharted simultaneously.   
    
### Uniquely identifying a series on the chart
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

### Transforming Data Channels
Only data channels (series) may be transformed. When transformed, a duplicate of the series
is made, and the transform is applied to the duplicate; the transform duplicate is then plotted 
to the chart. Only one transform of a data channel may exist at any given time.

### Dynamically Generating Transform UIs 
A UI must be generated for any given transform. Thus, after the user selects a transform, a function 
is called to populate the UI assoiciated with that transform. For example, generateMovingAverageUI() 
is called if the user wishes to apply a moving average to data channel(s). 

### Atomic Lines
For now, we store atomic lines in a dictionary locally. The atc-lines content defines a line list for 
each species in a dictionary. The species name is the key, and the value is a list of wavelengths.  
Thus, each species will has a unique name. For example, the convention used for the neutral hydrogen 
species is "H I" where 'H' is the atomic symbol of the element and then a Roman numeral, where 'I' 
means neutral, II means singly ionized, III means doubly ionized, etc. There are a limited list of 
these species that are provided.