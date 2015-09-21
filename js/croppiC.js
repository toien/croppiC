/**
 * croppiC.js
 *
 * @requires jquery.js
 *
 *
 *
 * Usage:
 * var cropper = new Cropper({
 *   el: '#component', // where this component depeon on, usually is a id expression
 *   cropSize: {
 *     width: 560,
 *     height: 480
 *   },
 *   url: '/discover-spring/upload', // At server-end, handled HTTP POST multipart/form-data,
 *   uploaded: function(resp) { // callback function will be called when uploaded finished(HTTP status code = 200)
 *     alert(resp); // "this" refs the cropper
 *   },
 *   debug: true // append the working canvas to html body, default is false
 * });
 *
 */
function Cropper(options) {
	this.options = options;

	this.el = options.el;
	this.scaled = false;

	this._cache();
	this._style();
	this._adaptViewport();
	this._bind();

	if (options.src) {
		this.load(options.src);
	}
}

Cropper.prototype = {
	constructor: Cropper,

	template: '<div id="viewport">' +
		'<img id="present" style="position: relative; cursor: move;	z-index: 1;">' +
		'</div>' +
		'<img id="shadow">' +
		'<div id="controls">' +
		'<input id="file" type="file" accept="image/*">' +
		'<input id="preview" type="button" value="Preview">' +
		'<input id="yes" type="button" value="Yes">' +
		'</div>' +
		'<canvas id="display"></canvas>',

	CONSTANTS: {
		VIEWPORT_MIN_GAP: 100,
		FILE_INPUT_MAX_WIDTH: 180,
		WHEEL_DELTA_VALUE: 30
	},
	/**
	 * Init cropper content and cache DOM and jQuery objects.
	 *
	 */
	_cache: function() {
		var $el = this.$el = $(this.el);

		this.$el.html(this.template);

		this.$viewport = $el.find('#viewport');
		this.$shadow = $el.find('#shadow');
		this.$controls = $el.find('#controls');
		this.$input = this.$el.find('#file');
		this.$yes = this.$el.find('#yes');

		this.$canvas = this.$el.find('#display');
		this.canvas = this.$canvas.get(0);

		this.viewport = this.$viewport.get(0);
	},
	/**
	 * Set basic style on component.
	 *
	 */
	_style: function() {
		var cropSize = this.options.cropSize,
			constants = this.CONSTANTS;

		this.$el.css({
			"background-color": '#eee',
			"position": 'relative',
			"overflow": 'hidden'
		});

		this.$viewport.css({
			overflow: 'hidden',
			margin: 'auto',
			position: 'absolute',
			top: 0,
			left: 0,
			bottom: 0,
			right: 0,
			border: '3px #62A4E8 dashed',
			"background-color": '#ddd'
		});

		this.$shadow.css({
			position: 'absolute',
			opacity: '.2'
		});

		this.$controls.css({
			position: 'absolute',
			bottom: 2,
			right: 0,
			"z-index": 2
		});

		this.$input.css({
			"max-width": constants.FILE_INPUT_MAX_WIDTH,
			"display": 'inline'
		});

		this.$canvas.css('display', 'none');
	},
	_adaptViewport: function(argument) {
		var $viewport = this.$viewport,
			gap = this.CONSTANTS.VIEWPORT_MIN_GAP,
			cropSize = this.options.cropSize,
			cropRatio = cropSize.width / cropSize.height,
			outerWidth = this.$el.width(),
			outerHeight = this.$el.height(),
			outerRatio = outerWidth / outerHeight;

		var delta = gap * 2;

		var viewportWidth, viewportHeight;

		if (outerWidth - cropSize.width < delta || outerHeight - cropSize.height < delta) {

			if(cropRatio > outerRatio) {
				viewportWidth = outerWidth - delta;
				viewportHeight = viewportWidth / cropRatio;
			} else {
				viewportHeight = outerHeight - delta;
				viewportWidth = viewportHeight * cropRatio;
			}
			this.scaled = true;
			this.scaleValue = viewportWidth / cropSize.width;

			$viewport.css({
				width: viewportWidth,
				height: viewportHeight
			});

		} else {
			$viewport.css({
				width: cropSize.width,
				height: cropSize.height
			});

			this.scaled = false;
		}
	},
	/**
	 * Bind handlers on cropper's el, delegating events except Presentation Image's "load" event.
	 *
	 */
	_bind: function() {
		var cropper = this;

		var $el = this.$el;

		$el.on('dragstart', '#present', function(event) {
			event.preventDefault();
		});

		$el.on('change', '#file', function(event) {
			if (event.target.files.item(0)) {
				cropper.load(event.target.files.item(0));
			}
		});

		$el.on('wheel', '#viewport', function(event) {
			cropper._wheel(event);
			event.preventDefault();
		});

		$el.on('mousedown', '#present', function(event) {
			cropper._startMove(event);
		});

		$el.on('mouseup', '#present', function(event) {
			cropper._endMove();
		});

		$el.on('click', '#preview', function() {
			cropper._preview();
		});

		$el.on('click', '#yes', function() {
			cropper._yes();
		});
	},
	/**
	 * load image by src or file
	 *
	 * @param  {File|String} arg [description]
	 */
	load: function(arg) {
		var url,
			$viewport = this.$viewport,
			cropper = this;

		if (typeof arg == 'string') {
			url = arg;
		} else if (arg instanceof File) {
			url = URL.createObjectURL(arg);
		}

		this.$present && this.$present.off('load');
		$viewport.html('<img id="present" style="position: relative; cursor: move;	z-index: 1;">');

		this.$present = this.$el.find('#present');
		this.present = this.$present.get(0);

		this.$present.on('load', function(event) {

			this.setAttribute('data-original-width', this.width);
			this.setAttribute('data-original-height', this.height);
			this.setAttribute('data-wh-ratio', (this.width / this.height).toFixed(3));

			cropper._adapt();
		});

		this.$present.attr('src', url);
		this.$shadow.attr('src', url);
	},
	_processBoundry: function(newOffset) {
		var $img = this.$present,
			$vp = this.$viewport;

		var imgNewNW = newOffset,
			imgNewSW = {
				left: imgNewNW.left,
				top: imgNewNW.top + $img.height()
			},
			imgNewNE = {
				left: imgNewNW.left + $img.width(),
				top: imgNewNW.top
			},
			imgNewSE = {
				left: imgNewNE.left,
				top: imgNewSW.top
			},
			imgNewCenter = {
				left: imgNewNW.left + $img.width() / 2,
				top: imgNewNW.top + $img.height() / 2
			};
		var vpNW = $vp.offset(),
			vpSW = {
				left: vpNW.left,
				top: vpNW.top + $vp.height()
			},
			vpNE = {
				left: vpNW.left + $vp.width(),
				top: vpNW.top
			},
			vpSE = {
				left: vpNE.left,
				top: vpSW.top
			},
			vpCenter = {
				left: vpNW.left + $vp.width() / 2,
				top: vpNW.top + $vp.height() / 2
			};
		// console.log('img NW: %o, SW: %o, NE: %o, SE: %o', imgNW, imgSW, imgNE, imgSE);
		// console.log('vp  NW: %o, SW: %o, NE: %o, SE: %o', viewportNW, viewportSW, viewportNE, viewportSE);
		console.log('img center: %d, %d; vp center: %d, %d', imgNewCenter.left, imgNewCenter.top, vpCenter.left, vpCenter.top);
		if(imgNewCenter.left <= vpCenter.left && imgNewCenter.top <= vpCenter.top) {
			console.log('Sector NW');
			if(Math.abs(imgNewSE.left - vpSE.left) < 10 || imgNewSE.left < vpSE.left) {
				newOffset.left = vpSE.left - $img.width();
			}
			if(Math.abs(imgNewSE.top - vpSE.top) < 10 || imgNewSE.top < vpSE.top) {
				newOffset.top = vpSE.top - $img.height();
			}
			return newOffset;
		}

		if(imgNewCenter.left <= vpCenter.left && imgNewCenter.top > vpCenter.top) {
			console.log('Sector SW');
			console.log('imgNewNE: %o, vpNE: %o', imgNewNE, vpNE);
			if(Math.abs(imgNewNE.left - vpNE.left) < 5 || imgNewNE.left < vpNE.left) {
				newOffset.left = vpNE.left - $img.width();
			}
			if(Math.abs(imgNewNE.top - vpNE.top) < 5 || imgNewNE.top > vpNE.top) {
				newOffset.top = vpNE.top;
			}
			return newOffset;
		}

		if(imgNewCenter.left > vpCenter.left && imgNewCenter.top <= vpCenter.top) {
			console.log('Sector NE');
			if(Math.abs(imgNewSW.left - vpSW.left) < 5 || imgNewSW.left > vpSW.left) {
				newOffset.left = vpSW.left;
			}
			if(Math.abs(imgNewSW.top - vpSW.top) < 5 || imgNewSW.top < vpSW.top) {
				newOffset.top = vpSW.top - $img.height();
			}
			return newOffset;
		}

		if(imgNewCenter.left > vpCenter.left && imgNewCenter.top > vpCenter.top) {
			console.log('Sector SE');
			if(Math.abs(imgNewNW.left - vpNW.left) < 5 || imgNewNW.left > vpNW.left) {
				newOffset.left = vpNW.left;
			}
			if(Math.abs(imgNewNW.top - vpNW.top) < 5 || imgNewNW.top > vpNW.top) {
				newOffset.top = vpNW.top;
			}
			return newOffset;
		}

		return newOffset;
	},
	_startMove: function(event) {
		var cropper = this;

		cropper.mouse = {
			start: {
				x: event.pageX,
				y: event.pageY,
				offset: this.$present.offset()
			}
		};

		this.$present.on('mousemove', function(event) {
			cropper._move(event);
		});
	},
	_endMove: function() {
		this.$present.off('mousemove');
	},
	_move: function(event) {

		var movedX = event.pageX - this.mouse.start.x,
			movedY = event.pageY - this.mouse.start.y;
		var newCoordi = {
			left: this.mouse.start.offset.left + movedX,
			top: this.mouse.start.offset.top + movedY
		};

		var processed = this._processBoundry(newCoordi);

		// console.log('moved X: %d, Y: %d', movedX, movedY, '\nbefore mode: %s, after: %s', JSON.stringify(this.mouse.start), JSON.stringify(moved));
		this.$present.offset(processed);
		this._syncShadow();
	},
	_wheel: function(event) {
		var wheelEvent = event.originalEvent,
			resizeValue = this.CONSTANTS.WHEEL_DELTA_VALUE,
			mouseDeltaY = wheelEvent.deltaY;
		if (mouseDeltaY > 0) { // wheel down
			if (Math.abs(this.$present.width() - this.$viewport.width()) <= 1 
					|| Math.abs(this.$present.height() - this.$viewport.height()) <= 1) {
				return;
			}

			this._resize(-resizeValue);
		} else {
			this._resize(resizeValue);
		}

		this._syncShadow();
	},
	/**
	 * Resize presentation image's size. The arguments may be a delta value for width, or the w.h. pair.
	 *
	 * @param  {Number} deltaW [description]
	 *
	 * @param  {Number} width  new width
	 * @param  {Number} height new height
	 *
	 */
	_resize: function(args /**do not ref it directly**/ ) {
		var img = this.present,
			$img = this.$present,
			width = img.width,
			height = img.height,
			imgRatio = Number(img.getAttribute('data-wh-ratio')),
			$viewport = this.$viewport,
			viewportRatio = $viewport.width() / $viewport.height();

		var currentOffset = $img.offset(),
			newOffset;

		if (arguments.length < 2) {
			var delta = arguments[0],
				newW, newH;

			if (imgRatio > viewportRatio) { // zoom transfrom base on height

				newW = (height + delta) * imgRatio;
				__resize(newW, height + delta);
				newOffset = {
					left: currentOffset.left - (newW - width) / 2,
					top: currentOffset.top - delta / 2
				};

			} else { // zoom transfrom base on width
				newH = (width + delta) / imgRatio;
				__resize(width + delta, newH);
				newOffset = {
					left: currentOffset.left - delta / 2,
					top: currentOffset.top - (newH - height) / 2
				};
			}

			$img.offset(newOffset);
		} else {
			__resize(arguments[0], arguments[1]);
		}

		function __resize(w, h) {
			$img.css({
				'width': w,
				'height': h
			});
			img.setAttribute('width', w);
			img.setAttribute('height', h);
		}
	},
	/**
	 * Make loaded image adapt to viewport's size.
	 * 1. predicate base size on width or height by ratio
	 * 2. set image's edge's length = viewport's edge's length * 1.2
	 * 3. calc the other edge's length, set on image
	 * 4. centralize image in viewport
	 *
	 * @return {[type]} [description]
	 */
	_adapt: function() {
		var $viewport = this.$viewport,
			$img = this.$present,
			img = this.present;

		var wheelDeltaValue = this.CONSTANTS.WHEEL_DELTA_VALUE;

		var imgRatio = Number(img.getAttribute('data-wh-ratio')),
			viewportRatio = $viewport.width() / $viewport.height();

		var width, height;
		if (imgRatio > viewportRatio) { // base edge is height
			height = $viewport.height() + wheelDeltaValue;
			width = height * imgRatio;

		} else { // base edge is width
			width = $viewport.width() + wheelDeltaValue,
			height = width * (1 / imgRatio);

		}

		this._resize(width, height);
		this._centralize();

		this._syncShadow();
	},
	_centralize: function() {
		var $viewport = this.$viewport,
			$img = this.$present;

		var deltaX = ($img.width() - $viewport.width()) / 2,
			deltaY = ($img.height() - $viewport.height()) / 2;

		$img.css({
			left: -deltaX,
			top: -deltaY
		});
	},
	_syncShadow: function() {
		var $img = this.$present,
			$shadow = this.$shadow;

		$shadow.offset($img.offset()).css({
			width: $img.width(),
			height: $img.height()
		});
	},
	/**
	 * Draw the current viewport's content to working canvas.
	 * 
	 */
	_draw: function() {
		var $img = this.$present,
			img = this.present,
			$viewport = this.$viewport,
			viewport = this.viewport
			cropSize = this.options.cropSize;

		var imgOriginalW = Number(img.getAttribute('data-original-width')),
			imgOriginalH = Number(img.getAttribute('data-original-height')),
			viewWidth = viewport.width || $viewport.width(),
			viewHeight = viewport.height || $viewport.height(),
			imgTrueWidthInView = viewWidth / (img.width / imgOriginalW),
			imgTrueHeightInView = viewHeight / (img.height / imgOriginalH);

		var imgCoordi = $img.offset(),
			viewportCoordi = $viewport.offset();

		var deltaCoordi = {
			x: (viewportCoordi.left - imgCoordi.left) / (img.width / imgOriginalW),
			y: (viewportCoordi.top - imgCoordi.top) / (img.height / imgOriginalH)
		};

		var canvas = this.canvas,
			context = canvas.getContext('2d');
		/**
		 * IMPORTANT!
		 */
		canvas.setAttribute('width', cropSize.width);
		canvas.setAttribute('height', cropSize.height);

		// console.log('drawing image demension start:(%d, %d) sizes:(%d, %d) into canvas', deltaCoordi.x, deltaCoordi.y, viewWidth, viewHeight);
		/**
		 * Attention, this API uses image's FILE data rather than HTMLImageDOM's attribute!
		 * This means if you use a resized image as "drawImage" method's source param, you must convert coordinate and source as use the original image.
		 */
		context.drawImage(img, deltaCoordi.x, deltaCoordi.y, imgTrueWidthInView, imgTrueHeightInView, 0, 0, cropSize.width, cropSize.height);
	},
	_preview: function() {
		this._draw();
		window.open(this.canvas.toDataURL());
	},
	/**
	 * Display the content in viewport data on canvas.
	 * If "url" is specified in options on construction, cropper will send image in a "multipart/form-data" request to server.
	 *
	 */
	_yes: function() {
		
		this._draw();
		this._display();

		if (this.options.url) {

			var cropper = this;

			cropper.send().done(function(response) {
				var callback = cropper.options.uploaded;

				if (callback && callback instanceof Function && arguments[2].status === 200) { // trigger uploaded as response is 200(HTTP Request SUCCESS)
					callback.apply(cropper, arguments);
				}

			});
		}
	},
	_display: function() {
		if (this.options.debug) {
			var $clone = this.$canvas.clone(),
				clone = $clone.get(0);

			$clone.attr('id', new Date).css('display', 'block');

			clone.getContext('2d').putImageData(this.canvas.getContext('2d').getImageData(0, 0, clone.width, clone.height), 0, 0);

			$('body').append($clone);
		}
	},
	/**
	 * Send cropped imaged data to server.
	 *
	 * @return  {$XHR}  jQuery ajax request
	 */
	send: function() {
		var canvas = this.canvas,
			input = this.$input.get(0);

		var blobBin = atob(canvas.toDataURL().split(',')[1]);
		var array = [];
		for (var i = 0; i < blobBin.length; i++) {
			array.push(blobBin.charCodeAt(i));
		}
		var file = new Blob([new Uint8Array(array)], {
			type: 'image/png'
		});

		var form = new FormData();
		form.append("file", file, input.files.item(0).name);

		return $.ajax({
			url: this.options.url,
			type: "POST",
			data: form,
			contentType: false,
			processData: false
		}); // ajax request accept */* and not doing anyt process about response data;
	},
	destroy: function() {
		this.$present.off();
		this.$el.off();

		this.$el.remove();
	}
};