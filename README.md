# croppiC

A js component cropping image at client side before uploading and a convenient upload process within. 

Inspired by famous 'croppic' and thanks to Mike Riethmuller's [article](http://tympanus.net/codrops/2014/10/30/resizing-cropping-images-canvas/).

## Dependency ##

CroppiC depends on jQuery.js, it's developed on jQuery 1.11.2.

## Usage ##

### Init ###

The only thing to init Cropper is to call Cropper's constructor and pass a "options" param to it. 

	var cropper = new Cropper({
		el: '#component', 
		cropSize: {
			width: 560,
			height: 480
		},
		url: '/discover-spring/upload', 
		uploaded: function(resp) { 
			alert(resp); // "this" refs the cropper
		},
		src: 'http://www.abcdefg.com/some.png',
		debug: true
	});

- **el**: Where this component depeon on, usually is a id expression.
- **cropSize**: Specify the final size after cropped.
- **url**: The url submit this image file to. At server-end there should be a service e.g a servlet handling HTTP POST multipart/form-data.
- **uploaded**: Callback function will be called when uploaded finished(HTTP status code = 200).
- **src**: You can specify a image to load when the component first init completed or call cropper's load method.
- **debug**: Append the working canvas to html body, default is false.

### Destroy ###

When you don't need this component in page any more, do

	cropper.destroy();

it will cancel all listeners and remove the dom represents cropper.

## Check out ##

Once cropper has been instatialized, you can change which part of image should been cropped by drag on viewport, zoom by wheeling on it.

![effect picture](https://raw.githubusercontent.com/toien/croppiC/master/img/croppiC.png)

## PS ##

This component is developed in hurry pace, there is no doubt issues exist in code, but it has croping and uploading these 2 core functions with a friendly look too.

If you have read code through and want to make it better, I would be glad to hear your voice. lshuhuan@gmail.com 