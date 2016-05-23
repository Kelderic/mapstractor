(function(window, google) {

	window.Mapstractor = (function() {
		function Mapstractor(opts) {
			this.opts = opts;
			this.init();
		}
		Mapstractor.prototype = {
			init: function() {
				// Store this as self, so that it is accessible in sub-functions.
				var self = this;

				// Set up global variables
				self.mapWrap = document.getElementById(self.opts.mapWrap); // Hardcoded map wrapper element.
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
			addKmlLayer: function(file) {
				var self = this;
				var kmlLayer = new google.maps.KmlLayer({
					url: file,
					map: self.gMap
				});
			},
			addPolygon: function(encodedCoordinates, color) {
				// Store this as self, so that it is accessible in sub-functions.
				var self = this;
				var coordinates = google.maps.geometry.encoding.decodePath(encodedCoordinates);
				var polygon = new google.maps.Polygon({
					paths: coordinates,
					strokeOpacity: 1,
					strokeWeight: 1,
					strokeColor: 'rgb(100,100,100)',
					fillColor: color,
					fillOpacity:0.4,
				});
				polygon.setMap(self.gMap);
				polygon.addListener('mouseover',function(){
					this.setOptions({fillOpacity: 0.4, strokeWeight:2});
				}); 
				polygon.addListener('mouseout',function(){
					this.setOptions({fillOpacity: 0.3,strokeWeight:1});
				});
				self.polygons.push(polygon);
				return polygon;
			},
			linkPlaceToPolygon: function(polygon, place) {
				// Store this as self, so that it is accessible in sub-functions.
				var self = this;
				// Add an event listener so that when the polygon is triggered, via a real click or a fake click, the specifed place is shown.
				polygon.addListener('click', function(){
					if ( self.clickIsArtificial ) {
						// This is an artificial click event, triggered by a place being
						// contained in this polygon. Don't clear markers in this case.
						self.clickIsArtificial = 0;
					} else {
						self.clearMarkers();
					}
					self.updateLocation(place);
				});
			},
			addSearchbox: function(opts) {
				// Store this as self, so that it is accessible in sub-functions.
				var self = this;
				// Create the html button element.
				var searchInputElement = self._createSearchInput(opts.location);
				var searchButtonElement = self._createSearchButton(opts.location);
				//Setup the button as a Google maps element.
				self._setupSearchbox(searchInputElement, searchButtonElement);
			},
			addShareLocationButton: function(opts) {
				// Store this as self, so that it is accessible in sub-functions.
				var self = this;
				// Create the html button element.
				var shareLocationButtonElement = self._createShareLocationButton(opts.location);
				//Setup the button as a Google maps element.
				self._setupShareLocationButton(shareLocationButtonElement);
			},
			updateLocation: function(place) {
				var self = this;
				// Update markers (Clear old and create new)
				self.addMarker({place: place, icon: self.opts.markerURL});
				// Update the boundary of the map (viewport)
				self.updateViewport(place);
			},
			updateViewport: function(place) {
				var self = this;
				self.gMap.panTo(place.geometry.location);  // .fitbounds() is the official way. I want to control the control the zoom level and animated the pan.
				self.gMap.setZoom(6);
			},
			clearMarkers: function() {
				var self = this;
				self.markers.forEach(function(marker) {
					marker.setMap(null);
				});
				self.markers = [];
			},
			addMarker: function(opts) {
				var self = this;
				var infoWindow;
				var marker = self._createMarker(opts);
				self._addMarker(marker);
				if (opts.place.content != 'None') {
					if (opts.place.content) {
						infoWindow = new google.maps.InfoWindow({
							content: opts.place.content,
						});
					} else {
						infoWindow = new google.maps.InfoWindow({
							content: opts.place.formatted_address
						});
					}
					infoWindow.open(self.gMap, marker);
				}
				return marker;
			},
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
			_setupShareLocationButton: function(shareLocationButtonElement) {
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
								self.checkIfPlaceIsInAreas(place);
							}
						});
					}, function() {
						self.overlay.className = '';
					});
				});
			},
			_setupSearchbox: function(searchInputElement, searchButtonElement) {
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
					self._searchAsync(searchInputElement);
				});
				// Trigger action when a search is begun (clicking an option from Autocomplete suggestions)
				searchBox.addListener('place_changed', function() {
					if ( !self._searchSync(searchBox) ) {
						self._searchAsync(searchInputElement);
					}
				});
			},
			_searchSync: function(searchBox) {
				var self = this;
				var place = searchBox.getPlace();
				if (place.geometry) {
					self.checkIfPlaceIsInAreas(place);
					return true;
				} else {
					return false;
				}
			},
			_searchAsync: function(searchBoxElement) {
				var self = this;
				var geocoder = new google.maps.Geocoder();
				var autoCompleteList = document.querySelectorAll('.pac-container');
				var searchText = '';
				if ( autoCompleteList[0].style.display != 'none' ) {
					var firstResult = document.querySelectorAll('.pac-item:first-child');
					searchText = firstResult[0].textContent;
				} else {
					searchText = searchBoxElement.value;
				}
				geocoder.geocode({'address':searchText }, function(results, status) {
					if (status == google.maps.GeocoderStatus.OK) {
						var place = results[0]; place.name = place.address_components[0].long_name;
						searchBoxElement.value = place.formatted_address;
						self.checkIfPlaceIsInAreas(place);
					}
				});
			},
			checkIfPlaceIsInAreas: function(place) {
				var self = this;
				var numAreas = self.polygons.length;
				var areas = self.polygons;
				var foundContainingArea = 0;
				place.content = 'None';
				self.clearMarkers();
				self.addMarker({place: place});
				for (var i=0; i < numAreas; i++){
					var area = areas[i];
					if (google.maps.geometry.poly.containsLocation(place.geometry.location, area)) {
						// Artificially trigger a click event on the polygon
						self.clickIsArtificial = 1;
						google.maps.event.trigger(area,'click', {});
						// Record that we now have a matching area.
						foundContainingArea = 1;
					}
				}
				if ( ! foundContainingArea ) {
					alert('No lighting reps found in your location.');
				}
			},
			_clearSearchBox: function() {
				var self = this;
				self.searchInputElement.value = '';
			},
			_addMarker: function(marker) {
				var self = this;
				self.markers.push(marker);
			},
			_createMarker: function(opts) {
				var self = this;
				var localOpts = {
					title: opts.place.name,
					position: opts.place.geometry.location,
					map: self.gMap,
					icon: {
						url:opts.icon,
						scaledSize: new google.maps.Size(50,50)
					}
				}
				if (!opts.icon) {delete localOpts.icon;}
				return new google.maps.Marker(localOpts);
			},
		};
		return Mapstractor;
	}());

}(window, google));