(function(window, google) {

	var Mapstractor = (function() {
		function Mapstractor(opts) {
			this.opts = opts;
			this.init();
		}
		Mapstractor.prototype = {
			init: function() {
				// Store this as self, so that it is accessible in sub-functions.
				var self = this;
				// Set up constants that multiple sub functions will need.
				var mapElement = document.getElementById(self.opts.mapID);
				self.gMap = new google.maps.Map(mapElement, self.opts.map);
				self.markers = [];
				self.polygons = [];
				self.searchBoxID = null;
				self.directClick = 1;
				self.clickingTimout = null;
				mapElement.style.height = '100%';
				// Call any functions that are required on page load.
				self._positionUI();
				self._createOverlay();
				// Add listeners to the map object.
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
				self.gMap.addListener('idle',function() {
					self.overlay.className = "";
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
			addPolygon: function(encodedCoordinates, color, litRepPlace) {
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
				polygon.addListener('click', function(){
					if (self.directClick) {
						self.clearMarkers();
					} else {
						self.directClick = 1;
					}
					marker = self.updateLocation(litRepPlace);
				});
				polygon.addListener('mouseover',function(){
					this.setOptions({fillOpacity: 0.4, strokeWeight:2});
				}); 
				polygon.addListener('mouseout',function(){
					this.setOptions({fillOpacity: 0.3,strokeWeight:1});
				});
				self.polygons.push(polygon);
			},
			setupSearchbox: function(boxID,buttonID) {
				// Store this as self, so that it is accessible in sub-functions.
				var self = this;
				// Get elements for the search box input and the manual triggering search button.
				var searchBoxElement = document.getElementById(boxID);
				var searchButtonElement = document.getElementById(buttonID);
				// Store ID so that other functions can access it.
				self.searchBoxID = boxID;
				// Set options for autoComplete. We are just allowing regions (cities, states, zip codes, etc) in the United States.
				var options = {types: ['(regions)'], componentRestrictions: {country: "us"} };
				// Create official searchbox and search button API constructs.
				var searchBox = new google.maps.places.Autocomplete(searchBoxElement, options);
				//Set up places service for autoComplete.
				var places = new google.maps.places.PlacesService(self.gMap);

				// Trigger action when map is moved.
				self.gMap.addListener('bounds_changed', function() {
					searchBox.setBounds(self.gMap.getBounds());
				});

				// Trigger action when a search is begun (clicking the search button)
				searchButtonElement.addEventListener("click", function(event) {
					self.searchAsync(searchBoxElement);
				});
				// Trigger action when a search is begun (clicking an option from Autocomplete suggestions)
				searchBox.addListener('place_changed', function() {
					if ( !self.searchSync(searchBox) ) {
						self.searchAsync(searchBoxElement);
					}
				});
			},
			setupShareLocation: function(buttonID) {
				// Store this as self, so that it is accessible in sub-functions.
				var self = this;
				var timeout;
				// Get elements for the search box input and the manual triggering search button.
				var shareLocationButtonElement = document.getElementById(buttonID);
				var searchBoxElement = document.getElementById(self.searchBoxID);
				// Trigger action when a share location button is clicked.
				shareLocationButtonElement.addEventListener("click", function(event) {
					self.overlay.className = "loading";
					self.overlay.getElementsByTagName('span')[0].textContent = "Getting your location...";
					timeout = setTimeout(function() {
						self.overlay.className = "";
					}, 15000);
					navigator.geolocation.getCurrentPosition(function(position){
						var location = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
						var geocoder = new google.maps.Geocoder();
						geocoder.geocode({"location":location }, function(results, status) {
							if (status == google.maps.GeocoderStatus.OK) {
								self.overlay.className = "";
								clearTimeout(timeout);
								var place = results[0]; place.name = place.address_components[0].long_name;
								searchBoxElement.value = place.formatted_address;
								shareLocationButtonElement.className = shareLocationButtonElement.className + " active"
								self.checkAgainstAreas(place);
							}
						});
					}, function() {
						self.overlay.className = "";
					});
				});
			},
			searchSync: function(searchBox) {
				var self = this;
				var place = searchBox.getPlace();
				if (place.geometry) {
					self.checkAgainstAreas(place);
					return true;
				} else {
					return false;
				}
			},
			searchAsync: function(searchBoxElement) {
				var self = this;
				var geocoder = new google.maps.Geocoder();
				var autoCompleteList = document.querySelectorAll(".pac-container");
				var searchText = '';
				if ( autoCompleteList[0].style.display != 'none' ) {
					var firstResult = document.querySelectorAll(".pac-item:first-child");
					searchText = firstResult[0].textContent;
				} else {
					searchText = searchBoxElement.value;
				}
				geocoder.geocode({"address":searchText }, function(results, status) {
					if (status == google.maps.GeocoderStatus.OK) {
						var place = results[0]; place.name = place.address_components[0].long_name;
						searchBoxElement.value = place.formatted_address;
						self.checkAgainstAreas(place);
					}
				});
			},
			checkAgainstAreas: function(place) {
				var self = this;
				var numAreas = self.polygons.length;
				var areas = self.polygons;
				var hasLightingRep = 0;
				place.content = "None";
				self.clearMarkers();
				self.addMarker({place: place});
				for (var i=0; i < numAreas; i++){
					var area = areas[i];
					if (google.maps.geometry.poly.containsLocation(place.geometry.location, area)) {
						self.directClick = 0;
						hasLightingRep = 1;
						google.maps.event.trigger(area,'click', {});
					}
				}
				if (!hasLightingRep) {
					alert('No lighting reps found in your location.');
				} else {
					
				}
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
				if (opts.place.content != "None") {
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
			_createOverlay: function() {
				var self = this;
				// Create HTML elements
				var overlayHTML = document.createElement('div');
				var faderHTML = document.createElement('svg');
				var loaderHTML = document.createElement('div');
				var spanHTML = document.createElement('span');
				var text = document.createTextNode('Starting up...');
				// Add attributes and content to elements
				overlayHTML.id = "overlay";
				overlayHTML.className = "loading";
				spanHTML.appendChild(text);
				// Assemble final overlay element
				overlayHTML.appendChild(faderHTML);
				overlayHTML.appendChild(loaderHTML);
				overlayHTML.appendChild(spanHTML);
				document.body.insertBefore(overlayHTML, document.body.firstChild);
				self.overlay = document.getElementById("overlay");
			},
			_positionUI: function() {
				var self = this;
				var uiWrappers = {
					topLeft: '.controls.top-left',
					topRight: '.controls.top-right',
					bottomLeft: '.controls.bottom-left',
					bottomRight: '.controls.bottom-right',
				};
				
				if (self.opts.uiWrappers) {
					if (self.opts.uiWrappers.topLeft) {uiWrappers.topLeft = self.opts.uiWrappers.topLeft;}
					if (self.opts.uiWrappers.topRight) {uiWrappers.topRight = self.opts.uiWrappers.topRight;}
					if (self.opts.uiWrappers.bottomLeft) {uiWrappers.bottomLeft = self.opts.uiWrappers.bottomLeft;}
					if (self.opts.uiWrappers.bottomRight) {uiWrappers.bottomRight = self.opts.uiWrappers.bottomRight;}
				}
				
				var topLeftElement = document.querySelectorAll(uiWrappers.topLeft);
				var topRightElement = document.querySelectorAll(uiWrappers.topRight);
				var bottomLeftElement = document.querySelectorAll(uiWrappers.bottomLeft);
				var bottomLightElement = document.querySelectorAll(uiWrappers.bottomRight);
				
				if (topLeftElement) { self.gMap.controls[google.maps.ControlPosition.TOP_LEFT].push(topLeftElement[0]); }
				if (topRightElement) { self.gMap.controls[google.maps.ControlPosition.TOP_RIGHT].push(topRightElement[0]); }
				if (bottomLeftElement) { self.gMap.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(bottomLeftElement[0]); }
				if (bottomLightElement) { self.gMap.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(bottomLightElement[0]); }
			},
			_clearSearchBox: function() {
				var self = this;
				var searchBoxElement = document.getElementById(self.searchBoxID);
				searchBoxElement.value = "";
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

	Mapstractor.create = function(opts) {
		return new Mapstractor(opts);
	}

	window.Mapstractor = Mapstractor;

}(window, google));