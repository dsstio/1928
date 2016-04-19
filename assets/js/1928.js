$('document').ready(function() {
	var animationDuration = 500;

	// cache some dom elemenst
	var $container = $('#container');

	// var borderWidth = 0;

	var errorTile = 'data:image/gif;base64,R0lGODlhAAEAAYAAAAAAAP///yH5BAAAAAAALAAAAAAAAQABAAL/jI+py+0Po5y02ouz3rz7D4biSJbmiabqyrbuC8fyTNf2jef6zvf+DwwKh8Si8YhMKpfMpvMJjUqn1Kr1is1qt9yu9wsOi8fksvmMTqvX7Lb7DY/L5/S6/Y7P6/f8vv8PGCg4SFhoeIiYqLjI2Oj4CBkpOUlZaXmJmam5ydnp+QkaKjpKWmp6ipqqusra6voKGys7S1tre4ubq7vL2+v7CxwsPExcbHyMnKy8zNzs/AwdLT1NXW19jZ2tvc3d7f0NHi4+Tl5ufo6err7O3u7+Dh8vP09fb3+Pn6+/z9/v/w8woMCBBAsaPIgwocKFDBs6fAgxosSJFCtavIgxo8aNXxw7evwIMqTIkSRLmjyJMqXKlSxbunwJM6bMmTRr2ryJM6fOnTx7+vwJNKjQoUSLGj2KNKnSpUybOn0KNarUqVSrWr2KNavWrVy7ev0KNqzYsWTLmj2LNq3atWzbHisAADs=';

	var map_opts = {
		attributionControl: false,
		zoomAnimation: false,
		zoomControl: false,
		bounceAtZoomLimits: false,
		maxBounds: L.latLngBounds(L.latLng(52.396,13.116), L.latLng(52.639,13.720)),
		minZoom: 12,
		maxZoom: 18,
		zoom: 13,
		center: L.latLng(52.516, 13.383)
	}

	// create maps
	var map_base = L.map('map-base', map_opts);
	var map_overlay = L.map('map-overlay', map_opts);

	// add zoom control to basemap
	new L.Control.Zoom({ position: 'topright' }).addTo(map_base);
	new L.Control.Zoom({ position: 'topright' }).addTo(map_overlay);

	L.tileLayer('https://{s}.maps.dsst.io/berlin-1928/{z}/{x}/{y}.jpg', {
		minZoom: 5,
		maxZoom: 18,
		errorTileUrl: errorTile,
		subdomains: "abc"
	}).addTo(map_base);
	
	L.tileLayer('https://{s}.maps.dsst.io/berlin-2015/{z}/{x}/{y}.jpg', {
		minZoom: 5,
		maxZoom: 18,
		errorTileUrl: errorTile,
		subdomains: "abc"
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

	var locationhash = '';

	// synchronize maps
	map_base.on('move', function (evnt) {
		var center = map_base.getCenter();
		var zoom = map_base.getZoom();
		map_overlay.setView(map_base.getCenter(), map_base.getZoom(), {animate: false});
		// set hash for sharing
		locationhash = location_encode(center, zoom)
	});
	
	var slider = new Slider();
	
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
			var iconInfo = L.divIcon({html:'<i class="icon-info"></i>', className:'marker-info marker'+index});
			
			story.marker1 = L.marker(story.coords, {keyboard:false, icon:iconInfo}).addTo(map_base);
			story.marker2 = L.marker(story.coords, {keyboard:false, icon:iconInfo}).addTo(map_overlay);

			$(story.marker1._icon).css({width:'', height:'', margin:''});
			$(story.marker2._icon).css({width:'', height:'', margin:''});
			
			story.marker1.on('click', markerClick);
			story.marker1.on('mouseover', function () {
				$(story.marker1._icon).addClass('hover');
				$(story.marker2._icon).addClass('hover');
			})
			story.marker1.on('mouseout', function () {
				$(story.marker1._icon).removeClass('hover');
				$(story.marker2._icon).removeClass('hover');
			})
			
			function markerClick() {
				setContent($('#content-1928'), story.content[0]);
				setContent($('#content-2015'), story.content[1]);
				$container.addClass('show-content').addClass('small');
			}
		})
	});
	
	function zoomToStory(story) {
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
	$('#button-explore').click(function(evt){
		evt.preventDefault();
		gotoExplore();
	});

	$('.goto-explore').click(function(evt){
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

	function gotoStory(index, jumpTo2015) {
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
			zoomToStory(stories[index]);
		} else {
			setTimeout(function () {
				zoomToStory(stories[index]);
			}, animationDuration);
		}
	}

	function setVisibility(newClassName) {
		if ($container.hasClass(newClassName)) return true;

		[
			{className:'show-explore', selector:false},
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

				$(entry.selector).fadeOut(
					animationDuration,
					function () { $container.removeClass(entry.className) }
				);
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
		$(window).resize(function(){
			setSliderPosition($container.width()*sliderOffset);
			$container.toggleClass('small', $container.width() < 800);
		});
		$(window).trigger('resize');
		
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
			sliderOffset = x/$container.width();
			$slider.css(  {left:  x  });
			$mapclip.css( {left:  x  });
			$mapinner.css({left: -x-1});
		}

		return {
			slideTo: slideTo
		}
	}
});
