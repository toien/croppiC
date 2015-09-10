function Cropper() {
	this.el = '#component';

	this._cache();
	this._bind();
}
Cropper.prototype = {
	constructor: Cropper,
	_cache: function() {
		var $el = this.$el = $(this.el);

		this.$present = $el.find('#present');
		this.$viewport = $el.find('#viewport');
		this.$input = this.$el.find('#file');
		this.$yes = this.$el.find('#yes');
		this.$shadow = $el.find('#shadow');

		this.present = this.$present.get(0);
		this.viewport = this.$viewport.get(0);
	},
	_bind: function() {
		var cropper = this;

		var img = this.present,
			$img = this.$present;

		img.onload = function(event) {

			this.setAttribute('data-original-width', this.width);
			this.setAttribute('data-original-height', this.height);
			this.setAttribute('data-wh-ratio', (this.width / this.height).toFixed(3));

			cropper._adapt();
		};
		
		img.ondragstart = function(event) {
			event.preventDefault();
		};

		this.$input.on('change', function(event) {
			if (event.target.files.item(0)) {
				cropper.loadImage(event.target.files.item(0));
			}
		});

		$img.on('wheel', function(event) {
			cropper.wheel(event);
			event.preventDefault();
		});
		$img.on('mousedown', function(event) {
			cropper.startMove(event);
		});
		$img.on('mouseup', function(event) {
			cropper.endMove();
		});

		this.$yes.on('click', function() {
			cropper.save();
		});
	},
	loadImage: function(file) {
		var url = URL.createObjectURL(file);

		

		this.$present.attr('src', url);
		this.$shadow.attr('src', url);
	},
	startMove: function(event) {
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
	endMove: function() {
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
	wheel: function(event) {
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

		var currentOffset = $img.offset(), newOffset;

		if (arguments.length < 2) {
			var delta = arguments[0], newW, newH;

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
	save: function() {
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

		var canvas = document.getElementById('display'),
			context = canvas.getContext('2d');
		/**
		 * IMPORTANT !
		 */
		canvas.setAttribute('width', viewWidth);
		canvas.setAttribute('height', viewHeight);

		console.log('drawing image demension start:(%d, %d) sizes:(%d, %d) into canvas', deltaCoordi.x, deltaCoordi.y, viewWidth, viewHeight);
		/**
		 * 如果是拉伸过的 Image ，需要将参数都转换为初始 Image 的属性再转换
		 */
		context.drawImage(img, deltaCoordi.x, deltaCoordi.y, imgTrueWidthInView, imgTrueHeightInView, 0, 0, viewWidth, viewHeight);
	}
};
var cropper = new Cropper();