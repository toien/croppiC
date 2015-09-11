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
 *   dispaly: true // append the working canvas to html body, default is false
 * });
 *
 */
function Cropper(options) {
	this.options = options;

	this.el = options.el;

	this._cache();
	this._style();
	this._bind();
}
Cropper.prototype = {
	constructor: Cropper,

	template: 
			'<div id="viewport">' + 
				'<img id="present" style="position: relative; cursor: move;	z-index: 1;">' + 
			'</div>' + 
			'<img id="shadow">' + 
			'<div id="controls">' +
				'<input id="file" type="file" accept="image/*">' + 
				'<input id="yes" type="button" value="Yes">' + 
			'</div>' + 
			'<canvas id="display"></canvas>',
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
		var cropSize = this.options.cropSize;

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
			width: cropSize.width,
			height: cropSize.height,
			"background-color": '#ccc'
		});

		this.$shadow.css({
			position: 'absolute',
			opacity: '.2'
		});

		this.$controls.css({
			position: 'absolute',
			top: 10,
			right: 10,
			"z-index": 2
		});

		this.$canvas.css('display', 'none');
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
				cropper.loadImage(event.target.files.item(0));
			}
		});

		$el.on('wheel', '#present', function(event) {
			cropper._wheel(event);
			event.preventDefault();
		});
		$el.on('mousedown', '#present', function(event) {
			cropper._startMove(event);
		});
		$el.on('mouseup', '#present', function(event) {
			cropper._endMove();
		});

		$el.on('click', '#yes', function() {
			cropper._yes();
		});
	},
	loadImage: function(file) {
		var url = URL.createObjectURL(file),
			$viewport = this.$viewport;

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
			cropper.move(event);
		});
	},
	_endMove: function() {
		this.$present.off('mousemove');

	},
	move: function(event) {
		var movedX = event.pageX - this.mouse.start.x,
			movedY = event.pageY - this.mouse.start.y;
		var newCoordi = {
			left: this.mouse.start.offset.left + movedX,
			top: this.mouse.start.offset.top + movedY
		};
		// console.log('moved X: %d, Y: %d', movedX, movedY, '\nbefore mode: %s, after: %s', JSON.stringify(this.mouse.start), JSON.stringify(moved));
		this.$present.offset(newCoordi);


		this._syncShadow();
	},
	_wheel: function(event) {
		var wheelEvent = event.originalEvent,
			deltaY = wheelEvent.deltaY;
		if (deltaY > 0) {
			this._resize(-20);
		} else {
			this._resize(20);
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

		var imgRatio = Number(img.getAttribute('data-wh-ratio')),
			viewportRatio = $viewport.width() / $viewport.height();

		var width, height;
		if (imgRatio > viewportRatio) { // base edge is height
			height = $viewport.height() + 20;
			width = height * imgRatio;

		} else { // base edge is width
			width = $viewport.width() + 20,
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
	 * Display the content in viewport data on canvas.
	 * If "url" is specified in options on construction, cropper will send image in a "multipart/form-data" request to server.
	 *
	 */
	_yes: function() {
		var $img = this.$present,
			img = this.present,
			$viewport = this.$viewport,
			viewport = this.viewport;

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
		canvas.setAttribute('width', viewWidth);
		canvas.setAttribute('height', viewHeight);

		// console.log('drawing image demension start:(%d, %d) sizes:(%d, %d) into canvas', deltaCoordi.x, deltaCoordi.y, viewWidth, viewHeight);
		/**
		 * Attention, this API uses image's FILE data rather than HTMLImageDOM's attribute!
		 * This means if you use a resized image as "drawImage" method's source param, you must convert coordinate and source as use the original image.
		 */
		context.drawImage(img, deltaCoordi.x, deltaCoordi.y, imgTrueWidthInView, imgTrueHeightInView, 0, 0, viewWidth, viewHeight);

		this._display();


		if(this.options.url) {

			var cropper = this;

			cropper.send().done(function(response) {
				var callback = cropper.options.uploaded;

				if(callback && callback instanceof Function && arguments[2].status === 200) { // trigger uploaded as response is 200
					callback.apply(cropper, arguments);
				}

			});
		}
	},
	_display: function() {
		if(this.options.display) {
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
		var file = new Blob([ new Uint8Array(array) ], {
			type : 'image/png'
		});

		var form = new FormData();
		form.append("file", file, input.files.item(0).name);

		return $.ajax({
			url : this.options.url,
			type : "POST",
			data : form,
			contentType : false,
			processData: false
		}); // ajax request accept */* and not doing anyt process about response data;
	},
	destroy: function() {
		this.$present.off();
		this.$el.off();

		this.$el.remove();
	}
};