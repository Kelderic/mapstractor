(function(window, google) {

	window.Mapstractor = (function() {

		/***************************************/
		/************* INITIALIZE **************/
		/***************************************/

		var Class = function( params ) {

			// STORE this AS self, SO THAT IT IS ACCESSIBLE IN SUB-FUNCTIONS AND TIMEOUTS.

			var self = this;

			// VERIFY REQUIRED PARAMETERS

			/* Variable:  mapID                                */
			/* Type:      String                               */
			/* Default:   N/A (Required)                       */
			/* Purpose:   This string is the ID of the HTML    */
			/*            element which is hardcoded on the    */
			/*            page and will become the wrapper.    */
			params.mapWrapID = 'mapWrapID' in params ? params.mapWrapID : null;
			if ( params.mapWrapID == null ) {
				throw new Error('We\'ve got a problem. Mapstractor requires a hardcoded element on the page to place the Google map inside. This element needs to have an ID which is passed to Mapstractor.');
			}

			/* Variable:  mapOptions                           */
			/* Type:      Object                               */
			/* Default:   N/A (Required)                       */
			/* Purpose:   This object holds the parameters for */
			/*            the Google Map. It is required, so   */
			/*            there is no default.                 */
			params.mapOptions = 'mapOptions' in params ? params.mapOptions : null;
			if ( params.mapOptions == null ) {
				throw new Error('We\'ve got a problem. The Google Maps JS API requires control parameters to create the map. Things like map zoom, map center, etc. An object containing these needs to be given to Mapstractor.');
			}

			// CHECK TO SEE IF THE MAP WRAPPER REALLY EXISTS

			/* Variable:  mapWrap                              */
			/* Type:      HTML Element                         */
			/* Purpose:   This is an element that is hardcoded */
			/*            on the page, which Mapstractor will  */
			/*            use as an outer wrapper for the map  */
			self.mapWrap = document.getElementById(params.mapWrapID);

			// If the map wrapper element doesn't exist, we need to stop and tell the user about the problem.
			if ( self.mapWrap == null ) {
				throw new Error('We\'ve got a problem. Mapstractor was told that the ID of the wrapper element is ' + params.mapWrapID + '. There is no element on the page with that ID.');
			}

			// Ensure that this wrapper element is relatively positioned.
			self.mapWrap.style.position = 'relative';

			// NOW THAT EVERYTHING REQUIRED HAS BEEN VERIFIED, SET UP GOOGLE MAP

			/* Variable:  gMap                                 */
			/* Type:      Google Map Object                    */
			/* Purpose:   This object is the primary Google    */
			/*            Map object.                          */
			self.gMap = new google.maps.Map(_createHTML({styles: {height:'100%'}, location: self.mapWrap}), params.mapOptions);
			self.gMap.mapstractor = self;

			/* Variable:  markerURL                            */
			/* Type:      String                               */
			/* Default:   ''                                   */
			/* Purpose:   This is a URL, pointing to an image, */
			/*            which will be the default marker     */
			/*            icon unless overridden when creating */
			/*            a marker.                            */
			self.markerURL = 'markerURL' in params ? params.markerURL : '';

			/* Variable:  mapClickCallback                     */
			/* Type:      Function                             */
			/* Default:   function(){}                         */
			/* Purpose:   This function will be called when    */
			/*            map itself is clicked. Clicks on     */
			/*            markers, infoboxes, polygons, etc    */
			/*            will not trigger it.                 */
			self.mapClickCallback = 'mapClickCallback' in params ? params.mapClickCallback : function(){};

			// SET UP GLOBAL ARRAYS TO HOLD CURRENT DATA ON THE MAP

			/* Variable:  markers                              */
			/* Type:      Array                                */
			/* Purpose:   This is an array which holds all     */
			/*            markers which are currently on the   */
			/*            map.                                 */
			self.markers = [];

			/* Variable:  infoboxes                            */
			/* Type:      Array                                */
			/* Purpose:   This is an array which holds all     */
			/*            infoboxes which are currently on the */
			/*            map.                                 */
			self.infoboxes = [];

			/* Variable:  polygons                             */
			/* Type:      Array                                */
			/* Purpose:   This is an array which holds all     */
			/*            polygons which are currently on the  */
			/*            map.                                 */
			self.polygons = [];

			// CREATE UI WRAPPERS

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
				self.gMap.controls[google.maps.ControlPosition[wrappers[i].position]].push(_createHTML({
					className: wrappers[i].class,
					location: self.mapWrap
				}));
			}

			// CREATE LOADING/WORKING OVERLAY

			self.overlay = _createHTML({
				className: 'overlay loading',
				innerHTML: '<svg></svg><div></div><span>Starting up...</span>',
				location: self.mapWrap
			});

			// ADD CLICK LISTENERS TO THE MAP OBJECT. USE A TIMEOUT TO ENSURE THAT
			// DOUBLE CLICKS ARE COUNTED.

			var clickingTimout;

			self.gMap.addListener('click', function(){
				clickingTimout = setTimeout(function(){
					self.mapClickCallback();
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

		};

		/***************************************/
		/********** PUBLIC FUNCTIONS ***********/
		/***************************************/

		Class.prototype.addKmlLayer = function( params ) {

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

		};

		Class.prototype.addMarker = function( params ) {

			// STORE this AS self, SO THAT IT IS ACCESSIBLE IN SUB-FUNCTIONS AND TIMEOUTS.

			var self = this;

			// SETUP VARIABLES FROM USER-DEFINED PARAMETERS

			/* Variable:  place                                */
			/* Type:      Custom Google Maps Place Object      */
			/* Default:   {}                                   */
			/* Purpose:   This is a Google Maps place object   */
			/*            that will be used to create a marker */
			/*            as it's location.                    */
			var place = 'place' in params ? params.place : '';

			/* Variable:  infobox                              */
			/* Type:      String                               */
			/* Default:   ''                                   */
			/* Purpose:   This is the content of the infobox   */
			/*            related to this marker. If it is not */
			/*            provided, check for a formatted      */
			/*            in the place. If that exists, use it */
			var infobox = 'infobox' in params ? params.infobox : 'formatted_address' in params.place ? params.place.formatted_address : '';

			/* Variable:  markerURL                            */
			/* Type:      String                               */
			/* Default:   self.markerURL                       */
			/* Purpose:   This is a URL, pointing to an image, */
			/*            which will become the default marker */
			/*            icon unless overridden when creating */
			/*            a marker.                            */
			var markerURL = 'markerURL' in params ? params.markerURL : self.markerURL;

			/* Variable:  clickCallback                        */
			/* Type:      String                               */
			/* Default:   function(){}                         */
			/* Purpose:   This function is the callback which  */
			/*            is called when the marker registers  */
			/*            a click event.                       */
			var clickCallback = 'clickCallback' in params ? params.clickCallback : function(){};

			// SET UP THE OPTIONS OBJECT THAT THE GOOGLE JS API MARKER CREATION FUNCTION REQUIRES

			var markerOptions = {
				title: place.name,
				position: place.geometry.location,
				map: self.gMap
			}

			// IF WE DO HAVE A CUSTOM MARKER URL, ADD AN ICON OBJECT TO THE OPTIONS OBJECT

			if ( markerURL ) {
				markerOptions.icon = {
					url: markerURL,
					scaledSize: new google.maps.Size(50,50)
				}
			}

			// CREATE A GOOGLE MAPS MARKER OBJECT USING THE PROVIDED PLACE AND OPTIONAL MARKER URL INFO

			var marker = new google.maps.Marker(markerOptions);

			// ADD INFOBOX INFORMATION TO MARKER OBJECT

			marker.infobox = infobox;

			// ADD THE MARKER TO THE SET OF CURRENT MARKERS

			self.markers.push(marker);

			// ADD EVENT LISTENERS TO MARKER

			marker.addListener('click', clickCallback);

			// RETURN THE MARKER TO THE FUNCTION THAT REQUESTED IT

			return marker;

		};

		Class.prototype.addPolygon = function( params ) {

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

		};

		Class.prototype.addSearchbox = function( params ) {

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

			/* Variable:  defaultValue                              */
			/* Type:      String                               */
			/* Default:   ''                                   */
			/* Purpose:   This string is the default address   */
			/*            of the searchbox. It is blank unless */
			/*            specified. If it is specified, a     */
			/*            place_changed event is triggered.    */
			var defaultValue = 'defaultValue' in params ? params.defaultValue : '';

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

			/* Variable:  runDefaultPlaceCallback                   @ToDo ... change to runPlaceFoundCallbackForDefaultValue */
			/* Type:      Boolean                              */
			/* Default:   true                                 */
			/* Purpose:   This boolean determines whether the  */
			/*            place found callback should be run   */
			/*            when the default place is found.     */
			var runDefaultPlaceCallback = 'runDefaultPlaceCallback' in params ? params.runDefaultPlaceCallback : true;

			/* Variable:  placefoundCallback                   */
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

			var searchBoxWrapElement = _createHTML({
				tagName: 'div',
				id: 'searchBox',
				className: 'control',
				styles: {
					'display':' flex',
					'max-width': '100%',
					'width': '400px'
				},
				location:self.getControlWrap({location:location})
			});

			// IF SEARCH SETTINGS BUTTON IS BEING ADDED

			if ( showSearchSettingsButton ) {

				// CREATE HTML ELEMENT FOR THE BUTTON

				var searchSettingsButtonElement = _createHTML({
					tagName:'button',
					location: searchBoxWrapElement,
					innerHTML: settingsIcon
				});

				// ASSIGN IT'S CLICK CALLBACK, WHICH IS USER SPECIFIED

				searchSettingsButtonElement.addEventListener('click', settingsButtonClickCallback);

			}

			// IF SEARCH INPUT IS BEING ADDED, WHICH ISN'T OPTIONAL
			// (THIS IF STATEMENT IS ADDED FOR VISUAL CONSISTENCY)

			if ( true ) {

				// CREATE HTML ELEMENT FOR SEARCH INPUT

				var searchInputElement = _createHTML({
					tagName:'input',
					location: searchBoxWrapElement,
					styles: {
						'flex':'1'
					},
					placeholder: 'Search for address here'
				});

				// PREVENT ENTER KEY FROM SUBMITTING A FORM, IF INPUT IS IN FORM

				searchInputElement.addEventListener('keypress', function(event){
					var key = event.charCode || event.keyCode || 0;
					if ( key == 13 ) {
						event.preventDefault();
					}
				}, false);

				// CREATE OFFICIAL GOOGLE API AUTOCOMPLETE CONSTRUCT WITH SEARCH INPUT

				var gSearchBox = new google.maps.places.Autocomplete(searchInputElement, searchOptions);

				// TRIGGER ACTION WHEN A SEARCH IS BEGUN VIA THE place_changed EVENT (CLICKING
				// AN OPTION FROM THE AUTOCOMPLETE SUGGESTIONS)IS CLICKED

				gSearchBox.addListener('place_changed', function() {
					var place = gSearchBox.getPlace();
					if (place && place.geometry) {
						placefoundCallback(place);
					} else {
						self.getPlaceFromAutocompleteSuggestions(placefoundCallback);
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

					// IF DEFAULT IS SPECIFIED, TRIGGER A place_changed EVENT ON THE SEARCHBOX
					// THIS IS INSIDE OF THE TIMEOUT BECAUSE IT REQUIRES THAT THE self.autoCompletelist
					// VARIABLE HAS BEEN CREATED.

					if ( defaultValue ) {

						searchInputElement.value = defaultValue;

						if (runDefaultPlaceCallback) {

							google.maps.event.trigger(gSearchBox, 'place_changed');

						}

					}

				}, 500);

			}

			// IF MANUAL SEARCH TRIGGER BUTTON IS BEING ADDED

			if ( showSearchButton ) {

				// CREATE HTML ELEMENT FOR BUTTON

				var searchButtonElement = _createHTML({
					tagName:'button',
					location: searchBoxWrapElement,
					innerHTML: magnifyingGlassIcon
				});

				// ADD EVENT LISTENER WHEN THE SEARCH BUTTON IS CLICKED ON, TO TRIGGER
				// GETTING THE PLACE FROM THE AUTOCOMPLETE LIST MANUALLY AND THEN SEARCHING
				// FOR THAT PLACE

				searchButtonElement.addEventListener('click', function(event) {
					self.getPlaceFromAutocompleteSuggestions(placefoundCallback);
				});

			}

			// STORE THE SEARCH INPUT AS A GOLBAL SO THAT OTHER FUNCTIONS CAN ACCESS IT

			self.searchInputElement = searchInputElement;

		};

		Class.prototype.addShareLocationButton = function( params ) {

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

			var shareLocationWrapElement = _createHTML({
				tagName: 'div',
				id: 'sharelocation',
				className: 'control',
				location: self.getControlWrap({location:location})
			});

			// CREATE THE HTML CONTROL ELEMENTS

			var shareLocationButtonElement = _createHTML({
				tagName: 'button',
				location: shareLocationWrapElement,
				innerHTML: locationIcon
			});

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

		};

		Class.prototype.updateViewport = function( params ) {

			// STORE this AS self, SO THAT IT IS ACCESSIBLE IN SUB-FUNCTIONS AND TIMEOUTS.

			var self = this;

			// SETUP VARIABLES FROM USER-DEFINED PARAMETERS

			/* Variable:  place                                */
			/* Type:      Custom Google Maps Place Object      */
			/* Default:   ''                                   */
			/* Purpose:   This is a Google Maps place object   */
			/*            that the viewport will focused on.   */
			var place = 'place' in params ? params.place : '';

			/* Variable:  zoom                                 */
			/* Type:      Integer                              */
			/* Default:   6                                    */
			/* Purpose:   This is the level of zoom that the   */
			/*            Google map will change to.           */
			var zoom = 'zoom' in params ? params.zoom : 6;

			// MOVE THE VIEWPORT TO THE SPECIFIED PLACE. ( .fitbounds() IS THE TYPICAL
			// WAY OF DOING THIS. THIS WAY ALLOWS FOR CONTROL OVER THE ZOOM LEVLEL AND
			// IT ANIMATES THE PAN. )

			self.gMap.panTo(place.geometry.location);
			self.gMap.setZoom(zoom);

		};

		Class.prototype.clearMarkers = function() {

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

		};

		Class.prototype.clearInfoboxes = function() {

			// STORE this AS self, SO THAT IT IS ACCESSIBLE IN SUB-FUNCTIONS AND TIMEOUTS.

			var self = this;

			// REMOVE ALL INFOBOXES FROM THE MAP

			if ( self.infoboxes.length > 0 ) {

				self.infoboxes.forEach(function(infobox) {
					infobox.close();
				});

				// DELETE INFOBOXES FROM INFOBOX RECORDS ARRAY

				self.infobox = [];

			}

		};

		Class.prototype.getControlWrap = function( params ) {

			// STORE this AS self, SO THAT IT IS ACCESSIBLE IN SUB-FUNCTIONS AND TIMEOUTS.

			var self = this;

			// SETUP VARIABLES FROM PROVIDED PARAMETERS

			/* Variable:  location                             */
			/* Type:      String                               */
			/* Default:   'TOP_LEFT'                           */
			/* Purpose:   This is the tagName of the element   */
			/*            that is being created.               */
			var location = 'location' in params ? params.location : 'TOP_LEFT';

			// FIND THE SPECIFIED CONTROL WRAPPER ELEMENT BASED ON PROVIDED LOCATION

			var element = self.gMap.controls[google.maps.ControlPosition[location]].getAt(0);

			// RETURN THE CONTROL WRAPPER ELEMENT

			return element;

		};

		Class.prototype.getPlaceFromAutocompleteSuggestions = function( placefoundCallback ) {

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

			var searchText;

			if ( self.autoCompleteList.firstElementChild ) {

				searchText = self.autoCompleteList.firstElementChild.textContent;

			} else if ( self.searchInputElement.value != '' ) {

				searchText = self.searchInputElement.value;

			} else {

				searchText = '';

			}

			if ( searchText ) {

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

			} else {

				console.log('There is nothing to search for (The searchbox and autocomplete list are both empty.');

			}

		};


		/***************************************/
		/********** PRIVATE FUNCTIONS **********/
		/***************************************/

		function _createHTML( params ) {

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
			var location = 'location' in params ? params.location : null;

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
			if ( tagName == 'button' ) {
				element.type = 'button'; 
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

		}

		return Class;

	}());

	/***************************************/
	/********** EXTEND GOOGLE API **********/
	/***************************************/

	google.maps.Polygon.prototype.getCenter = function(){

		// STORE this AS polygon, SO THAT IT IS ACCESSIBLE IN SUB-FUNCTIONS AND TIMEOUTS.

		var polygon = this;

		// CREATE GOOGLE MAPS JS API BOUNDS OBJECT THAT CAN BE WRAPPED SO WE CAN USE
		// BUILD IN getCenter() FUNCTION

		var bounds = new google.maps.LatLngBounds();

		// LOOP THROUGH EVERY POINT IN POLYGON, EXTENDING THE BOUNDS OBJECT TO CONTAIN
		// EVERY ONE

		polygon.getPath().forEach(function(element,index){
			bounds.extend(element)
		});

		// RETURN CENTER OF BOUNDS OJBECT, WHICH IS CENTER OF POLYGON

		return bounds.getCenter();

	}

	google.maps.Marker.prototype.showInfobox = function(){

		// STORE this AS marker, SO THAT IT IS ACCESSIBLE IN SUB-FUNCTIONS AND TIMEOUTS.

		var marker = this;

		// GET TYPICAL self FROM marker

		var self = marker.map.mapstractor;

		// CHECK TO SEE IF THE MARKER HAS INFOBOX CONTENT

		if ( marker.infobox ) {

			// CREATE NEW INFOBOX, OPEN IT ON THE MAP, AND ADD IT TO GLOBAL TRACKING ARRAY

			var infoWindow = new google.maps.InfoWindow({
				content: marker.infobox,
			});

			infoWindow.open(self.gMap, marker);

			self.infoboxes.push(infoWindow);

		}

	}

}(window, google));