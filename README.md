# Plot Spectra and Light Curves
## A Visual Analytics Tool for and Comparing Supernova Spectra and Light Curves

The Dark Energy Survey's supernova (DES-SN) science working group is a geographically-dispersed team of scientists who use observations of distant Type Ia supernovae (SNe) to understand the origin of the accelerating expansion of our universe and to uncover the nature of Dark Energy. DES-SN uses a globally-distributed collection of telescopes, including the world's largest telescopes, to gather spectroscopic follow-up observations. These observations are used to classify the supernovae, measure their redshifts, and extract information to be used to control systematic errors in cosmological inferences. Supernova candidates are chosen for follow-up after analysis and review of fits to light curves, which are represented as time-series measurements of fluxes from DES imaging data.

There are a number of different kinds of light curve fitting programs used by the supernova community today. This visualization tool allows for the comparison of spectra and light curve fits side-by-side. The template-based interface enables scientists to compare a target supernova to known supernovae by allowing the user to cycle through visual overlays representing known supernovae and transpose these overlays atop target spectrum or light curves. Our design is sufficiently general that it can support both large spectroscopic data sets and these smaller light curve analyses.


## Functionality

The tool supports two views: (1) a spectrum view and (2) a light curve view. Both views draw from a core functionality of selecting, plotting and comparing fits:

- Scroll through comparison spectra or light curves in the form of visual overlays.
- Individually select overlays to transpose on top of the target spectrum that is being studied.
- “Favorite” an overlay or several overlays that fit the target spectrum well.
- Capture the state of the visualization after overlays have been selected. 

Spectrum View
- Apply an on-the-fly moving average transform to the target spectrum.
- Overlay atomic species on the target spectrum, and apply redshifts (z) and doppler shifts (v) to individual species.