$("document").ready(function(){

	// cache some dom elemenst
	var $container = $("#container");

	// var borderWidth = 0;

	var errorTile = 'data:image/gif;base64,R0lGODlhAAEAAYAAAAAAAP///yH5BAAAAAAALAAAAAAAAQABAAL/jI+py+0Po5y02ouz3rz7D4biSJbmiabqyrbuC8fyTNf2jef6zvf+DwwKh8Si8YhMKpfMpvMJjUqn1Kr1is1qt9yu9wsOi8fksvmMTqvX7Lb7DY/L5/S6/Y7P6/f8vv8PGCg4SFhoeIiYqLjI2Oj4CBkpOUlZaXmJmam5ydnp+QkaKjpKWmp6ipqqusra6voKGys7S1tre4ubq7vL2+v7CxwsPExcbHyMnKy8zNzs/AwdLT1NXW19jZ2tvc3d7f0NHi4+Tl5ufo6err7O3u7+Dh8vP09fb3+Pn6+/z9/v/w8woMCBBAsaPIgwocKFDBs6fAgxosSJFCtavIgxo8aNXxw7evwIMqTIkSRLmjyJMqXKlSxbunwJM6bMmTRr2ryJM6fOnTx7+vwJNKjQoUSLGj2KNKnSpUybOn0KNarUqVSrWr2KNavWrVy7ev0KNqzYsWTLmj2LNq3atWzbHisAADs=';

	var map_base = L.map('map-base', {
		attributionControl: false,
		zoomAnimation: false,
		zoomControl: false
	}).setView([52.49,13.372], 12);

	var map_overlay = L.map('map-overlay', {
		attributionControl: false,
		zoomAnimation: false,
		zoomControl: false
	}).setView([52.49,13.372], 12);

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

	// synchronize maps
	map_base.on('move', function (evnt) {
		map_overlay.setView(map_base.getCenter(), map_base.getZoom(), {animate: false});
	});

	map_overlay.on('move', function (evnt) {
		map_base.setView(map_overlay.getCenter(), map_overlay.getZoom(), {animate: false});
	});

	function debug(){
		if ($("#debug").length === 0) return;
		var zoom = map_base.getZoom();
		var center = map_base.getCenter();
		var point = map_base.project(center);
		point.x += ($container.width()/4);
		var offset = map_base.unproject(point);
		$('#debug').html('"coords": ['+offset.lat.toFixed(4)+', '+offset.lng.toFixed(4)+'],<br>"zoom:": '+zoom+',\n');
	};
		
	// draggable shifter
	var $slider = $("#control-slider");
	var $mapclip = $("#map-clip");
	var $mapinner = $("#map-clip-inner");
	var $offset = 0.5;
	var $lastOffset = ($container.width()/2);
	
	var dragstart = 0;
	var dragging = false;
	$('body').on('mousedown', '#control-slider', function(e) {
		var bias = ($lastOffset-e.pageX);
		dragstart = Date.now();
		dragging = true;

		var $t = $(this);
		$(this).addClass('draggable').parents().on('mousemove', function(e) {
			if (!dragging) return;
			var offset = (e.pageX);
			var biasedoffset = Math.min(Math.max(0, offset+bias), $container.width());
			$lastOffset = biasedoffset;
			$offset = biasedoffset/$container.width();
			$slider.css({left: biasedoffset+"px"});
			$mapclip.css({left: biasedoffset+"px"});
			$mapinner.css({left: (biasedoffset*-1)+"px"});
			$('.draggable').parents().on('mouseup', function() {
				$t.removeClass('draggable');
				$t.unbind("mousemove");
				$t.parents().unbind("mousemove");
			});
		});
		e.preventDefault();
	}).on('mouseup', function() {
		dragging = false;
		$('.draggable').removeClass('draggable');
	});
	
	$('body').on("click", function(){
		dragging = false;
	});

	$('#control-slider').click(function(evt){
		evt.preventDefault();
		if ((Date.now()-dragstart) > 500) return; // this is a drag
		// this is confusing either way
		if (evt.offsetX >= 0 && evt.offsetX <= 40) return slideTo(0.5);
		if ($offset === 1) return slideTo(0);
		if ($offset === 0) return slideTo(1);
		if (evt.offsetX < 0) return slideTo(1);
		if (evt.offsetX > 40) return slideTo(0);
	});

	$(window).resize(function(){
		var offset = ($container.width()*$offset);
		$lastOffset = offset;
		$slider.css({left: offset+"px"});
		$mapclip.css({left: offset+"px"});
		$mapinner.css({left: (offset*-1)+"px"});
		if ($container.width() < 800) {
			$container.addClass("small");
		} else {
			$container.removeClass("small");
		}
	});
	$(window).trigger("resize");
	
	function slideTo(v, fn){
		$({v: $offset}).animate({v: v}, {
			duration: 500,
			step: function(value){
				var offset = ($container.width()*value);
				$lastOffset = offset;
				$offset = value;
				$slider.css({left: offset+"px"});
				$mapclip.css({left: offset+"px"});
				$mapinner.css({left: (offset*-1)+"px"});
			},
			complete: fn
		});
	};
	
	function jumpTo(v, fn){
		var offset = ($container.width()*v);
		$lastOffset = offset;
		$offset = v;
		$slider.css({left: offset+"px"});
		$mapclip.css({left: offset+"px"});
		$mapinner.css({left: (offset*-1)+"px"});
		if (typeof fn === "function") fn();
	};
	
	$("#goto-2015").click(function(evt){
		evt.preventDefault();
		slideTo(0);
	});
	
	$("#goto-1928").click(function(evt){
		evt.preventDefault();
		slideTo(1);
	});
	
	/* content */
	var story = [];
	$.getJSON("assets/data/data.json", function(data){
		story = data;
		
		// prepare content
		$("#content-1928 h2").text(story[0].content[0].headline);
		$("#content-2015 h2").text(story[0].content[1].headline);
		$("#content-1928 .content-text").html("");
		$("#content-2015 .content-text").html("");
		story[0].content[0].text.forEach(function(text){
			$("#content-1928 .content-text").append($('<p>').html(text));
		});
		story[0].content[1].text.forEach(function(text){
			$("#content-2015 .content-text").append($('<p>').html(text));
		});

		$container.addClass("ready");
	});
	
	function offsetCenter(p, z){
		if ($container.hasClass("small")) return map_base.setView(p, z-1);
		var point = map_base.project(new L.latLng(p[0], p[1]).clone(), z);
		point.x -= ($container.width()/4);
		point = map_base.unproject(point, z);
		map_base.setView(point, z);
	};

	/* explore */
	$("#button-explore").click(function(evt){
		evt.preventDefault();

		// show content
		$('#intro').fadeOut('fast', function(){
			$container.removeClass("show-intro").addClass("show-explore").removeClass("show-content");
		});
		
		// set mode
		$container.attr("data-element", "explore");
	});
		
	/* storyline */
	$("#button-start").click(function(evt){
		evt.preventDefault();

		// is story loaded?
		if (story.length === 0) return;

		// go to center of first element
		offsetCenter(story[0].coords, story[0].zoom);

		// set slider to 1928
		slideTo(1);
		
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
		if (index >= story.length) {
			// show explore
			$container.removeClass("show-content").addClass("show-explore");
			$container.attr("data-element", "explore");
			slideTo(0.5);
			return;
		}
		
		// position map
		offsetCenter(story[index].coords, story[index].zoom);
		
		// set 1928 text
		$("#content-1928 h2").text(story[index].content[0].headline);
		$("#content-1928 .content-text").html("");
		story[index].content[0].text.forEach(function(text){
			$("#content-1928 .content-text").append($('<p>').html(text));
		});
		$("#content-1928 .content-text")[0].scrollTop = 0;
				
		// show 1928 map
		slideTo(1, function(){

			// set 2015 text
			$("#content-2015 h2").text(story[index].content[1].headline);
			$("#content-2015 .content-text").html("");
			story[index].content[1].text.forEach(function(text){
				$("#content-2015 .content-text").append($('<p>').html(text));
			});
			$("#content-2015 .content-text")[0].scrollTop = 0;
			
			$container.attr("data-element", index);
			
		});
		
	});

	$("#goto-back").click(function(evt){
		var index = parseInt($container.attr("data-element"),10)-1;
		if (isNaN(index)) return;
		if (index < 0) {
			map_base.setView(new L.latLng(52.49,13.372), 12);

			// set slider to middle
			slideTo(0.5);

			// show content
			$container.removeClass("show-content").addClass("show-intro");
			$('#intro').fadeIn('fast');

			// set index to intro
			$container.attr("data-element", "intro");
			return;
		}
		
		// position map
		offsetCenter(story[index].coords, story[index].zoom);
		
		// set 2015 text
		$("#content-2015 h2").text(story[index].content[1].headline);
		$("#content-2015 .content-text").html("");
		story[index].content[1].text.forEach(function(text){
			$("#content-2015 .content-text").append($('<p>').html(text));
		});
		$("#content-2015 .content-text")[0].scrollTop = 0;
		
		// show 2015 map
		slideTo(0, function(){

			// set 1928 text
			$("#content-1928 h2").text(story[index].content[0].headline);
			$("#content-1928 .content-text").html("");
			story[index].content[0].text.forEach(function(text){
				$("#content-1928 .content-text").append($('<p>').html(text));
			});
			$("#content-1928 .content-text")[0].scrollTop = 0;
			
			$container.attr("data-element", index);
			
		});
	});

});