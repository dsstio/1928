$("document").ready(function(){

	// cache some dom elemenst
	var $container = $("#container");

	// var borderWidth = 0;

	var errorTile = 'data:image/gif;base64,R0lGODlhAAEAAYAAAAAAAP///yH5BAAAAAAALAAAAAAAAQABAAL/jI+py+0Po5y02ouz3rz7D4biSJbmiabqyrbuC8fyTNf2jef6zvf+DwwKh8Si8YhMKpfMpvMJjUqn1Kr1is1qt9yu9wsOi8fksvmMTqvX7Lb7DY/L5/S6/Y7P6/f8vv8PGCg4SFhoeIiYqLjI2Oj4CBkpOUlZaXmJmam5ydnp+QkaKjpKWmp6ipqqusra6voKGys7S1tre4ubq7vL2+v7CxwsPExcbHyMnKy8zNzs/AwdLT1NXW19jZ2tvc3d7f0NHi4+Tl5ufo6err7O3u7+Dh8vP09fb3+Pn6+/z9/v/w8woMCBBAsaPIgwocKFDBs6fAgxosSJFCtavIgxo8aNXxw7evwIMqTIkSRLmjyJMqXKlSxbunwJM6bMmTRr2ryJM6fOnTx7+vwJNKjQoUSLGj2KNKnSpUybOn0KNarUqVSrWr2KNavWrVy7ev0KNqzYsWTLmj2LNq3atWzbHisAADs=';

	var bounds = L.latLngBounds(L.latLng(52.33812, 13.0884),L.latLng(52.675499, 13.76134));

	var map_opts = {
		attributionControl: false,
		zoomAnimation: false,
		zoomControl: false,
		maxBounds: bounds,
		minZoom: 12,
		maxZoom: 18,
		zoom: 13,
		center: L.latLng(52.49,13.372)
	};

	// create maps
	var map_base = L.map('map-base', map_opts);
	var map_overlay = L.map('map-overlay', map_opts);

	// add zoom control to basemap
	new L.Control.Zoom({ position: 'topright' }).addTo(map_base);
	new L.Control.Zoom({ position: 'topright' }).addTo(map_overlay);

	L.tileLayer('https://maps.dsst.io/berlin_dop20_1928/{z}/{x}/{y}.jpg', {
		minZoom: 5,
		maxZoom: 18,
		errorTileUrl: errorTile,
	}).addTo(map_base);
	
	L.tileLayer('https://maps.dsst.io/berlin_dop20_2015/{z}/{x}/{y}.jpg', {
		minZoom: 5,
		maxZoom: 18,
		errorTileUrl: errorTile,
	}).addTo(map_overlay);

	
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
			leftpad(Math.round((p.lat%1)*10000).toString(36),3,"_"),
			leftpad(Math.round((p.lng%1)*10000).toString(36),3,"_"),
			z.toString(36)
		].join("");
	};
	
	function location_decode(str){
		if (!/^[a-z0-9_]{7}$/.test(str)) return false;
		return {
			lat: (13+(parseInt(str.substr(0,3).replace(/_/g,''),36)/10000)),
			lng: (52+(parseInt(str.substr(3,3).replace(/_/g,''),36)/10000)),
			z: parseInt(str.substr(6,1),36)
		};
	};

	var locationhash = "";

	// synchronize maps
	map_base.on('move', function (evnt) {
		var center = map_base.getCenter();
		var zoom = map_base.getZoom();
		map_overlay.setView(map_base.getCenter(), map_base.getZoom(), {animate: false});
		// set hash for sharing
		locationhash = location_encode(center, zoom)
	});
	
	var slider = (function () {
		// draggable slider

		var $slider = $("#control-slider");
		var $mapclip = $("#map-clip");
		var $mapinner = $("#map-clip-inner");
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
		$(window).resize(function(){
			setSliderPosition($container.width()*sliderOffset);
			$container.toggleClass('small', $container.width() < 800);
		});
		$(window).trigger('resize');
		
		// functions
		function slideTo(v, fn){
			$({v: sliderOffset}).animate({v: v}, {
				duration: 500,
				step: function(value){
					setSliderPosition($container.width()*value);
				},
				complete: fn
			});
		}

		function setSliderPosition(x) {
			sliderOffset = x/$container.width();
			$slider.css(  {left:  x  });
			$mapclip.css( {left:  x  });
			$mapinner.css({left: -x-1});
		}

		return {
			slideTo: slideTo
		}
	})();
	
	
	$("#goto-2015").click(function(evt){
		evt.preventDefault();
		slider.slideTo(0);
	});
	
	$("#goto-1928").click(function(evt){
		evt.preventDefault();
		slider.slideTo(1);
	});
	
	/* content */
	var stories = [];
	$.getJSON('assets/data/data.json', function(data) {
		stories = data;
		
		// prepare content
		setContent($('#content-1928'), stories[0].content[0]);
		setContent($('#content-2015'), stories[0].content[1]);

		$container.addClass('ready');

		var iconRed  = L.divIcon({ iconSize:[16,16], iconAnchor:[8,8], html:'?', className:'marker-text red'})
		var iconGrey = L.divIcon({ iconSize:[16,16], iconAnchor:[8,8], html:'?', className:'marker-text grey'})

		data.forEach(function (story) {
			story.markerB = L.marker(story.coords, {icon:iconGrey}).addTo(map_base);
			story.markerO = L.marker(story.coords, {icon:iconRed }).addTo(map_overlay);
		})
	});
	
	function zoomToRight(story) {
		var zoom = story.zoom;
		if ($container.hasClass('small')) zoom--;

		var point = map_base.project(new L.latLng(story.coords[0], story.coords[1]).clone(), zoom);
		if ($container.hasClass('small')) {
			point.y += ($container.height()/4);
		} else {
			point.x -= ($container.width()/4);
		}
		point = map_base.unproject(point, zoom);
		map_base.setView(point, zoom);
	};

	/* explore */
	$("#button-explore").click(function(evt){
		evt.preventDefault();

		// show content
		$('#intro').fadeOut('fast', function(){
			$container.removeClass("show-intro").addClass("show-explore").removeClass("show-content");
			gotoExplore();
		});
	});
		
	/* storyline */
	$("#button-start").click(function(evt){
		evt.preventDefault();

		// is stories loaded?
		if (stories.length === 0) return;

		// go to center of first element
		zoomToRight(stories[0]);

		// set slider to 1928
		slider.slideTo(1);
		
		// show content
		$('#intro').fadeOut('fast', function(){
			$container.removeClass("show-intro").addClass("show-content");
		});
		
		// set index
		$container.attr("data-element", "0");
		
	});
	
	$("#goto-next").click(function(evt){
		var index = parseInt($container.attr("data-element"),10)+1;
		if (isNaN(index)) return;
		if (index >= stories.length) {
			// show explore
			gotoExplore();
			return;
		}
		
		// position map
		zoomToRight(stories[index]);
		
		// set 1928 text
		setContent($('#content-1928'), stories[index].content[0]);
				
		// show 1928 map
		slider.slideTo(1, function() {
			setContent($('#content-2015'), stories[index].content[1]);
			$container.attr("data-element", index);
		});
		
	});

	$("#goto-back").click(function(evt){
		var index = parseInt($container.attr("data-element"),10)-1;
		if (isNaN(index)) return;
		if (index < 0) {
			map_base.setView(new L.latLng(52.49,13.372), 12);

			// set slider to middle
			slider.slideTo(0.5);

			// show content
			$container.removeClass("show-content").addClass("show-intro");
			$('#intro').fadeIn('fast');

			// set index to intro
			$container.attr("data-element", "intro");
			return;
		}
		
		// position map
		zoomToRight(stories[index]);
		
		// set 2015 text
		setContent($('#content-2015'), stories[index].content[1]);
		
		// show 2015 map
		slider.slideTo(0, function() {
			setContent($('#content-1928'), stories[index].content[0]);
			$container.attr("data-element", index);
		});
	});

	$('#goto-exp1, #goto-exp2').click(gotoExplore);

	function gotoExplore() {
		$container.removeClass('show-content').addClass('show-explore');
		$container.attr('data-element', 'explore');
		slider.slideTo(0.5);
	}

	function setContent($el, content) {
		$el.find('h2').text(content.headline);
		$el.find('.content-text').empty();
		content.text.forEach(function(text){
			$el.find('.content-text').append($('<p>').html(text));
		});
		$el.find('.content-text')[0].scrollTop = 0;
	}

});
