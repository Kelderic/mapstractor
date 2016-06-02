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
					self.overlay.className = 'overlay';
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

				/* Variable:  clickCallback                        */
				/* Type:      String                               */
				/* Default:   function(){}                         */
				/* Purpose:   This function is the callback which  */
				/*            is called when the polygon registers */
				/*            a click event.                       */
				var clickCallback = 'clickCallback' in params ? params.clickCallback : function(){};

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

				// ADD EVENT LISTENERS TO POLYGON

				polygon.addListener('mouseover',function(){
					this.setOptions({fillOpacity: 0.4, strokeWeight:2});
				}); 
				polygon.addListener('mouseout',function(){
					this.setOptions({fillOpacity: 0.3,strokeWeight:1});
				});
				polygon.addListener('click', clickCallback);

				// ADD POLYGON TO ARRAY OF POLYGONS FOR REFERENCE BY OTHER FUNCTIONS

				self.polygons.push(polygon);

				// RETURN POLYGON TO ALLOW IT TO BE MANIPULATED BY IT'S CREATOR FUNCTION

				return polygon;

			},

			addSearchbox: function(params) {

				// STORE this AS self, SO THAT IT IS ACCESSIBLE IN SUB-FUNCTIONS AND TIMEOUTS.

				var self = this;

				// STATIC VARIABLES

				/* Variable:  magnifyingGlassIcon                  */
				/* Type:      string                               */
				/* Purpose:   This is a static variable containing */
				/*            the SVG magnifying glass icon that   */
				/*            is displayed in the search button.   */
				var magnifyingGlassIcon = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 485.213 485.213"><path d="M471.882,407.567L360.567,296.243c-16.586,25.795-38.536,47.734-64.331,64.321l111.324,111.324 c17.772,17.768,46.587,17.768,64.321,0C489.654,454.149,489.654,425.334,471.882,407.567z"/><path d="M363.909,181.955C363.909,81.473,282.44,0,181.956,0C81.474,0,0.001,81.473,0.001,181.955s81.473,181.951,181.955,181.951 C282.44,363.906,363.909,282.437,363.909,181.955z M181.956,318.416c-75.252,0-136.465-61.208-136.465-136.46 c0-75.252,61.213-136.465,136.465-136.465c75.25,0,136.468,61.213,136.468,136.465 C318.424,257.208,257.206,318.416,181.956,318.416z"/><path d="M75.817,181.955h30.322c0-41.803,34.014-75.814,75.816-75.814V75.816C123.438,75.816,75.817,123.437,75.817,181.955z"/></svg>';

				/* Variable:  settingsIcon                         */
				/* Type:      string                               */
				/* Purpose:   This is a static variable containing */
				/*            the SVG gear icon that is displayed  */
				/*            in the search settings button.       */
				var settingsIcon = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 268.765 268.765" style="enable-background:new 0 0 268.765 268.765;" xml:space="preserve"><path style="fill-rule:evenodd;clip-rule:evenodd;" d="M267.92,119.461c-0.425-3.778-4.83-6.617-8.639-6.617 c-12.315,0-23.243-7.231-27.826-18.414c-4.682-11.454-1.663-24.812,7.515-33.231c2.889-2.641,3.24-7.062,0.817-10.133 c-6.303-8.004-13.467-15.234-21.289-21.5c-3.063-2.458-7.557-2.116-10.213,0.825c-8.01,8.871-22.398,12.168-33.516,7.529 c-11.57-4.867-18.866-16.591-18.152-29.176c0.235-3.953-2.654-7.39-6.595-7.849c-10.038-1.161-20.164-1.197-30.232-0.08 c-3.896,0.43-6.785,3.786-6.654,7.689c0.438,12.461-6.946,23.98-18.401,28.672c-10.985,4.487-25.272,1.218-33.266-7.574 c-2.642-2.896-7.063-3.252-10.141-0.853c-8.054,6.319-15.379,13.555-21.74,21.493c-2.481,3.086-2.116,7.559,0.802,10.214 c9.353,8.47,12.373,21.944,7.514,33.53c-4.639,11.046-16.109,18.165-29.24,18.165c-4.261-0.137-7.296,2.723-7.762,6.597 c-1.182,10.096-1.196,20.383-0.058,30.561c0.422,3.794,4.961,6.608,8.812,6.608c11.702-0.299,22.937,6.946,27.65,18.415 c4.698,11.454,1.678,24.804-7.514,33.23c-2.875,2.641-3.24,7.055-0.817,10.126c6.244,7.953,13.409,15.19,21.259,21.508 c3.079,2.481,7.559,2.131,10.228-0.81c8.04-8.893,22.427-12.184,33.501-7.536c11.599,4.852,18.895,16.575,18.181,29.167 c-0.233,3.955,2.67,7.398,6.595,7.85c5.135,0.599,10.301,0.898,15.481,0.898c4.917,0,9.835-0.27,14.752-0.817 c3.897-0.43,6.784-3.786,6.653-7.696c-0.451-12.454,6.946-23.973,18.386-28.657c11.059-4.517,25.286-1.211,33.281,7.572 c2.657,2.89,7.047,3.239,10.142,0.848c8.039-6.304,15.349-13.534,21.74-21.494c2.48-3.079,2.13-7.559-0.803-10.213 c-9.353-8.47-12.388-21.946-7.529-33.524c4.568-10.899,15.612-18.217,27.491-18.217l1.662,0.043 c3.853,0.313,7.398-2.655,7.865-6.588C269.044,139.917,269.058,129.639,267.92,119.461z M134.595,179.491 c-24.718,0-44.824-20.106-44.824-44.824c0-24.717,20.106-44.824,44.824-44.824c24.717,0,44.823,20.107,44.823,44.824 C179.418,159.385,159.312,179.491,134.595,179.491z"></path></svg>';

				// SETUP VARIABLES FROM USER-DEFINED PARAMETERS

				/* Variable:  location                             */
				/* Type:      String                               */
				/* Default:   'TOP_LEFT'                           */
				/* Purpose:   This string is the physical location */
				/*            where the UI element will be placed  */
				var location = 'location' in params ? params.location : 'TOP_RIGHT';

				/* Variable:  searchOptions                        */
				/* Type:      Object                               */
				/* Default:   {}                                   */
				/* Purpose:   This object holds options for the    */
				/*            Google autoComplete functionality.   */
				/*            Options include:                     */
				/*            types:['(regions)']                  */
				/*            componentRestrictions:{country:'us'} */
				var searchOptions = 'searchOptions' in params ? params.searchOptions : {};

				/* Variable:  showSearchButton                     */
				/* Type:      Boolean                              */
				/* Default:   true                                 */
				/* Purpose:   This boolean determines whether or   */
				/*            not the searchbox will have a button */
				/*            to manually trigger the search.      */
				var showSearchButton = 'showSearchButton' in params ? params.showSearchButton : true;

				/* Variable:  showSearchSettingsButton             */
				/* Type:      Boolean                              */
				/* Default:   false                                */
				/* Purpose:   This boolean determines whether or   */
				/*            not the searchbox will have a button */
				/*            to show advanced search settings.    */
				var showSearchSettingsButton = 'showSearchSettingsButton' in params ? params.showSearchSettingsButton : false;

				/* Variable:  showAutocompleteList                 */
				/* Type:      Boolean                              */
				/* Default:   false                                 */
				/* Purpose:   This boolean determines whether or   */
				/*            not the searchbox will show an       */
				/*            autocomplete list as the user is     */
				/*            typing in the search box.            */
				var showAutocompleteList = 'showAutocompleteList' in params ? params.showAutocompleteList : false;

				/* Variable:  placefoundCallback                       */
				/* Type:      Function                             */
				/* Default:   function(){}                         */
				/* Purpose:   This function is the callback which  */
				/*            is called when the search finds a    */
				/*            place successfully.                  */
				var placefoundCallback = 'placefoundCallback' in params ? params.placefoundCallback : function(){};

				/* Variable:  settingsButtonClickCallback          */
				/* Type:      Function                             */
				/* Default:   function(){}                         */
				/* Purpose:   This function is the callback which  */
				/*            is called when the search finds a    */
				/*            place successfully.                  */
				var settingsButtonClickCallback = 'settingsButtonClickCallback' in params ? params.settingsButtonClickCallback : function(){};

				// CREATE THE HTML CONTROL WRAP

				var searchBoxWrapElement = self._createHTML({tagName:'div', id:'searchBox', className: 'control', styles: {'display':'flex', 'max-width':'100%', 'width':'400px'}, location: self.gMap.controls[google.maps.ControlPosition[location]].j[0]});

				// IF SEARCH SETTINGS BUTTON IS BEING ADDED

				if ( showSearchSettingsButton ) {

					// CREATE HTML ELEMENT FOR THE BUTTON

					var searchSettingsButtonElement = self._createHTML({tagName:'button', location: searchBoxWrapElement, innerHTML: settingsIcon});

					// ASSIGN IT'S CLICK CALLBACK, WHICH IS USER SPECIFIED

					searchSettingsButtonElement.addEventListener('click', settingsButtonClickCallback);

				}

				// IF SEARCH INPUT IS BEING ADDED, WHICH ISN'T OPTIONAL
				// (THIS IF STATEMENT IS ADDED FOR VISUAL CONSISTENCY)

				if ( true ) {

					// CREATE HTML ELEMENT FOR SEARCH INPUT

					var searchInputElement = self._createHTML({tagName:'input',  location: searchBoxWrapElement, styles: {'flex':'1'}, placeholder: 'Search for City, State, or Zip Code...'});

					// CREATE OFFICIAL GOOGLE API AUTOCOMPLETE CONSTRUCT WITH SEARCH INPUT

					var gSearchBox = new google.maps.places.Autocomplete(searchInputElement, searchOptions);

					// TRIGGER ACTION WHEN A SEARCH IS BEGUN VIA THE place_changed EVENT (CLICKING
					// AN OPTION FROM THE AUTOCOMPLETE SUGGESTIONS)IS CLICKED

					gSearchBox.addListener('place_changed', function() {
						var place = gSearchBox.getPlace();
						if (place.geometry) {
							placefoundCallback(place);
						} else {
							self._getPlaceFromAutocompleteSuggestions(placefoundCallback);
						}
					});

					// ADD EVENT LISTENER TO MAP FOR VIEWPORT CHANGE, TO TRIGGER UPDATING THE MAP BOUNDS

					self.gMap.addListener('bounds_changed', function() {
						gSearchBox.setBounds(self.gMap.getBounds());
					});

					// STORE THE AUTOCOMPLETE HTML WRAPPER ELEMENT AS A GLOBAL SO
					// THAT OTHER FUNCTIONS CAN ACCESS IT.

					setTimeout(function() {

						self.autoCompleteList = document.querySelector('.pac-container');

						// IF THE AUTOCOMPLETE LIST IS NOT SPECIFIED TO BE SHOWN, HIDE IT

						if ( ! showAutocompleteList ) {

							self.autoCompleteList.style['opacity'] = 0;
							self.autoCompleteList.style['pointer-events'] = 'none';

						}

					}, 500);

				}

				// IF MANUAL SEARCH TRIGGER BUTTON IS BEING ADDED

				if ( showSearchButton ) {

					// CREATE HTML ELEMENT FOR BUTTON

					var searchButtonElement = self._createHTML({tagName:'button', location: searchBoxWrapElement, innerHTML: magnifyingGlassIcon});

					// ADD EVENT LISTENER WHEN THE SEARCH BUTTON IS CLICKED ON, TO TRIGGER
					// GETTING THE PLACE FROM THE AUTOCOMPLETE LIST MANUALLY AND THEN SEARCHING
					// FOR THAT PLACE

					searchButtonElement.addEventListener('click', function(event) {
						self._getPlaceFromAutocompleteSuggestions(placefoundCallback);
					});

				}

				// STORE THE SEARCH INPUT AS A GOLBAL SO THAT OTHER FUNCTIONS CAN ACCESS IT

				self.searchInputElement = searchInputElement;

			},

			addShareLocationButton: function(params) {

				// STORE this AS self, SO THAT IT IS ACCESSIBLE IN SUB-FUNCTIONS AND TIMEOUTS.

				var self = this;

				// STATIC VARIABLES

				/* Variable:  magnifyingGlassIcon                  */
				/* Type:      string                               */
				/* Purpose:   This is a static variable containing */
				/*            the SVG location icon that is        */
				/*            displayed in the share location      */
				/*            button.                              */
				var locationIcon = '<svg baseProfile="full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M12 54 L0 54 L0 46 L 12 46 A 40 40, 0, 0, 1, 46 12 L 46 0 L 54 0 L 54 12 A 40 40, 0, 0, 1, 88 46 L 100 46 L 100 54 L 88 54 A 40 40, 0, 0, 1, 54 88 L 54 100 L 46 100 L 46 88 A 40 40, 0, 0, 1, 12 54 L 20 50 A 30 30, 0, 0, 0, 80 50 A 30 30, 0, 0, 0, 20 50 Z" /><path d="M28 50 A 22 22, 0, 0, 0, 72 50 A 22 22, 0, 0, 0, 28 50 Z" /></svg>';

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

				// SETUP VARIABLES FROM USER-DEFINED PARAMETERS

				/* Variable:  location                             */
				/* Type:      String                               */
				/* Default:   'TOP_LEFT'                           */
				/* Purpose:   This string is the physical location */
				/*            where the UI element will be placed  */
				var location = 'location' in params ? params.location : 'TOP_RIGHT';

				/* Variable:  placefoundCallback                       */
				/* Type:      Function                             */
				/* Default:   function(){}                         */
				/* Purpose:   This function is the callback which  */
				/*            is called when the search finds a    */
				/*            place successfully.                  */
				var placefoundCallback = 'placefoundCallback' in params ? params.placefoundCallback : function(){};

				// CREATE THE HTML CONTROL WRAP

				var shareLocationWrapElement = self._createHTML({tagName:'div', id:'sharelocation', className: 'control', location: self.gMap.controls[google.maps.ControlPosition[location]].j[0]});

				// CREATE THE HTML CONTROL ELEMENTS

				var shareLocationButtonElement = self._createHTML({tagName:'button', location: shareLocationWrapElement, innerHTML: locationIcon});

				// TRIGGER ACTION WHEN THE SHARE LOCATION BUTTON IS CLICKED

				shareLocationButtonElement.addEventListener('click', function(event) {

					// SHOW THE OVERLAY

					self.overlay.className = 'overlay loading';
					self.overlay.getElementsByTagName('span')[0].textContent = 'Getting your location...';

					// SET TIMEOUT TO 15s TO PREVENT INIFNITE OVERLAY IF USER DOESN'T
					// KNOW WHAT TO DO, OR IGNORES PROMPT FROM BROWSER, OR SELECTS "NOT
					// NOW" WHILE USING FIREFOX.

					timeout = setTimeout(function() {
						self.overlay.className = 'overlay';
					}, 15000);

					// ATTEMPT TO GET USER'S LOCATION FROM BROWSER

					navigator.geolocation.getCurrentPosition(function(position){
						// Success
						var location = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
						var geocoder = new google.maps.Geocoder();
						geocoder.geocode({'location':location }, function(results, status) {
							if (status == google.maps.GeocoderStatus.OK) {
								clearTimeout(timeout);
								self.overlay.className = 'overlay';
								var place = results[0]; place.name = place.address_components[0].long_name;
								self.searchInputElement.value = place.formatted_address;
								shareLocationButtonElement.className = shareLocationButtonElement.className + ' active'
								placefoundCallback(place);
							}
						});
					}, function() {
						// Failure
						self.overlay.className = 'overlay';
					});

				});

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

				if ( self.markers.length > 0 ) {

					self.markers.forEach(function(marker) {
						marker.setMap(null);
					});

					// DELETE MARKERS FROM MARKER RECORDS ARRAY

					self.markers = [];

				}

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

				/* Variable:  clickCallback                        */
				/* Type:      String                               */
				/* Default:   function(){}                         */
				/* Purpose:   This function is the callback which  */
				/*            is called when the marker registers  */
				/*            a click event.                       */
				var clickCallback = 'clickCallback' in params ? params.clickCallback : function(){};

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

				// ADD EVENT LISTENERS TO MARKER

				marker.addListener('click', clickCallback);

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

				self.overlay = self._createHTML({className:'overlay loading', innerHTML:'<svg></svg><div></div><span>Starting up...</span>', });

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

			_getPlaceFromAutocompleteSuggestions: function(placefoundCallback) {

				// STORE this AS self, SO THAT IT IS ACCESSIBLE IN SUB-FUNCTIONS AND TIMEOUTS.

				var self = this;

				// SETUP VARIABLES FROM PROVIDED PARAMETERS

				/* Variable:  placefoundCallback                   */
				/* Type:      function                             */
				/* Default:   N/A                                  */
				/* Purpose:   This function is the callback which  */
				/*            is called when the search finds a    */
				/*            place successfully.                  */
				placefoundCallback = placefoundCallback;			

				// CREATE A GEOCODER USING GOOGLE JS API

				var geocoder = new google.maps.Geocoder();

				// GET THE TEXT CONTENT TO USE TO SEARCH FOR.

				var searchText = self.autoCompleteList.firstElementChild.textContent;

				// USE THE GOOGLE GEOCODER TO SEARCH FOR THE TEXT RETRIEVED ABOVE, AND FROM IT
				// GET A GOOGLE PLACE CONSTRUCT. RUN THE CALLBACK FUNCTION ON THAT PLACE.

				geocoder.geocode({ 'address': searchText }, function(results, status) {
					if (status == google.maps.GeocoderStatus.OK) {
						var place = results[0]; place.name = place.address_components[0].long_name;
						self.searchInputElement.value = place.formatted_address;
						placefoundCallback(place);
					} else {
						console.log('Geocoding the Place from the autoComplete list failed. The status code is: ' + status);
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