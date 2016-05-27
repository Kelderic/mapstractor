(function(window, google) {

	window.Mapstractor = (function() {
		function Mapstractor(opts) {
			this.opts = opts;
			this.init();
		}
		Mapstractor.prototype = {

			/***************************************/
			/************* INITIALIZE **************/
			/***************************************/

			init: function() {

				// STORE this AS self, SO THAT IT IS ACCESSIBLE IN SUB-FUNCTIONS AND TIMEOUTS.

				var self = this;

				// SETUP GLOBAL VARIABLES

				/* Variable:  mapWrap                              */
				/* Type:      HTML Element                         */
				/* Default:   N/A (Required)                       */
				/* Purpose:   This is an element that is hardcoded */
				/*            on the page, which Mapstractor will  */
				/*            use as an outer wrapper for the map  */
				self.mapWrap = document.getElementById(self.opts.mapWrapID);
				// Ensure that this wrapper element is relatively positioned.
				self.mapWrap.style.position = 'relative';

				/* Variable:  gMap                                 */
				/* Type:      Google Map Object                    */
				/* Default:   N/A                                  */
				/* Purpose:   This is the main map object/element. */
				/*            An HTML element is created and then  */
				/*            converted into a Google Maps object. */
				self.gMap = new google.maps.Map(self._createHTML({styles: {height:'100%'}}), self.opts.map);

				/* Variable:  markers                              */
				/* Type:      Array                                */
				/* Default:   []                                   */
				/* Purpose:   This is an array which holds all     */
				/*            markers which are currently on the   */
				/*            map.                                 */
				self.markers = [];

				/* Variable:  polygons                             */
				/* Type:      Array                                */
				/* Default:   []                                   */
				/* Purpose:   This is an array which holds all     */
				/*            polygons which are currently on the  */
				/*            map.                                 */
				self.polygons = [];


				/* Variable:  eventIsArtificial                    */
				/* Type:      Boolean                              */
				/* Default:   false                                */
				/* Purpose:   This is a boolean which can be used  */
				/*            when firing an event to store that   */
				/*            the event is artificial.             */
				self.eventIsArtificial = false;

				// CREATE UI WRAPPERS AND OVERLAY

				self._createUIWrappers();
				self._createOverlay();

				// ADD CLICK LISTENERS TO THE MAP OBJECT. USE A TIMEOUT TO ENSURE THAT
				// DOUBLE CLICKS ARE COUNTED.

				var clickingTimout;

				self.gMap.addListener('click', function(){
					clickingTimout = setTimeout(function(){
						self.clearMarkers();
						self.searchInputElement.value = '';
						document.activeElement.blur();
					}, 200);
				});

				self.gMap.addListener('dblclick', function(){
					clearTimeout(clickingTimout);
				});

				// WHEN THE MAP IS FINISHED WITH ALL INITIALIZATION, CLEAR THE OVERLAY,
				// THEN REMOVE THIS EVENT LISTENER FOR PERFORMANCE
				
				self.gMap.addListener('idle', function() {
					self.overlay.className = '';
					google.maps.event.clearListeners(self.gMap, 'idle');
				});

			},

			/***************************************/
			/********** PUBLIC FUNCTIONS ***********/
			/***************************************/

			addKmlLayer: function(params) {

				// STORE this AS self, SO THAT IT IS ACCESSIBLE IN SUB-FUNCTIONS AND TIMEOUTS.

				var self = this;

				// SETUP VARIABLES FROM USER-DEFINED PARAMETERS

				/* Variable:  fileURL                              */
				/* Type:      String                               */
				/* Default:   ''                                   */
				/* Purpose:   This is the URL of the KML file that */
				/*            is going to be added to the map. It  */
				/*            is a required parameter.             */
				var fileURL = 'fileURL' in params ? params.fileURL : '';

				// CREATE KML LAYER ON THE MAP

				var kmlLayer = new google.maps.KmlLayer({
					url: fileURL,
					map: self.gMap
				});

			},

			addPolygon: function(params) {

				// STORE this AS self, SO THAT IT IS ACCESSIBLE IN SUB-FUNCTIONS AND TIMEOUTS.

				var self = this;

				// SETUP VARIABLES FROM USER-DEFINED PARAMETERS

				/* Variable:  encodedCoordinates                   */
				/* Type:      String                               */
				/* Default:   ''                                   */
				/* Purpose:   This is the encoded coordiates of    */
				/*            polygon, which will be decoded and   */
				/*            used to create a polygon.            */
				var encodedCoordinates = 'encodedCoordinates' in params ? params.encodedCoordinates : '';

				/* Variable:  color                                */
				/* Type:      String                               */
				/* Default:   ''                                   */
				/* Purpose:   This is the color of the polygon.    */
				var color = 'color' in params ? params.color : '';

				// DECODE THE ENCODED COORDIATES

				var coordinates = google.maps.geometry.encoding.decodePath(encodedCoordinates);

				// CREATE THE POLYGON

				var polygon = new google.maps.Polygon({
					paths: coordinates,
					strokeOpacity: 1,
					strokeWeight: 1,
					strokeColor: 'rgb(100,100,100)',
					fillColor: color,
					fillOpacity:0.4,
				});

				// ADD POLYGON TO MAP

				polygon.setMap(self.gMap);

				// ADD EVENT LISTENERS TO POLYGON TO SHOW HOVER EFFECT

				polygon.addListener('mouseover',function(){
					this.setOptions({fillOpacity: 0.4, strokeWeight:2});
				}); 
				polygon.addListener('mouseout',function(){
					this.setOptions({fillOpacity: 0.3,strokeWeight:1});
				});

				// ADD POLYGON TO ARRAY OF POLYGONS FOR REFERENCE BY OTHER FUNCTIONS

				self.polygons.push(polygon);

				// RETURN POLYGON TO ALLOW IT TO BE MANIPULATED BY IT'S CREATOR FUNCTION

				return polygon;

			},

			linkPlaceToPolygon: function(params) {

				// STORE this AS self, SO THAT IT IS ACCESSIBLE IN SUB-FUNCTIONS AND TIMEOUTS.

				var self = this;

				// SETUP VARIABLES FROM USER-DEFINED PARAMETERS

				/* Variable:  polygon                              */
				/* Type:      Google Maps Polygon Object           */
				/* Default:   ''                                   */
				/* Purpose:   This is a Google Maps polygon object */
				/*            that will be linked to a place, via  */
				/*            showing the place when the polygon   */
				/*            clicked on.                          */
				var polygon = 'polygon' in params ? params.polygon : '';

				/* Variable:  place                                */
				/* Type:      Custom Google Maps Place Object      */
				/* Default:   ''                                   */
				/* Purpose:   This is a Google Maps place object   */
				/*            that will be shown in an infobox     */
				/*            when the linked polygon is clicked.  */
				var place = 'place' in params ? params.place : '';

				// ADD AN EVENT LISTENER ON THE POLYGON, WHICH WILL TRIGGER
				// UPDATING LOCATION TO SHOW THE LINKED PLACE. THIS WILL
				// MOVE THE VIEWPORT TO THE LOCATION AND CREATE A INFOBOX
				// SHOWING INFORMATION ABOUT THE PLACE

				polygon.addListener('click', function(){
					// CHECK TO SEE IF THE CLICK EVENT IS ARTIFICIAL, AND IF IT IS, DON'T
					// CLEAR ALL MARKERS BECAUSE THEY HAVE ALREADY BEEN CLEARED.
					if ( self.eventIsArtificial ) {
						self.eventIsArtificial = false;
					} else {
						self.clearMarkers();
					}

					self.updateLocation({
						place: place
					});
				});

			},

			addSearchbox: function(params) {

				// STORE this AS self, SO THAT IT IS ACCESSIBLE IN SUB-FUNCTIONS AND TIMEOUTS.

				var self = this;

				// SETUP VARIABLES FROM USER-DEFINED PARAMETERS

				/* Variable:  location                             */
				/* Type:      String                               */
				/* Default:   'TOP_LEFT'                           */
				/* Purpose:   This string is the physical location */
				/*            where the UI element will be placed  */
				var location = 'location' in params ? params.location : 'TOP_RIGHT';

				/* Variable:  callback                             */
				/* Type:      Function                             */
				/* Default:   function(){}                         */
				/* Purpose:   This function is the callback which  */
				/*            is called when the search finds a    */
				/*            place successfully.                  */
				var callback = 'callback' in params ? params.callback : function(){};

				// CREATE THE HTML ELEMENTS

				var searchButtonIcon = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 485.213 485.213"><path d="M471.882,407.567L360.567,296.243c-16.586,25.795-38.536,47.734-64.331,64.321l111.324,111.324 c17.772,17.768,46.587,17.768,64.321,0C489.654,454.149,489.654,425.334,471.882,407.567z"/><path d="M363.909,181.955C363.909,81.473,282.44,0,181.956,0C81.474,0,0.001,81.473,0.001,181.955s81.473,181.951,181.955,181.951 C282.44,363.906,363.909,282.437,363.909,181.955z M181.956,318.416c-75.252,0-136.465-61.208-136.465-136.46 c0-75.252,61.213-136.465,136.465-136.465c75.25,0,136.468,61.213,136.468,136.465 C318.424,257.208,257.206,318.416,181.956,318.416z"/><path d="M75.817,181.955h30.322c0-41.803,34.014-75.814,75.816-75.814V75.816C123.438,75.816,75.817,123.437,75.817,181.955z"/></svg>';
				var searchInputElement = self._createHTML({tagName:'input', placeholder: 'Search for City, State, or Zip Code...', location: self.gMap.controls[google.maps.ControlPosition[location]].j[0]});
				var searchButtonElement = self._createHTML({tagName:'button', innerHTML: searchButtonIcon, location: self.gMap.controls[google.maps.ControlPosition[location]].j[0]});

				// STORE THE SEARCH INPUT AS A GOLBAL SO THAT OTHER FUNCTIONS CAN ACCESS IT

				self.searchInputElement = searchInputElement;

				// SET UP THE ELEMENTS WITH THE GOOGLE JS API

				self._setupSearchbox(searchInputElement, searchButtonElement, callback);

			},

			addShareLocationButton: function(params) {

				// STORE this AS self, SO THAT IT IS ACCESSIBLE IN SUB-FUNCTIONS AND TIMEOUTS.

				var self = this;

				// SETUP VARIABLES FROM USER-DEFINED PARAMETERS

				/* Variable:  location                             */
				/* Type:      String                               */
				/* Default:   'TOP_LEFT'                           */
				/* Purpose:   This string is the physical location */
				/*            where the UI element will be placed  */
				var location = 'location' in params ? params.location : 'TOP_RIGHT';

				/* Variable:  callback                             */
				/* Type:      function                             */
				/* Default:   function(){}                         */
				/* Purpose:   This function is the callback which  */
				/*            is called when the search finds a    */
				/*            place successfully.                  */
				var callback = 'callback' in params ? params.callback : function(){};

				// CREATE THE HTML ELEMENTS

				var shareLocationButtonIcon = '<svg baseProfile="full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M12 54 L0 54 L0 46 L 12 46 A 40 40, 0, 0, 1, 46 12 L 46 0 L 54 0 L 54 12 A 40 40, 0, 0, 1, 88 46 L 100 46 L 100 54 L 88 54 A 40 40, 0, 0, 1, 54 88 L 54 100 L 46 100 L 46 88 A 40 40, 0, 0, 1, 12 54 L 20 50 A 30 30, 0, 0, 0, 80 50 A 30 30, 0, 0, 0, 20 50 Z" /><path d="M28 50 A 22 22, 0, 0, 0, 72 50 A 22 22, 0, 0, 0, 28 50 Z" /></svg>';
				var shareLocationButtonElement = self._createHTML({tagName:'button', innerHTML: shareLocationButtonIcon, location: self.gMap.controls[google.maps.ControlPosition[location]].j[0]});

				// SET UP THE ELEMENTS WITH THE GOOGLE JS API

				self._setupShareLocationButton(shareLocationButtonElement, callback);
			},

			updateLocation: function(params) {

				// STORE this AS self, SO THAT IT IS ACCESSIBLE IN SUB-FUNCTIONS AND TIMEOUTS.

				var self = this;

				// SETUP VARIABLES FROM USER-DEFINED PARAMETERS

				/* Variable:  place                                */
				/* Type:      Custom Google Maps Place Object      */
				/* Default:   ''                                   */
				/* Purpose:   This is a Google Maps place object   */
				/*            that the map will focused on.        */
				var place = 'place' in params ? params.place : '';

				// ADD NEW MARKER

				self.addMarker({
					place: place,
					markerURL: self.opts.markerURL
				});

				// MOVE THE VIEWPORT OF THE MAP TO THE NEW MARKER

				self.updateViewport({
					place: place
				});

			},

			updateViewport: function(params) {

				// STORE this AS self, SO THAT IT IS ACCESSIBLE IN SUB-FUNCTIONS AND TIMEOUTS.

				var self = this;

				// SETUP VARIABLES FROM USER-DEFINED PARAMETERS

				/* Variable:  place                                */
				/* Type:      Custom Google Maps Place Object      */
				/* Default:   ''                                   */
				/* Purpose:   This is a Google Maps place object   */
				/*            that the viewport will focused on.   */
				var place = 'place' in params ? params.place : '';

				// MOVE THE VIEWPORT TO THE SPECIFIED PLACE. ( .fitbounds() IS THE TYPICAL
				// WAY OF DOING THIS. THIS WAY ALLOWS FOR CONTROL OVER THE ZOOM LEVLEL AND
				// IT ANIMATES THE PAN. )

				self.gMap.panTo(place.geometry.location);
				self.gMap.setZoom(6);

			},

			clearMarkers: function() {

				// STORE this AS self, SO THAT IT IS ACCESSIBLE IN SUB-FUNCTIONS AND TIMEOUTS.

				var self = this;

				// REMOVE ALL MARKERS FROM THE MAP

				self.markers.forEach(function(marker) {
					marker.setMap(null);
				});

				// DELETE MARKERS

				self.markers = [];

			},

			addMarker: function(params) {

				// STORE this AS self, SO THAT IT IS ACCESSIBLE IN SUB-FUNCTIONS AND TIMEOUTS.

				var self = this;

				// SETUP VARIABLES FROM USER-DEFINED PARAMETERS

				/* Variable:  place                                */
				/* Type:      Custom Google Maps Place Object      */
				/* Default:   ''                                   */
				/* Purpose:   This is a Google Maps place object   */
				/*            that will be used to create a marker */
				/*            as it's location.                    */
				var place = 'place' in params ? params.place : '';

				/* Variable:  markerURL                            */
				/* Type:      String                               */
				/* Default:   ''                                   */
				/* Purpose:   This is the URL of the custom image  */
				/*            that is being used as the default    */
				/*            marker.                              */
				var markerURL = 'markerURL' in params ? params.markerURL : '';

				// CREATE A GOOGLE MAPS MARKER OBJECT USING THE PROVIDED PLACE AND OPTIONAL MARKER URL INFO

				var marker = self._createMarker(place, markerURL);

				// ADD THE MARKER TO THE SET OF CURRENT MARKERS

				self.markers.push(marker);

				// IF THE PLACE HAS AN INFOBOX, CREATE THAT INFOBOX AND OPEN IT ON THE MAP

				if ( place.infobox != false ) {
					if (place.content) {
						var infoWindow = new google.maps.InfoWindow({
							content: place.content,
						});
					} else {
						var infoWindow = new google.maps.InfoWindow({
							content: place.formatted_address
						});
					}
					infoWindow.open(self.gMap, marker);
				}

				// RETURN THE MARKER TO THE FUNCTION THAT REQUESTED IT

				return marker;

			},

			/***************************************/
			/********** PRIVATE FUNCTIONS **********/
			/***************************************/

			_createUIWrappers: function() {

				// STORE this AS self, SO THAT IT IS ACCESSIBLE IN SUB-FUNCTIONS AND TIMEOUTS.

				var self = this;

				// SET UP OBJECT WITH ALL DESIRED WRAPPER LOCATIONS

				var wrappers = [
					{position: 'TOP_LEFT', class: 'controls left'},
					{position: 'LEFT_TOP', class: 'controls left'},
					{position: 'BOTTOM_LEFT', class: 'controls left'},
					{position: 'LEFT_BOTTOM', class: 'controls left'},
					{position: 'TOP_RIGHT', class: 'controls right'},
					{position: 'RIGHT_TOP', class: 'controls right'},
					{position: 'BOTTOM_RIGHT', class: 'controls right'},
					{position: 'RIGHT_BOTTOM', class: 'controls right'},
				]

				// LOOP THROUGH WRAPPER OBJECT AND CREATE WRAPPER ELEMENTS

				for ( var i=0, l=wrappers.length; i<l; i++ ) {
					self.gMap.controls[google.maps.ControlPosition[wrappers[i].position]].push(self._createHTML({className: wrappers[i].class}));
				}

			},

			_createOverlay: function() {

				// STORE this AS self, SO THAT IT IS ACCESSIBLE IN SUB-FUNCTIONS AND TIMEOUTS.

				var self = this;

				// CREATE THE WRAPPER ELEMENT AND PLACE IT ON THE MAP, THEN STORE IT IN A GLOBAL

				self.overlay = self._createHTML({id:'overlay', className:'loading', innerHTML:'<svg></svg><div></div><span>Starting up...</span>', });

			},

			_createHTML: function(params) {

				// STORE this AS self, SO THAT IT IS ACCESSIBLE IN SUB-FUNCTIONS AND TIMEOUTS.

				var self = this;

				// SETUP VARIABLES FROM PROVIDED PARAMETERS

				/* Variable:  tagName                              */
				/* Type:      String                               */
				/* Default:   'div'                                */
				/* Purpose:   This is the tagName of the element   */
				/*            that is being created.               */
				var tagName = 'tagName' in params ? params.tagName : 'div';

				/* Variable:  id                                   */
				/* Type:      String                               */
				/* Default:   ''                                   */
				/* Purpose:   This is the id of the element that   */
				/*            is being created.                    */
				var id = 'id' in params ? params.id : '';

				/* Variable:  className                            */
				/* Type:      String                               */
				/* Default:   ''                                   */
				/* Purpose:   This is the list of classes of the   */
				/*            element that is being created.       */
				var className = 'className' in params ? params.className : '';

				/* Variable:  type                                 */
				/* Type:      String                               */
				/* Default:   '' | 'text'                          */
				/* Purpose:   This is the type attribute, only     */
				/*            used if the tagName is 'input'       */
				var type = 'type' in params ? params.type : ( tagName == 'input' ? 'text' : '' );

				/* Variable:  placeholder                          */
				/* Type:      String                               */
				/* Default:   ''                                   */
				/* Purpose:   This is the placeholder attribute,   */
				/*            used if the tagName is 'input' or    */
				/*            textarea.                            */
				var placeholder = 'placeholder' in params ? params.placeholder : '';

				/* Variable:  style                                */
				/* Type:      String                               */
				/* Default:   ''                                   */
				/* Purpose:   This is an object containing any     */
				/*            styles that should be hardcoded on   */
				/*            the element that is being created.   */
				var styles = 'styles' in params ? params.styles : {};

				/* Variable:  innerHTML                            */
				/* Type:      String                               */
				/* Default:   ''                                   */
				/* Purpose:   This is the HTML content that will   */
				/*            be placed inside the created element */
				/*            using .innerHTML().                  */
				var innerHTML = 'innerHTML' in params ? params.innerHTML : '';

				/* Variable:  location                             */
				/* Type:      HTML Element                         */
				/* Default:   self.mapWrap                         */
				/* Purpose:   This is an HTML element that the new */
				/*            created element will be appended to. */
				var location = 'location' in params ? params.location : self.mapWrap;

				// CREATE HTML ELEMENT

				var element = document.createElement(tagName);

				element.id = id;
				element.className = className;
				if ( tagName == 'input' || tagName == 'textarea' ) {
					element.placeholder = placeholder;
					if ( tagName == 'input' ) {
						element.type = type;
					}
				}
				for (var style in styles) {
					if (styles.hasOwnProperty(style)) {
						element.style[style] = styles[style];
					}
				}

				element.innerHTML = innerHTML;

				// ADD ELEMENT TO PAGE

				location.appendChild(element);

				// RETURN THE MARKER TO THE FUNCTION THAT REQUESTED IT

				return element;

			},

			_setupShareLocationButton: function(shareLocationButtonElement, callback) {

				// STORE this AS self, SO THAT IT IS ACCESSIBLE IN SUB-FUNCTIONS AND TIMEOUTS.

				var self = this;

				// SETUP VARIABLES FROM PROVIDED PARAMETERS

				/* Variable:  shareLocationButtonElement           */
				/* Type:      HTML Element                         */
				/* Default:   N/A                                  */
				/* Purpose:   This is the HTML button element that */
				/*            triggers the browser to ask the user */
				/*            to share their geographic location.  */
				shareLocationButtonElement = shareLocationButtonElement;

				/* Variable:  callback                             */
				/* Type:      function                             */
				/* Default:   N/A                                  */
				/* Purpose:   This function is the callback which  */
				/*            is called when the search finds a    */
				/*            place successfully.                  */
				callback = callback;			

				/* Variable:  timeout                              */
				/* Type:      Javascript Timeout                   */
				/* Default:   null                                 */
				/* Purpose:   This holds a javascript timeout that */
				/*            is set when the share location       */
				/*            button is clicked. This is needed    */
				/*            because Firefox's handling of the    */
				/*            geolocation API is broken. After 15s */
				/*            of no response, the overlay will be  */
				/*            hidden.                              */
				var timeout;

				// TRIGGER ACTION WHEN THE SHARE LOCATION BUTTON IS CLICKED

				shareLocationButtonElement.addEventListener('click', function(event) {

					// SHOW THE OVERLAY

					self.overlay.className = 'loading';
					self.overlay.getElementsByTagName('span')[0].textContent = 'Getting your location...';

					// SET TIMEOUT TO 15s TO PREVENT INIFNITE OVERLAY IF USER DOESN'T
					// KNOW WHAT TO DO, OR IGNORES PROMPT FROM BROWSER, OR SELECTS "NOT
					// NOW" WHILE USING FIREFOX.

					timeout = setTimeout(function() {
						self.overlay.className = '';
					}, 15000);

					// ATTEMPT TO GET USER'S LOCATION FROM BROWSER

					navigator.geolocation.getCurrentPosition(function(position){
						// Success
						var location = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
						var geocoder = new google.maps.Geocoder();
						geocoder.geocode({'location':location }, function(results, status) {
							if (status == google.maps.GeocoderStatus.OK) {
								clearTimeout(timeout);
								self.overlay.className = '';
								var place = results[0]; place.name = place.address_components[0].long_name;
								self.searchInputElement.value = place.formatted_address;
								shareLocationButtonElement.className = shareLocationButtonElement.className + ' active'
								callback(place);
							}
						});
					}, function() {
						// Failure
						self.overlay.className = '';
					});

				});

			},

			_setupSearchbox: function(searchInputElement, searchButtonElement, callback) {

				// STORE this AS self, SO THAT IT IS ACCESSIBLE IN SUB-FUNCTIONS AND TIMEOUTS.

				var self = this;

				// SETUP VARIABLES FROM PROVIDED PARAMETERS

				/* Variable:  searchInputElement                   */
				/* Type:      HTML Element                         */
				/* Default:   N/A                                  */
				/* Purpose:   This is the HTML input element that  */
				/*            is going to be turned in a Google    */
				/*            Autocomplete search box.             */
				searchInputElement = searchInputElement;

				/* Variable:  searchButtonElement                  */
				/* Type:      HTML Element                         */
				/* Default:   N/A                                  */
				/* Purpose:   This is the HTML button element that */
				/*            has a magnifying glass icon, beside  */
				/*            the search input. Clicking on it     */
				/*            triggers the browser to search for   */
				/*            a place.                             */
				searchButtonElement = searchButtonElement;

				/* Variable:  callback                             */
				/* Type:      function                             */
				/* Default:   N/A                                  */
				/* Purpose:   This function is the callback which  */
				/*            is called when the search finds a    */
				/*            place successfully.                  */
				callback = callback;			

				/* Variable:  options                              */
				/* Type:      Object                               */
				/* Default:   N/A                                  */
				/* Purpose:   This object holds options for the    */
				/*            Google autoComplete functionality.   */
				/*            Currently, only regions (cities,     */
				/*            states, zip codes, etc) in the       */
				/*            United States. are allowed.          */
				/*            @Todo:                               */
				/*            Allow the this to be an option that  */
				/*            the user can specify when calling    */
				/*            Mapstractor.                         */
				var options = {
					types: ['(regions)'],
					componentRestrictions: {country: 'us'}
				};

				// CREATE OFFICIAL SEARCHBOX GOOGLE API CONSTRUCT

				var searchBox = new google.maps.places.Autocomplete(searchInputElement, options);

				// ADD EVENT LISTENER FOR MAP MOVING, TO TRIGGER UPDATING THE MAP BOUNDS

				self.gMap.addListener('bounds_changed', function() {
					searchBox.setBounds(self.gMap.getBounds());
				});

				// ADD EVENT LISTENER WHEN THE SEARCH BUTTON IS CLICKED ON, TO TRIGGER
				// GETTING THE PLACE FROM THE AUTOCOMPLETE LIST MANUALLY AND THEN SEARCHING
				// FOR THAT PLACE

				searchButtonElement.addEventListener('click', function(event) {
					self._getPlaceFromAutocompleteSuggestions(callback);
				});


				// TRIGGER ACTION WHEN A SEARCH IS BEGUN VIA THE place_changed EVENT (CLICKING
				// AN OPTION FROM THE AUTOCOMPLETE SUGGESTIONS)IS CLICKED

				searchBox.addListener('place_changed', function() {
					var place = searchBox.getPlace();
					if (place.geometry) {
						callback(place);
					} else {
						self._getPlaceFromAutocompleteSuggestions(callback);
					}
				});

			},

			_getPlaceFromAutocompleteSuggestions: function(callback) {

				// STORE this AS self, SO THAT IT IS ACCESSIBLE IN SUB-FUNCTIONS AND TIMEOUTS.

				var self = this;

				// SETUP VARIABLES FROM PROVIDED PARAMETERS

				/* Variable:  callback                             */
				/* Type:      function                             */
				/* Default:   N/A                                  */
				/* Purpose:   This function is the callback which  */
				/*            is called when the search finds a    */
				/*            place successfully.                  */
				callback = callback;			

				// CREATE A GEOCODER USING GOOGLE JS API

				var geocoder = new google.maps.Geocoder();

				// GRAB THE DOM ELEMENT CONTAINING THE CURRENT AUTOCOMPLETE LIST

				var autoCompleteList = document.querySelectorAll('.pac-container');


				// GRAB THE FIRST ELEMENT FROM THE AUTOCOMPLETE LIST, AND GET THE TEXT
				// CONTENT TO USE TO SEARCH FOR.
				
				var firstResult = document.querySelectorAll('.pac-item:first-child');
				var searchText = firstResult[0].textContent;

				// USE THE GOOGLE GEOCODER TO SEARCH FOR THE TEXT RETRIEVED ABOVE, AND FROM IT
				// GET A GOOGLE PLACE CONSTRUCT. RUN THE CALLBACK FUNCTION ON THAT PLACE.

				geocoder.geocode({ 'address': searchText }, function(results, status) {
					if (status == google.maps.GeocoderStatus.OK) {
						var place = results[0]; place.name = place.address_components[0].long_name;
						self.searchInputElement.value = place.formatted_address;
						callback(place);
					}
				});

			},

			_createMarker: function(place, markerURL) {

				// STORE this AS self, SO THAT IT IS ACCESSIBLE IN SUB-FUNCTIONS AND TIMEOUTS.

				var self = this;

				// SETUP VARIABLES FROM PROVIDED PARAMETERS

				/* Variable:  place                                */
				/* Type:      Custom Google Maps Place Object      */
				/* Default:   N/A                                  */
				/* Purpose:   This is a Google Maps place object   */
				/*            that will be used to create a marker */
				/*            as it's location.                    */
				place = place;

				/* Variable:  markerURL                            */
				/* Type:      String                               */
				/* Default:   N/A                                  */
				/* Purpose:   This is the URL of the custom image  */
				/*            that is being used as the default    */
				/*            marker.                              */
				markerURL = markerURL;

				// SET UP THE OPTIONS OBJECT THAT THE GOOGLE JS API MARKER CREATION FUNCTION REQUIRES

				var options = {
					title: place.name,
					position: place.geometry.location,
					map: self.gMap
				}

				// IF WE DO HAVE A CUSTOM MARKER URL, ADD AN ICON OBJECT TO THE OPTIONS OBJECT

				if ( markerURL ) {
					options.icon = {
						url:markerURL,
						scaledSize: new google.maps.Size(50,50)
					}
				}

				// CREATE THE MARKER OBJECT AND RETURN IT.

				return new google.maps.Marker(options);

			}

		};
		return Mapstractor;
	}());

	google.maps.Polygon.prototype.getCenter = function(){
		var bounds = new google.maps.LatLngBounds()
		this.getPath().forEach(function(element,index){bounds.extend(element)})
		return bounds.getCenter();
	}

}(window, google));