function Croper() {
	this.el = '#component';

	this._cache();
	this.bind();
}
Croper.prototype = {
	constructor: Croper,
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
	bind: function() {
		var croper = this;

		var img = this.present,
			$img = this.$present;

		img.onload = function(event) {
			this.setAttribute('data-original-width', this.width);
			this.setAttribute('data-original-height', this.height);

			$img.css({
				width: this.width,
				height: this.height
			})
		};
		img.ondragstart = function(event) {
			event.preventDefault();
		};

		this.$input.on('change', function(event) {
			croper.loadImage(event.target.files.item(0));
		});

		$img.on('wheel', function(event) {
			croper.zoom(event);
			event.preventDefault();
		});
		$img.on('mousedown', function(event) {
			croper.startMove(event);
		});
		$img.on('mouseup', function(event) {
			croper.endMove();
		});

		this.$yes.on('click', function() {
			croper.save();
		});
	},
	loadImage: function(file) {
		var url = URL.createObjectURL(file);

		this.$present.attr('src', url);
	},
	startMove: function(event) {
		var croper = this;
		croper.mouse = {
			start: {
				x: event.pageX,
				y: event.pageY,
				offset: this.$present.offset()
			}
		};
		this.$present.on('mousemove', function(event) {
			croper.move(event);
		});
	},
	endMove: function() {
		this.$present.off('mousemove');
	},
	move: function(event) {
		var movedX = event.pageX - this.mouse.start.x,
			movedY = event.pageY - this.mouse.start.y;
		var moved = {
			left: this.mouse.start.offset.left + movedX,
			top: this.mouse.start.offset.top + movedY
		};
		// console.log('moved X: %d, Y: %d', movedX, movedY, '\nbefore mode: %s, after: %s', JSON.stringify(this.mouse.start), JSON.stringify(moved));
		this.$present.offset(moved);
	},
	zoom: function(event) {
		var wheelEvent = event.originalEvent,
			deltaY = wheelEvent.deltaY;
		if (deltaY > 0) {
			this._resize(-20);
		} else {
			this._resize(20);
		}
	},
	_resize: function(deltaW) {
		var img = this.present,
			$img = this.$present,
			width = img.width,
			height = img.height,
			ratio = height / width;

		img.setAttribute('width', (width + deltaW));
		img.setAttribute('height', height + (deltaW * ratio));

		$img.css({
			width: (width + deltaW),
			height: height + (deltaW * ratio)
		});

		var currentOffset = $img.offset(),
			newOffset = {
				left: currentOffset.left - deltaW / 2,
				top: currentOffset.top - (deltaW * ratio) / 2
			};
		$img.offset(newOffset);
	},
	_adapt: function() {

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

		var imgCoodi = $img.offset(),
			viewportCoodi = $viewport.offset();

		var deltaCoodi = {
			x: (viewportCoodi.left - imgCoodi.left) /*/ (img.weight / imgOriginalW)*/,
			y: (viewportCoodi.top - imgCoodi.top) /*/ (img.height / imgOriginalH)*/
		};

		var canvas = document.getElementById('display'),
			context = canvas.getContext('2d'),
			$canvas = $('#display');
		/**
		 * IMPORTANT !
		 */
		canvas.setAttribute('width', viewWidth);
		canvas.setAttribute('height', viewHeight);

		console.log('drawing image demension start:(%d, %d) sizes:(%d, %d) into canvas', deltaCoodi.x, deltaCoodi.y, viewWidth, viewHeight);
		context.drawImage(img, deltaCoodi.x + (imgCoodi.left - viewportCoodi.left), deltaCoodi.y + (imgCoodi.top - viewportCoodi.top), imgTrueWidthInView, imgTrueHeightInView, 0, 0, viewWidth, viewHeight);

		// context.drawImage(img, 0, 0, imgOriginalW, imgOriginalH, imgCoodi.left, imgCoodi.top, viewWidth - imgCoodi.left, viewHeight - imgCoodi.top);

		// context.drawImage(img, 0, 0, imgTrueWidthInView, imgTrueHeightInView, imgCoodi.left - viewportCoodi.left, imgCoodi.top - viewportCoodi.top, viewWidth, viewHeight);
		// context.drawImage(img, 0, 0/*, 620, 216*/);
	}
};
var croper = new Croper();