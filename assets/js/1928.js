$('document').ready(function() {
	var animationDuration = 500;

	// texts for social media
	var share_tweet = "Berlin 1928 und Heute."; // @mk Insert Text for Twitter Sharing here
	var share_url = function(){ return "https://1928.tagesspiegel.de/" }; // Share URL function. (in case you want to add geodata)

	// cache some dom elemenst
	var $container = $('#container');

	var locationhash = '';
	
	var slider = new Slider();

	// detect if we are inside a frame
	if (window.self !== window.top) {
		$container.addClass("in-frame");
		if (window.location.hash === "#show-intro") {
			$container.addClass("show-intro");
		} else {
			$container.addClass("show-content");
		}
	} else {
		// always show intro
		$container.addClass("show-intro");
	}
	
	// detect touch like leaflet
	if (!window.L_NO_TOUCH && ((window.PointerEvent || (!window.PointerEvent && window.MSPointerEvent)) || 'ontouchstart' in window || (window.DocumentTouch && document instanceof window.DocumentTouch))) {
		$container.addClass("has-touch");
	}

	// detect small viewports class on window resize
	$(window).resize(function() {
		$container.toggleClass('small', ($container.width() < 720) || ($container.width()*($container.height()-140) < 545000));
	});
	$(window).trigger('resize');

	// init and synchronize maps
	var map1928, map2015;
	initMaps();

	/* content */
	var stories = [];
	var currentStoryIndex = 0;
	$.getJSON('assets/data/data.json', function(data) {
		stories = data;
		
		// prepare content
		setContent($('#content-1928'), stories[0].content[0]);
		setContent($('#content-2015'), stories[0].content[1]);

		$container.addClass('ready');

		// add map markers
		data.forEach(function (story, index) {
			story.bounds = L.latLngBounds(story.bounds);
			story.point = story.bounds.getCenter();

			var iconInfo = L.divIcon({
				iconSize:  [32,32],
				iconAnchor:[16,16],
				html:      '<div class="marker-info"><i class="icon-info"></i></div>',
				className: 'marker-wrapper'
			});
			
			var marker1 = L.marker(story.point.clone(), {keyboard:false, icon:iconInfo}).addTo(map1928);
			var marker2 = L.marker(story.point.clone(), {keyboard:false, icon:iconInfo}).addTo(map2015);
			
			marker1.on('mouseover', function () {
				$(marker1._icon).addClass('hover');
				$(marker2._icon).addClass('hover');
			})
			marker1.on('mouseout', function () {
				$(marker1._icon).removeClass('hover');
				$(marker2._icon).removeClass('hover');
			})
			marker1.on('click', function markerClick() {
				var x = map1928.latLngToContainerPoint(story.point.clone()).x;
				gotoStory(index, slider.isInRightMap(x), true);
			});
		})
	});

	function zoomToStory(story, animate) {
		var zoom = getBoundsZoom(story.bounds);

		var point = map1928.project(story.point.clone(), zoom);
		if ($container.hasClass('small')) {
			point.y += ($container.height()/4);
		} else {
			point.x -= ($container.width()/4);
		}
		point = map1928.unproject(point, zoom);

		map1928.setView(point, zoom, {animate:animate});

		function getBoundsZoom (bounds, padding) {
			var zoom = map1928.getMinZoom(),
			    maxZoom = map1928.getMaxZoom(),
			    size = map1928.getSize(),

			    nw = bounds.getNorthWest(),
			    se = bounds.getSouthEast(),

			    zoomNotFound = true,
			    boundsSize;

			if ($container.hasClass('small')) {
				size.y /= 2;
			} else {
				size.x /= 2;
			}

			padding = L.point(padding || [0, 0]);

			do {
				zoom++;
				boundsSize = map1928.project(se, zoom).subtract(map1928.project(nw, zoom)).add(padding).floor();
				zoomNotFound = size.contains(boundsSize);

			} while (zoomNotFound && zoom <= maxZoom);

			return zoom - 1;
		}
	};
	
	/* controls for the map */
	$('.zoom-in','#controls').click(function(evt){
		evt.preventDefault();
		map1928.zoomIn();
	});

	$('.zoom-out','#controls').click(function(evt){
		evt.preventDefault();
		map1928.zoomOut();
	});

	/* explore */
	$('#button-explore, .goto-explore').click(function(evt){
		evt.preventDefault();
		gotoExplore();
	});
		
	/* storyline */
	$('#button-start').click(function(evt) {
		evt.preventDefault();
		if (stories.length === 0) return;
		gotoStory(0);
	});
	
	$('#goto-2015').click(function(evt) {
		evt.preventDefault();
		slider.slideTo(0);
	});
	
	$('#goto-1928').click(function(evt) {
		evt.preventDefault();
		slider.slideTo(1);
	});
	
	$('#goto-next').click(function(evt) {
		evt.preventDefault();
		var index = (currentStoryIndex || 0)+1;
		if (index >= stories.length) return gotoExplore();
		gotoStory(index);
	});

	$('#goto-back').click(function(evt){
		evt.preventDefault();
		var index = (currentStoryIndex || 0)-1;
		if (index < 0) return gotoIntro();
		gotoStory(index);
	});

	function gotoIntro() {
		slider.slideTo(0.5);
		setVisibility('show-intro');
	}

	function gotoExplore() {
		slider.slideTo(0.5);
		setVisibility('show-explore');
	}

	function gotoStory(index, jumpTo2015, animate) {
		currentStoryIndex = index;

		if (jumpTo2015) {
			setContent($('#content-2015'), stories[index].content[1]);
		} else {
			setContent($('#content-1928'), stories[index].content[0]);
		}

		// set slider to 1928
		slider.slideTo(jumpTo2015 ? 0 : 1, function () {
			if (jumpTo2015) {
				setContent($('#content-1928'), stories[index].content[0]);
			} else {
				setContent($('#content-2015'), stories[index].content[1]);
			}
		});

		var instant = setVisibility('show-content');
		if (instant) {
			zoomToStory(stories[index], animate);
		} else {
			setTimeout(function () {
				zoomToStory(stories[index], animate);
			}, animationDuration);
		}
	}

	function setVisibility(newClassName) {
		if ($container.hasClass(newClassName)) return true;

		[
			{className:'show-explore', selector:'#controls'},
			{className:'show-intro',   selector:'#intro'},
			{className:'show-content', selector:'.content'}
		].forEach(function (entry) {
			if (entry.className === newClassName) {
				if ($container.hasClass(entry.className)) return;
				
				$container.addClass(entry.className);
				$(entry.selector).hide();
				setTimeout(
					function () { $(entry.selector).fadeIn(animationDuration) },
					animationDuration
				)
			} else {
				if (!$container.hasClass(entry.className)) return;

				var $node = $(entry.selector);
				if ($node.length == 0) {
					$container.removeClass(entry.className)
				} else {
					$node.fadeOut(animationDuration, function () { $container.removeClass(entry.className) });
				}
			}
		});
	}

	function setContent($el, content) {
		$el.find('h2').text(content.headline);
		$el.find('.content-text').empty();
		content.text.forEach(function(text){
			$el.find('.content-text').append($('<p>').html(text));
		});
		$el.find('.content-text')[0].scrollTop = 0;
	}
	
	function leftpad (str, len, ch) {
		str = String(str);
		var i = -1;
		if (!ch && ch !== 0) ch = ' ';
		len = len - str.length;
		while (++i < len) str = ch + str;
		return str;
	}

	function location_encode(p,z){
		return [
			leftpad(Math.round((p.lat%1)*10000).toString(36),3,'_'),
			leftpad(Math.round((p.lng%1)*10000).toString(36),3,'_'),
			z.toString(36)
		].join('');
	};
	
	function location_decode(str){
		if (!/^[a-z0-9_]{7}$/.test(str)) return false;
		return {
			lat: (13+(parseInt(str.substr(0,3).replace(/_/g,''),36)/10000)),
			lng: (52+(parseInt(str.substr(3,3).replace(/_/g,''),36)/10000)),
			z: parseInt(str.substr(6,1),36)
		};
	};
	
	function Slider() {
		// draggable slider

		var $slider = $('#control-slider');
		var $mapclip = $('#map-clip');
		var $mapinner = $('#map-clip-inner');
		var sliderOffset = 0.5;

		// mouse and touch events for dragging
		var dragging = false;
		var dragOffset = 0;
		$('#control-slider').on('mousedown touchstart', function (e) {
			e.preventDefault();
			dragging = true;
			var pointer = (e.type === 'touchstart') ? e.originalEvent.touches[0] : e;
			dragOffset = $slider.offset().left - pointer.pageX + 20;
		})
		$(document).on('mousemove touchmove', function (e) {
			if (!dragging) return;
			e.preventDefault();
			
			var pointer = (e.type === 'touchmove') ? e.originalEvent.touches[0] : e;
			var x = pointer.pageX + dragOffset;
			x = Math.min(Math.max(0, x), $container.width());

			setSliderPosition(x);
		})
		$(document).on('mouseup touchend', function (e) {
			if (dragging) dragging = false;
		})

		// events for window resize
		$(window).resize(function() { setSliderPosition($container.width()*sliderOffset) });
		
		// functions
		function slideTo(v, fn){
			$({v: sliderOffset}).animate({v: v}, {
				duration: animationDuration,
				step: function(value){
					setSliderPosition($container.width()*value);
				},
				complete: fn
			});
		}

		function setSliderPosition(x) {
			x = Math.round(x);
			sliderOffset = x/$container.width();
			$slider.css(  {left:  x  });
			$mapclip.css( {left:  x  });
			$mapinner.css({left: -x-1});
		}

		return {
			slideTo: slideTo,
			isInRightMap: function (x) {
				return (x < sliderOffset*$container.width()) ? 0 : 1;
			}
		}
	}

	function initMaps() {
		var errorTile = 'data:image/gif;base64,R0lGODlhAAEAAYAAAAAAAP///yH5BAAAAAAALAAAAAAAAQABAAL/jI+py+0Po5y02ouz3rz7D4biSJbmiabqyrbuC8fyTNf2jef6zvf+DwwKh8Si8YhMKpfMpvMJjUqn1Kr1is1qt9yu9wsOi8fksvmMTqvX7Lb7DY/L5/S6/Y7P6/f8vv8PGCg4SFhoeIiYqLjI2Oj4CBkpOUlZaXmJmam5ydnp+QkaKjpKWmp6ipqqusra6voKGys7S1tre4ubq7vL2+v7CxwsPExcbHyMnKy8zNzs/AwdLT1NXW19jZ2tvc3d7f0NHi4+Tl5ufo6err7O3u7+Dh8vP09fb3+Pn6+/z9/v/w8woMCBBAsaPIgwocKFDBs6fAgxosSJFCtavIgxo8aNXxw7evwIMqTIkSRLmjyJMqXKlSxbunwJM6bMmTRr2ryJM6fOnTx7+vwJNKjQoUSLGj2KNKnSpUybOn0KNarUqVSrWr2KNavWrVy7ev0KNqzYsWTLmj2LNq3atWzbHisAADs=';

		var map_opts = {
			attributionControl: false,
			zoomAnimation: true,
			zoomControl: false,
			bounceAtZoomLimits: false,
			maxBounds: L.latLngBounds(L.latLng(52.396,13.116), L.latLng(52.639,13.720)),
			minZoom: 12,
			maxZoom: 18,
			zoom: 13,
			center: L.latLng(52.516, 13.383)
		}

		// create maps
		map1928 = L.map('map-base', map_opts);
		map2015 = L.map('map-overlay', map_opts);

		L.tileLayer('https://{s}.maps.dsst.io/berlin-1928/{z}/{x}/{y}.jpg', {
			minZoom: 5,
			maxZoom: 18,
			errorTileUrl: errorTile,
			subdomains: "abc",
			detectRetina: true
		}).addTo(map1928);
		
		L.tileLayer('https://{s}.maps.dsst.io/berlin-2015/{z}/{x}/{y}.jpg', {
			minZoom: 5,
			maxZoom: 18,
			errorTileUrl: errorTile,
			subdomains: "abc",
			detectRetina: true
		}).addTo(map2015);

		syncMaps(map1928, map2015);
	}

	function syncMaps(map1, map2) {
		'use strict';

		var debug = false;//Date.now();

		var drag1 = map1.dragging._draggable;
		var drag2 = map2.dragging._draggable;

		L.extend(map1, {
			panBy: function (offset, options) {
				if (debug) console.log('panBy');
				map2.panBy(offset, options);
				L.Map.prototype.panBy.call(map1, offset, options);
			},
			_move: function (center, zoom, data) {
				if (debug) console.log('_move', Date.now()-debug);
				map2._move(center, zoom, data);
				return L.Map.prototype._move.call(map1, center, zoom, data);
			},
			_onResize: function (event, sync) {
				if (debug) console.log('_onResize');
				map2._onResize(event, true);
				return L.Map.prototype._onResize.call(map1, event);
			},
			_tryAnimatedZoom: function (center, zoom, options) {
				if (debug) console.log('_tryAnimatedZoom', Date.now()-debug, center, zoom, options);
				var result = L.Map.prototype._tryAnimatedZoom.call(map1, center, zoom, options);
				return result;
			},
			_resetView: function (center, zoom) {
				map2._resetView(center, zoom);
				return L.Map.prototype._resetView.call(map1, center, zoom);
			}
		})

		map1.on('zoomanim', function (e) {
			if (debug) console.log('zoomanim1', Date.now()-debug);
			map2._animateZoom(e.center, e.zoom, true, e.noUpdate);
		});

		drag1._updatePosition = function () {
			if (debug) console.log('_updatePosition', Date.now()-debug);

			L.Draggable.prototype._updatePosition.call(drag1);
			L.DomUtil.setPosition(drag2._element, drag1._newPos);
			map2.fire('moveend');
		};
	}
	
	// helpers
	// enable geolocation
	if (navigator.geolocation) {
		$container.addClass('has-geolocation');
		var geolocationWatcher = false;
		var markers = [];

		var myLocationIcon = L.divIcon({
			iconSize: [10,10],
			iconAnchor: [5,5],
			className: 'my-location-icon'
		});

		$('.geolocate').on('click', function(evt) {
			evt.preventDefault();

			if (geolocationWatcher) {
				$('.geolocate').removeClass('active');
				navigator.geolocation.clearWatch(geolocationWatcher);
				geolocationWatcher = false;
				markers = markers.filter(function (marker) { marker.remove(); return false; });
			} else {
				markers = markers.filter(function (marker) { marker.remove(); return false; });

				$('.geolocate').addClass('spin');
				$('.geolocate').addClass('active');

				var firstLocation = true;

				geolocationWatcher = navigator.geolocation.watchPosition(function (position) {
					var point = L.latLng(position.coords.latitude, position.coords.longitude);
					var radius = Math.min(500, position.coords.accuracy);

					if (firstLocation) {
						map1928.setView(point, 17, {animate:true});
						$('.geolocate').removeClass('spin');

						markers = [
							createMarker(map1928),
							createMarker(map2015)
						]
						firstLocation = false;
					} else {
						markers.forEach(function (marker) { marker.move(point, radius) });
					}

					function createMarker(map) {
						var icon = L.marker(point, { icon: myLocationIcon, clickable: false }).addTo(map);
						var accu = L.circle(point, radius, { stroke: false, fill: true, fillColor: '#57f', fillOpacity: 0.4, clickable: false }).addTo(map);
						return {
							move:function (point, radius) {
								icon.setLatLng(point);
								accu.setLatLng(point).setRadius(radius);
							},
							remove:function () {
								icon.remove();
								accu.remove();
							}
						}
					}
				});
			}
		});
	}

	// handle fullscreen
	if (document.fullScreenEnabled || document.mozFullScreenEnabled || document.webkitFullScreenEnabled || document.msFullscreenEnabled || document.documentElement.webkitRequestFullscreen) {
		$container.addClass("has-fullscreen");
		$(".fullscreen","#controls").on("click", function(evt){
			evt.preventDefault();
			 if (!document.fullscreenElement && !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
				$('.fullscreen i','#controls').attr("class", "icon-shrink");
				if (document.documentElement.requestFullscreen) return document.documentElement.requestFullscreen();
				if (document.documentElement.msRequestFullscreen) return document.documentElement.msRequestFullscreen();
				if (document.documentElement.mozRequestFullScreen) return document.documentElement.mozRequestFullScreen();
				if (document.documentElement.webkitRequestFullscreen) return document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
			} else {
				$('.fullscreen i','#controls').attr("class", "icon-enlarge");
				if (document.exitFullscreen) return document.exitFullscreen();
				if (document.msExitFullscreen) return document.msExitFullscreen();
				if (document.mozCancelFullScreen) return document.mozCancelFullScreen();
				if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
			}
		});
		
		// catch full screen state change, reset mode on exit by escape
		$(document).on("webkitfullscreenchange mozfullscreenchange fullscreenchange MSFullscreenChange", function(){
			if (!document.fullscreenElement && !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) $('.fullscreen i','#controls').attr("class", "icon-enlarge");
			// fullscreen state change triggers resize and map sync
			$(window).trigger('resize');
			// @mk FIXME: maps tend to get out of sync when resize state changes. put code here to trigger resync 
		});
	};

	// twitter sharing
	$(".twitter","#controls").click(function(evt){
		evt.preventDefault();
		window.open('https://twitter.com/intent/tweet?url='+encodeURIComponent(share_url())+'&text='+encodeURIComponent(share_tweet), "share", "width=500,height=300,status=no,scrollbars=no,resizable=no,menubar=no,toolbar=no");
	});

	// facebook sharing
	$(".facebook","#controls").click(function(evt){
		evt.preventDefault();
		window.open('https://www.facebook.com/dialog/share?app_id=966242223397117&display=popup&href='+encodeURIComponent(share_url()), "share", "width=500,height=300,status=no,scrollbars=no,resizable=no,menubar=yes,toolbar=no");
	});

	// google+ sharing
	$(".googleplus","#controls").click(function(evt){
		evt.preventDefault();
		window.open('https://plus.google.com/share?url='+encodeURIComponent(share_url()), "share", "width=500,height=300,status=no,scrollbars=no,resizable=no,menubar=no,toolbar=no");
	});


	// switch to tour mode
	$(".switch-tour","#controls").click(function(evt){
		evt.preventDefault();
		gotoStory(currentStoryIndex||0);
	});

	// switch to explore mode
	$(".switch-explore","#controls").click(function(evt){
		evt.preventDefault();
		gotoExplore();
	});

	// geocode
	$(".geocode","#controls").click(function(evt){
		evt.preventDefault();
		if ($container.hasClass("show-search")){
			$("#search").fadeOut("fast", function(){
				$container.removeClass("show-search");
				$("#search-result").html("");
				$("#search-query").val("");
			});
		} else {
			$("#search").fadeIn("fast", function(){
				$container.addClass("show-search");
				$("#search-query").focus();
			});
		}
	});

	// async execution of stupid ivw zaehlpixel on production site
	if (location.href.indexOf("1928.tagesspiegel.de") >= 0) $.getScript("https://script.ioam.de/iam.js", function(){
		var iomit = 0;
		var iomcheck = setInterval(function(){
			if (++iomit > 10) return clearInterval(iomcheck);
			if (!window.hasOwnProperty("iom")) return;
			window.iom.c({ "st":"tagspieg", "cp":"ts-1928", "sv":"ke" },1);
			return clearInterval(iomcheck);
		},1000);
	});
	
});

