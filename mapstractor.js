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
				// Store this as self, so that it is accessible in sub-functions.
				var self = this;

				// Set up global variables
				self.mapWrap = document.getElementById(self.opts.mapWrapID); // Hardcoded map wrapper element.
				self.gMap = new google.maps.Map(self._createMapElement(), self.opts.map); // The main Google Map object
				self.markers = []; // Array that holds all markers
				self.polygons = []; // Array that holds all polygons
				self.searchInputElement = null; // The search text input element
				self.clickIsArtificial = 0; // A boolean that marks whether a click event on polygons is real or artificial
				self.clickingTimout = null; // Timeout to prevent double clicks from triggering the click event on the main map.

				// Call initiation functions.
				self._createUIWrappers();
				self._createOverlay();

				// Add click listeners to the map object. Use a timeout to ensure that double clicks aren't counted.
				self.gMap.addListener('click', function(){
					self.clickingTimout = setTimeout(function(){
						self.clearMarkers();
						self._clearSearchBox();
						document.activeElement.blur();
					}, 200);
				});
				self.gMap.addListener('dblclick', function(){
					clearTimeout(self.clickingTimout);
				});

				// Clear the overlay when the map is finished loading
				self.gMap.addListener('idle',function() {
					self.overlay.className = '';
					google.maps.event.clearListeners(self.gMap, 'idle');
				});
			},

			/***************************************/
			/********** PUBLIC FUNCTIONS ***********/
			/***************************************/

			addKmlLayer: function(params) {

				// SETUP VARIABLES FROM USER-DEFINED PARAMETERS

				/* Variable:  fileURL                              */
				/* Type:      String                               */
				/* Default:   ''                                   */
				/* Purpose:   This is the URL of the KML file that */
				/*            is going to be added to the map. It  */
				/*            is a required parameter.             */
				var fileURL = 'fileURL' in params ? params.fileURL : '';

				// STORE this AS self, SO THAT IT IS ACCESSIBLE IN SUB-FUNCTIONS AND TIMEOUTS.

				var self = this;

				// CREATE KML LAYER ON THE MAP

				var kmlLayer = new google.maps.KmlLayer({
					url: fileURL,
					map: self.gMap
				});

			},

			addPolygon: function(params) {

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

				// STORE this AS self, SO THAT IT IS ACCESSIBLE IN SUB-FUNCTIONS AND TIMEOUTS.

				var self = this;

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

				// STORE this AS self, SO THAT IT IS ACCESSIBLE IN SUB-FUNCTIONS AND TIMEOUTS.

				var self = this;

				// ADD AN EVENT LISTENER ON THE POLYGON, WHICH WILL TRIGGER
				// UPDATING LOCATION TO SHOW THE LINKED PLACE. THIS WILL
				// MOVE THE VIEWPORT TO THE LOCATION AND CREATE A INFOBOX
				// SHOWING INFORMATION ABOUT THE PLACE

				polygon.addListener('click', function(){
					// CHECK TO SEE IF THE CLICK EVENT IS ARTIFICIAL, AND IF IT IS, DON'T
					// CLEAR ALL MARKERS BECAUSE THEY HAVE ALREADY BEEN CLEARED.
					if ( self.clickIsArtificial ) {
						self.clickIsArtificial = 0;
					} else {
						self.clearMarkers();
					}

					self.updateLocation({
						place: place
					});
				});

			},

			addSearchbox: function(params) {

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
				/*            is called when the searchbox finds a */
				/*            place successfully.                  */
				var callback = 'callback' in params ? params.callback : function(){};

				// STORE this AS self, SO THAT IT IS ACCESSIBLE IN SUB-FUNCTIONS AND TIMEOUTS.

				var self = this;

				// CREATE THE HTML ELEMENTS

				var searchInputElement = self._createSearchInput(location);
				var searchButtonElement = self._createSearchButton(location);

				// SET UP THE ELEMENTS WITH THE GOOGLE JS API

				self._setupSearchbox(searchInputElement, searchButtonElement, callback);

			},

			addShareLocationButton: function(params) {

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
				/*            is called when the searchbox finds a */
				/*            place successfully.                  */
				var callback = 'callback' in params ? params.callback : function(){};

				// STORE this AS self, SO THAT IT IS ACCESSIBLE IN SUB-FUNCTIONS AND TIMEOUTS.

				var self = this;

				// CREATE THE HTML ELEMENTS

				var shareLocationButtonElement = self._createShareLocationButton(location);

				// SET UP THE ELEMENTS WITH THE GOOGLE JS API

				self._setupShareLocationButton(shareLocationButtonElement, callback);
			},

			updateLocation: function(params) {

				// SETUP VARIABLES FROM USER-DEFINED PARAMETERS

				/* Variable:  place                                */
				/* Type:      Custom Google Maps Place Object      */
				/* Default:   ''                                   */
				/* Purpose:   This is a Google Maps place object   */
				/*            that the map will focused on.        */
				var place = 'place' in params ? params.place : '';

				// STORE this AS self, SO THAT IT IS ACCESSIBLE IN SUB-FUNCTIONS AND TIMEOUTS.

				var self = this;

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

				// SETUP VARIABLES FROM USER-DEFINED PARAMETERS

				/* Variable:  place                                */
				/* Type:      Custom Google Maps Place Object      */
				/* Default:   ''                                   */
				/* Purpose:   This is a Google Maps place object   */
				/*            that the viewport will focused on.   */
				var place = 'place' in params ? params.place : '';

				// STORE this AS self, SO THAT IT IS ACCESSIBLE IN SUB-FUNCTIONS AND TIMEOUTS.

				var self = this;

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

				// SETUP VARIABLES FROM USER-DEFINED PARAMETERS

				/* Variable:  place                                */
				/* Type:      Custom Google Maps Place Object      */
				/* Default:   ''                                   */
				/* Purpose:   This is a Google Maps place object   */
				/*            that will be used to create a marker */
				/*            as it's location.                    */
				var place = 'place' in params ? params.place : '';

				/* Variable:  icon                                 */
				/* Type:      String                               */
				/* Default:   ''                                   */
				/* Purpose:   This is the URL of the custom image  */
				/*            that is being used as the default    */
				/*            marker.                              */
				var markerURL = 'markerURL' in params ? params.markerURL : '';

				// STORE this AS self, SO THAT IT IS ACCESSIBLE IN SUB-FUNCTIONS AND TIMEOUTS.

				var self = this;

				// CREATE A GOOGLE MAPS MARKER OBJECT USING THE PROVIDED PLACE AND OPTIONAL MARKER URL INFO

				var marker = self._createMarker({
					place: place,
					markerURL: markerURL
				});

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

			_createMapElement: function() {
				// Store this as self, so that it is accessible in sub-functions.
				var self = this;
				// Create html
				var element = document.createElement('div');
					element.style.height = '100%';
				self.mapWrap.appendChild(element);
				return element;
			},

			_createOverlay: function() {
				var self = this;
				// Create HTML elements
				var overlayHTML = document.createElement('div');
				var faderHTML = document.createElement('svg');
				var loaderHTML = document.createElement('div');
				var spanHTML = document.createElement('span');
				var text = document.createTextNode('Starting up...');
				// Add attributes and content to elements
				overlayHTML.id = 'overlay';
				overlayHTML.className = 'loading';
				spanHTML.appendChild(text);
				// Assemble final overlay element
				overlayHTML.appendChild(faderHTML);
				overlayHTML.appendChild(loaderHTML);
				overlayHTML.appendChild(spanHTML);
				// Confirm that the map wrapper is relatively positioned to contain the overlay, just in case it's not already.
				self.mapWrap.style.position = 'relative';
				// Insert the overlay element.
				self.mapWrap.insertBefore(overlayHTML, self.mapWrap.firstElementChild);
				self.overlay = document.getElementById('overlay');
			},

			_createUIWrappers: function() {
				// Store this as self, so that it is accessible in sub-functions.
				var self = this;
				// Create and position all control UI wrapper areas that are on the left side.
				self.gMap.controls[google.maps.ControlPosition.TOP_LEFT].push(self._createUIWrapper('controls left'));
				self.gMap.controls[google.maps.ControlPosition.LEFT_TOP].push(self._createUIWrapper('controls left'));
				self.gMap.controls[google.maps.ControlPosition.BOTTOM_LEFT].push(self._createUIWrapper('controls left'));
				self.gMap.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(self._createUIWrapper('controls left'));
				// Create and position all control UI wrapper areas that are on the right side.
				self.gMap.controls[google.maps.ControlPosition.TOP_RIGHT].push(self._createUIWrapper('controls right'));
				self.gMap.controls[google.maps.ControlPosition.RIGHT_TOP].push(self._createUIWrapper('controls right'));
				self.gMap.controls[google.maps.ControlPosition.BOTTOM_RIGHT].push(self._createUIWrapper('controls right'));
				self.gMap.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(self._createUIWrapper('controls right'));
			},

			_createUIWrapper(className) {
				// Store this as self, so that it is accessible in sub-functions.
				var self = this;
				// Create html
				var element = document.createElement('div');
					element.className = className;
				self.mapWrap.appendChild(element);
				return element;
			},

			_createSearchInput: function(location) {
				// Store this as self, so that it is accessible in sub-functions.
				var self = this;
				// Create html
				var searchInputElement = document.createElement('input');
					searchInputElement.id = 'searchinput';
					searchInputElement.type = 'text';
					searchInputElement.placeholder = 'Search for City, State, or Zip Code...';
				self.gMap.controls[google.maps.ControlPosition[location]].j[0].appendChild(searchInputElement);
				return searchInputElement;
			},

			_createSearchButton: function(location) {
				// Store this as self, so that it is accessible in sub-functions.
				var self = this;
				// Create html
				var searchButtonElement = document.createElement('button');
					searchButtonElement.id = 'searchbutton';
					searchButtonElement.innerHTML = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 485.213 485.213"><path d="M471.882,407.567L360.567,296.243c-16.586,25.795-38.536,47.734-64.331,64.321l111.324,111.324 c17.772,17.768,46.587,17.768,64.321,0C489.654,454.149,489.654,425.334,471.882,407.567z"/><path d="M363.909,181.955C363.909,81.473,282.44,0,181.956,0C81.474,0,0.001,81.473,0.001,181.955s81.473,181.951,181.955,181.951 C282.44,363.906,363.909,282.437,363.909,181.955z M181.956,318.416c-75.252,0-136.465-61.208-136.465-136.46 c0-75.252,61.213-136.465,136.465-136.465c75.25,0,136.468,61.213,136.468,136.465 C318.424,257.208,257.206,318.416,181.956,318.416z"/><path d="M75.817,181.955h30.322c0-41.803,34.014-75.814,75.816-75.814V75.816C123.438,75.816,75.817,123.437,75.817,181.955z"/></svg>';

				self.gMap.controls[google.maps.ControlPosition[location]].j[0].appendChild(searchButtonElement);
				return searchButtonElement;

			},

			_createShareLocationButton: function(location) {
				// Store this as self, so that it is accessible in sub-functions.
				var self = this;
				// Create html
				var shareLocationButtonElement = document.createElement('button');
					shareLocationButtonElement.innerHTML = '<svg baseProfile="full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M12 54 L0 54 L0 46 L 12 46 A 40 40, 0, 0, 1, 46 12 L 46 0 L 54 0 L 54 12 A 40 40, 0, 0, 1, 88 46 L 100 46 L 100 54 L 88 54 A 40 40, 0, 0, 1, 54 88 L 54 100 L 46 100 L 46 88 A 40 40, 0, 0, 1, 12 54 L 20 50 A 30 30, 0, 0, 0, 80 50 A 30 30, 0, 0, 0, 20 50 Z" /><path d="M28 50 A 22 22, 0, 0, 0, 72 50 A 22 22, 0, 0, 0, 28 50 Z" /></svg>';
				self.gMap.controls[google.maps.ControlPosition[location]].j[0].appendChild(shareLocationButtonElement);
				return shareLocationButtonElement;
			},

			_setupShareLocationButton: function(shareLocationButtonElement, callback) {
				// Store this as self, so that it is accessible in sub-functions.
				var self = this;
				var timeout;
				// Trigger action when a share location button is clicked.
				shareLocationButtonElement.addEventListener('click', function(event) {
					self.overlay.className = 'loading';
					self.overlay.getElementsByTagName('span')[0].textContent = 'Getting your location...';
					timeout = setTimeout(function() {
						self.overlay.className = '';
					}, 15000);
					navigator.geolocation.getCurrentPosition(function(position){
						var location = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
						var geocoder = new google.maps.Geocoder();
						geocoder.geocode({'location':location }, function(results, status) {
							if (status == google.maps.GeocoderStatus.OK) {
								self.overlay.className = '';
								clearTimeout(timeout);
								var place = results[0]; place.name = place.address_components[0].long_name;
								self.searchInputElement.value = place.formatted_address;
								shareLocationButtonElement.className = shareLocationButtonElement.className + ' active'
								callback(place);
							}
						});
					}, function() {
						self.overlay.className = '';
					});
				});
			},

			_setupSearchbox: function(searchInputElement, searchButtonElement, callback) {
				// Store this as self, so that it is accessible in sub-functions.
				var self = this;
				// Store Search Input so that other functions can access it.
				self.searchInputElement = searchInputElement;
				// Set options for autoComplete. We are just allowing regions (cities, states, zip codes, etc) in the United States.
				var options = {types: ['(regions)'], componentRestrictions: {country: 'us'} };
				// Create official searchbox and search button API constructs.
				var searchBox = new google.maps.places.Autocomplete(searchInputElement, options);

				// Trigger action when map is moved.
				self.gMap.addListener('bounds_changed', function() {
					searchBox.setBounds(self.gMap.getBounds());
				});

				// Trigger action when a search is begun (clicking the search button)
				searchButtonElement.addEventListener('click', function(event) {
					self._getPlaceFromAutocompleteSuggestions(callback);
				});
				// Trigger action when a search is begun (clicking an option from Autocomplete suggestions)
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
				var self = this;
				var geocoder = new google.maps.Geocoder();
				var autoCompleteList = document.querySelectorAll('.pac-container');
				var searchText = '';
				if ( autoCompleteList[0].style.display != 'none' ) {
					var firstResult = document.querySelectorAll('.pac-item:first-child');
					searchText = firstResult[0].textContent;
				} else {
					searchText = self.searchInputElement.value;
				}
				geocoder.geocode({ 'address': searchText }, function(results, status) {
					if (status == google.maps.GeocoderStatus.OK) {
						var place = results[0]; place.name = place.address_components[0].long_name;
						self.searchInputElement.value = place.formatted_address;
						callback(place);
					}
				});
			},

			_clearSearchBox: function() {
				var self = this;
				self.searchInputElement.value = '';
			},

			_createMarker: function(params) {

				var self = this;

				var options = {
					title: params.place.name,
					position: params.place.geometry.location,
					map: self.gMap
				}

				if ( params.markerURL ) {
					options.icon = {
						url:params.markerURL,
						scaledSize: new google.maps.Size(50,50)
					}
				}
				return new google.maps.Marker(options);
			}

		};
		return Mapstractor;
	}());

}(window, google));